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

warnings.filterwarnings("ignore") 
load_dotenv()

consumer = KafkaConsumer(bootstrap_servers = os.getenv("KAFKA_BROKER"))
client = MongoClient(os.getenv("DB_URI"))
model = SentenceTransformer("all-MiniLM-L6-v2")

collection = client["vichaar_manthan_sih_db"]["users"]


def processMessage(message):
    """Retrieves email, role, and interview ID from a Kafka message."""

    try:
        data = json.loads(message.value.decode("utf-8"))
        return data["email"], data["role"], data["id"]
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Error processing Kafka message: {e}")

def get_resume_data_by_email_role_id(email, role, interview_id):
    """Retrieves resume data based on email, role, and interview ID."""

    user = collection.find_one({"email": email}, {"interviews": 1}) 

    if user and "interviews" in user:
        matching_interview = next(
            (
                interview
                for interview in user["interviews"]
                if interview["role"] == role and interview["id"] == interview_id
            ),
            None,
        )

        if matching_interview:
            return matching_interview.get("resumeData")

    return None

def get_answers_by_email_role_id(email, role, interview_id):
    """Retrieves user answers based on email, role, and interview ID."""

    user = collection.find_one({"email": email}, {"interviews": 1})

    if user and "interviews" in user:
        matching_interview = next(
            (
                interview
                for interview in user["interviews"]
                if interview["role"] == role and interview["id"] == interview_id
            ),
            None,
        )

        if matching_interview:
            return matching_interview.get("questions")

    return None


def binary2text(resume_data):
    """Converts binary PDF data to text."""
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf_file:
        temp_pdf_file.write(resume_data)
        temp_pdf_path = temp_pdf_file.name

    docLoader = PyPDFLoader(temp_pdf_path)
    document = docLoader.load()
    text_content = document[0].page_content

    os.remove(temp_pdf_path)

    return text_content

def generate_questions_and_answers(resume_text, role):
    """Generates technical interview questions and their expected answers based on a resume text."""

    prompt = f"""
    Based on the following resume text:

    {resume_text}

    Generate 5 technical interview questions for the role of {role} and their expected answers in a fixed format like this:

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

    Note: Do not use any markdown or special characters.
    """

    try:
        response = palm.GenerativeModel('gemini-1.0-pro-latest').generate_content(prompt)
        return response.candidates[0].content.parts[0].text
    except Exception as e:
        return f"Error generating questions and answers: {e}" 


def extract_questions_and_answers(text):
    """Extracts questions and answers from text formatted with numbered questions and answers."""

    try:
        questions_part, answers_part = text.split("Answers:", 1)
    except ValueError:
        raise ValueError("Input text must contain both 'Questions:' and 'Answers:' sections.")

    pattern = r"(?<=\d\.\s)(.*?)(?=\d\.\s|$)"

    questions = re.findall(pattern, questions_part, re.DOTALL)
    answers = re.findall(pattern, answers_part, re.DOTALL)

    questions = [q.strip() for q in questions]
    answers = [a.strip() for a in answers]

    return questions, answers



def calculate_similarity_score(given_answers, expected_answers):
    """Calculates the similarity score between given and expected answers using SentenceTransformer."""

    if len(given_answers) != len(expected_answers):
        raise ValueError("The number of given and expected answers must be the same.")

    given_embeddings = model.encode(given_answers, convert_to_tensor=True)
    expected_embeddings = model.encode(expected_answers, convert_to_tensor=True)

    similarities = util.cos_sim(given_embeddings, expected_embeddings)
    total_similarity = similarities.diagonal().sum().item()

    return (total_similarity / len(given_answers)) * 5


def send_to_mongo(email, role, interview_id, ques, exans):
    """Inserts questions and expected answers into MongoDB."""

    for question, expected_answer in zip(ques, exans):
        update = insert_question_by_email_role_id(
            email,
            role,
            interview_id,
            {"question": question, "userAnswer": "", "expectedAnswer": expected_answer},
        ) 
        if update == False:
            print("Error inserting question into MongoDB")
            return False


def insert_question_by_email_role_id(email, role, interview_id, new_question):
    user = collection.find_one({"email": email})

    if user and "interviews" in user:
        for i, interview in enumerate(user["interviews"]):
            if interview["role"] == role and interview["id"] == interview_id:
                collection.update_one(
                    {"email": email, f"interviews.{i}.id": interview_id},
                    {
                        "$push": {f"interviews.{i}.questions": new_question},
                        "$set": {f"interviews.{i}.isResumeProcessed": True},
                    },
                )
                return True
    return False


def main():
    print("Main Process Started")

    palm.configure(api_key = os.getenv("GOOGLE_API_KEY"))
    print("Google API key configured")

    consumer.subscribe(topics = ['resume-upload', 'feedback-request'])
    print("Subscribed to topics: " + str(consumer.subscription()))
    

    while True:
        message = consumer.poll(timeout_ms=100)
        if message is not None:
            for topic_partition, messages in message.items():
                if topic_partition.topic == 'resume-upload':
                    for message in messages:
                        email, role, interview_id = processMessage(message)
                        if email and role and interview_id:
                            print("Processing resume for: " + email + ", " + role + ", " + str(interview_id))

                            resume_data = get_resume_data_by_email_role_id(email, role, interview_id)
                            if not resume_data:
                                print("Resume data not found")
                                continue

                            resume_text = binary2text(resume_data)

                            questions_and_exanswers = generate_questions_and_answers(resume_text, role)

                            if questions_and_exanswers is None:
                                print("Error generating questions and answers")
                                continue

                            ques, exans = extract_questions_and_answers(questions_and_exanswers)

                            if send_to_mongo(email, role, interview_id, ques, exans) == False:
                                print("Error sending data to MongoDB")
                                continue

                            print("Finished processing resume")

                elif topic_partition.topic == 'feedback-request':
                    for message in messages:
                        email, role, interview_id = processMessage(message)
                        if email and role and interview_id:
                            print("Processing feedback request for: " + email + ", " + role + ", " + str(interview_id))

                            user_answers = get_answers_by_email_role_id(email, role, interview_id)
                            print(user_answers)

                            expected_answers = [
                                question["expectedAnswer"] for question in user_answers["questions"]
                            ]

                            given_answers = [question["userAnswer"] for question in user_answers["questions"]]

                            print(expected_answers, given_answers)

                            similarity_score = calculate_similarity_score(given_answers, expected_answers)

                            print(similarity_score)
                            print("Finished processing feedback request")

if __name__ == "__main__":
    main()
