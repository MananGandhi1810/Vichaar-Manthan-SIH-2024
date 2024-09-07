import json
import os
import re
import tempfile
import warnings

import google.generativeai as palm
from dotenv import load_dotenv
from kafka import KafkaConsumer
from langchain_community.document_loaders import PyPDFLoader
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer, util


load_dotenv()
warnings.filterwarnings("ignore")

consumer = KafkaConsumer(bootstrap_servers=os.getenv("KAFKA_BROKER"))
client = MongoClient(os.getenv("DB_URI"))
model = SentenceTransformer("all-MiniLM-L6-v2")


def processMessage(message):
    """Retrieves email, role, and interview ID from a Kafka message."""

    try:
        data = json.loads(message.value.decode("utf-8"))
        return str(data["email"]), str(data["role"]), int(data["id"])
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Error processing Kafka message: {e}")


def getResume(email, interview_id):
    """Retrieves resume data based on email and interview ID."""

    user = collection.find_one(
        {"email": email}, {"interviews": {"$elemMatch": {"id": interview_id}}}
    )

    if user and "interviews" in user and user["interviews"]:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf_file:
            temp_pdf_file.write(user["interviews"][0].get("resumeData"))
            temp_pdf_path = temp_pdf_file.name

        docLoader = PyPDFLoader(temp_pdf_path)
        document = docLoader.load()
        text_content = document[0].page_content

        os.remove(temp_pdf_path)

        return text_content

    return None


def generateQuestions(resume_text, role):
    """Generates technical interview questions and their expected answers based on a resume text."""

    prompt = f"""
    Based on the following resume text:

    {resume_text}

    Generate 5 relevant technical interview questions for the role of {role} and their expected answers in a fixed format like this:

    Questions:
    1.
    2.
    3.
    4.
    5.
    
    Answers:
    1.
    2.
    3.
    4.
    5.

    Note: Do not use any markdown or special characters. Make sure the questions can be answered verbally.
    """

    try:
        response = palm.GenerativeModel("gemini-1.0-pro-latest").generate_content(
            prompt
        )

        questions_part, answers_part = (
            response.candidates[0].content.parts[0].text.split("Answers:", 1)
        )

        pattern = r"(?<=\d\.\s)(.*?)(?=\d\.\s|$)"

        questions = re.findall(pattern, questions_part, re.DOTALL)
        answers = re.findall(pattern, answers_part, re.DOTALL)

        questions = [q.strip() for q in questions]
        answers = [a.strip() for a in answers]

        return questions, answers
    except Exception as e:
        return f"Error generating questions and answers: {e}", None


def sendQuestions(email, interview_id, ques, exans):
    """Inserts questions and expected answers into MongoDB."""

    user = collection.find_one({"email": email})

    if user and "interviews" in user:
        for i, interview in enumerate(user["interviews"]):
            if interview["id"] == interview_id:
                for question, expected_answer in zip(ques, exans):
                    new_question = {
                        "question": question,
                        "userAnswer": "",
                        "expectedAnswer": expected_answer,
                    }
                    collection.update_one(
                        {"email": email, f"interviews.{i}.id": interview_id},
                        {
                            "$push": {f"interviews.{i}.questions": new_question},
                            "$set": {f"interviews.{i}.isResumeProcessed": True},
                        },
                    )
                return True
    return False


def getAnswers(email, interview_id):
    """Retrieves user answers based on email and interview ID."""

    user = collection.find_one(
        {"email": email}, {"interviews": {"$elemMatch": {"id": interview_id}}}
    )

    if user and "interviews" in user and user["interviews"]:
        return user["interviews"][0].get("questions")

    return None


def calculateSimilarityScore(given_answers, expected_answers):
    """Calculates the similarity score between given and expected answers using SentenceTransformer."""

    if len(given_answers) != len(expected_answers):
        raise ValueError("The number of given and expected answers must be the same.")

    given_embeddings = model.encode(given_answers, convert_to_tensor=True)
    expected_embeddings = model.encode(expected_answers, convert_to_tensor=True)

    similarities = util.cos_sim(given_embeddings, expected_embeddings)
    total_similarity = similarities.diagonal().sum().item()

    return round((total_similarity / len(given_answers)) * 5, 2)


def generateFeedback(question, given_answers, expected_answers, role, similarity_score):
    """Generates technical interview questions and their expected answers based on a resume text."""

    question = "\n".join(question)
    given_answers = "\n".join(given_answers)
    expected_answers = "\n".join(expected_answers)

    prompt = f"""
    Based on the following technical interview questions and answers for the role of {role}:

    Questions:
    {question}

    Given Answers:
    {given_answers}

    Expected Answers:
    {expected_answers}

    Calculated Cosine Similarity (Out of 5): 
    {similarity_score}

    Provide relevant first person feedback as an interviewer in a few points. Be blunt, but constructive and helpful.

    Note: Do not use any markdown or special characters. Make sure the feedback is in first person.
    """

    try:
        response = palm.GenerativeModel("gemini-1.0-pro-latest").generate_content(
            prompt
        )

        return response.candidates[0].content.parts[0].text
    except Exception as e:
        return f"Error generating feedback: {e}"


def sendFeedback(email, interview_id, feedback, similarity_score):
    """Inserts feedback into MongoDB."""

    user = collection.find_one({"email": email})

    if user and "interviews" in user:
        for i, interview in enumerate(user["interviews"]):
            if interview["id"] == interview_id:
                collection.update_one(
                    {"email": email, f"interviews.{i}.id": interview_id},
                    {
                        "$set": {
                            f"interviews.{i}.feedback": feedback,
                            f"interviews.{i}.rating": similarity_score,
                        },
                    },
                )
                return True
    return False


if __name__ == "__main__":
    print("Main Process Started")

    collection = client["vichaar_manthan_sih_db"]["users"]
    print("Connected to MongoDB")

    palm.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    print("Google API key configured")

    consumer.subscribe(topics=["resume-upload", "feedback-request"])
    print("Subscribed to topics: " + str(consumer.subscription()))

    while True:
        message = consumer.poll(timeout_ms=100)
        if message is not None:
            for topic_partition, messages in message.items():
                if topic_partition.topic == "resume-upload":
                    for message in messages:
                        email, role, interview_id = processMessage(message)
                        if email and role and interview_id:
                            print(
                                "Log: Processing resume for: "
                                + email
                                + ", "
                                + role
                                + ", "
                                + str(interview_id)
                            )

                            resume = getResume(email, interview_id)
                            if not resume:
                                print("Error: Resume not found")
                                continue

                            ques, exans = generateQuestions(resume, role)

                            if not ques or not exans:
                                print("Error: Questions not generated")
                                continue

                            if sendQuestions(email, interview_id, ques, exans) == False:
                                print("Error: Questions not sent to MongoDB")
                                continue

                            print("Log: Completed processing resume for: " + email)

                elif topic_partition.topic == "feedback-request":
                    for message in messages:
                        email, role, interview_id = processMessage(message)
                        if email and role and interview_id:
                            print(
                                "Log: Feedback request for: "
                                + email
                                + ", "
                                + role
                                + ", "
                                + str(interview_id)
                            )

                            answers = getAnswers(email, interview_id)

                            if not answers:
                                print("Error: Answers not found")
                                continue

                            questions = [q["question"] for q in answers]
                            expected_answers = [q["expectedAnswer"] for q in answers]
                            given_answers = [q["userAnswer"] for q in answers]

                            similarity_score = calculateSimilarityScore(
                                given_answers, expected_answers
                            )
                            user_feedback = generateFeedback(
                                questions,
                                given_answers,
                                expected_answers,
                                role,
                                similarity_score,
                            )

                            if (
                                sendFeedback(
                                    email, interview_id, user_feedback, similarity_score
                                )
                                == False
                            ):
                                print("Error: Feedback not sent to MongoDB")
                                continue
                            print("Log: Completed feedback request for: " + email)
