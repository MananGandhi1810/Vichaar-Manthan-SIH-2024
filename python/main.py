from bson import ObjectId
import json
import logging
import os
import re
import tempfile
import warnings
import signal

import google.generativeai as palm
from dotenv import load_dotenv
from kafka import KafkaConsumer
from pdf2image import convert_from_path
from pymongo import MongoClient
from pytesseract import image_to_string
from sentence_transformers import SentenceTransformer, util


load_dotenv()
warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s - %(message)s",
)
logging.getLogger("kafka").setLevel(logging.WARNING)

if os.getenv("DEBUG") == "true":
    logging.getLogger().setLevel(logging.DEBUG)
    logging.debug("Debug mode enabled")


consumer = KafkaConsumer(
    bootstrap_servers=os.getenv("KAFKA_BROKER"),
    api_version=(2, 6, 0),
    group_id="aip",
    auto_offset_reset="earliest",
)
client = MongoClient(os.getenv("DB_URI"))
model = SentenceTransformer(os.getenv("SBERT_MODEL"))


def processMessage(message):
    """Retrieves email, role, and interview ID from a Kafka message."""

    try:
        data = json.loads(message.value.decode("utf-8"))
        logging.debug(f"Processing Kafka message with data: {data}")
        name, email, role, interview_id = (
            str(data["name"]),
            str(data["email"]),
            str(data["role"]),
            ObjectId((data["id"])),
        )
        logging.debug(f"Extracted: name={name}, email={email}, role={role}, interview_id={interview_id}")
        return name, email, role, interview_id
    except (json.JSONDecodeError, KeyError) as e:
        logging.error(f"Error processing Kafka message: {e}, message content: {message.value}")


def fetchResume(email, interview_id):
    """Retrieves resume data based on email and interview ID."""

    logging.info(f"Fetching resume for email={email}, interview_id={interview_id}")

    try:
        user = collection.find_one(
            {"email": email},
            {"interviews": {"$elemMatch": {"_id": interview_id}}},
        )

        if user and "interviews" in user and user["interviews"]:
            try:
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf_file:
                    temp_pdf_file.write(user["interviews"][0].get("resumeData"))
                    temp_pdf_path = temp_pdf_file.name

                images = convert_from_path(temp_pdf_path)

                text_content = ""
                for image in images:
                    image = image.point(lambda x: 0 if x < 100 else 255)
                    text = image_to_string(image)
                    text_content += text

            finally:
                if temp_pdf_path:
                    os.remove(temp_pdf_path)

            logging.info(f"Resume fetched successfully for email={email}")
            return text_content

        else:
            logging.warning(f"Resume not found for email={email}, interview_id={interview_id}")
            return None

    except Exception as e:
        logging.error(f"Error fetching resume: {e}, email={email}, interview_id={interview_id}")
        return None


def generateQuestions(resume_text, role):
    """Generates technical interview questions and their expected answers based on a resume text."""

    logging.info(f"Generating questions for role={role}")

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

    Instructions:
    * Prioritize questions that are directly relevant to the candidate's resume and the key skills required for the role.
    * Ensure all questions can be answered verbally in 2-3 minutes each.
    * If the resume is unclear, focus on assessing essential skills for the role.
    * Do not use any special characters.
    * Ensure each answer directly addresses the corresponding question.
    """

    try:
        response = palm.GenerativeModel(os.getenv("GEMINI_MODEL")).generate_content(prompt)
        content = response.candidates[0].content.parts[0].text

        logging.debug(f"Generated content: {content}")

        questions_part, answers_part = content.split("Answers:", 1)
        question_pattern = r"(?<=\d\.\s)(.*?)(?=\d\.\s|$)"
        answer_pattern = r"(?<=\d\.\s)(.*?)(?=\d\.\s|$)"

        questions = re.findall(question_pattern, questions_part, re.DOTALL)
        answers = re.findall(answer_pattern, answers_part, re.DOTALL)

        questions = [re.sub(r"[^a-zA-Z0-9\s]", "", q) for q in questions]
        answers = [re.sub(r"[^a-zA-Z0-9\s]", "", a) for a in answers]

        logging.info(f"Generated {len(questions)} questions successfully")
        return [q.strip() for q in questions], [a.strip() for a in answers]

    except Exception as e:
        logging.error(f"Error generating questions: {e}, role={role}")
        return None, None


def sendQuestions(email, interview_id, questions, expected_answers):
    """Inserts questions and expected answers into MongoDB."""

    logging.info(f"Sending {len(questions)} questions to MongoDB for email={email}, interview_id={interview_id}")

    new_questions = [
        {
            "question": question,
            "userAnswer": "",
            "expectedAnswer": expected_answer,
        }
        for question, expected_answer in zip(questions, expected_answers)
    ]

    try:
        result = collection.update_one(
            {"email": email, "interviews._id": interview_id},
            {
                "$push": {"interviews.$.questions": {"$each": new_questions}},
                "$set": {"interviews.$.isResumeProcessed": True},
            },
        )

        if result.modified_count > 0:
            logging.info(f"Questions sent to MongoDB successfully for email={email}")
            return True
        else:
            logging.warning(f"No documents updated in MongoDB for email={email}, interview_id={interview_id}")
            return False

    except Exception as e:
        logging.error(f"Error sending questions to MongoDB: {e}, email={email}, interview_id={interview_id}")
        return False


def fetchAnswers(email, interview_id):
    """Retrieves user answers based on email and interview ID."""

    logging.info(f"Fetching answers for email={email}, interview_id={interview_id}")

    try:
        user = collection.find_one(
            {"email": email},
            {"interviews": {"$elemMatch": {"_id": interview_id}}},
        )

        if user and "interviews" in user and user["interviews"]:
            answers = user["interviews"][0].get("questions")
            logging.info(f"Fetched {len(answers)} answers successfully")
            return answers

        else:
            logging.warning(f"No answers found for email={email}, interview_id={interview_id}")
            return None

    except Exception as e:
        logging.error(f"Error fetching answers: {e}, email={email}, interview_id={interview_id}")
        return None


def calculateSimilarityScore(given_answers, expected_answers):
    """Calculates the similarity score between given and expected answers using SentenceTransformer."""

    if len(given_answers) != len(expected_answers):
        logging.error("Mismatch in number of given and expected answers")
        raise ValueError("The number of given and expected answers must be the same.")

    logging.debug(f"Calculating similarity score for {len(given_answers)} answers")

    given_embeddings = model.encode(given_answers, convert_to_tensor=True)
    expected_embeddings = model.encode(expected_answers, convert_to_tensor=True)

    similarities = util.cos_sim(given_embeddings, expected_embeddings)
    total_similarity = similarities.diagonal().sum().item()

    score = round((total_similarity / len(given_answers)) * 5, 2)
    logging.debug(f"Calculated similarity score: {score}")
    return score


def generateFeedback(question, given_answers, expected_answers, name, role, similarity_score):
    """Generates feedback based on interview questions and answers."""

    logging.info(f"Generating feedback for role={role}, similarity_score={similarity_score}")

    question = "\n".join(question)
    given_answers = "\n".join(given_answers)
    expected_answers = "\n".join(expected_answers)

    prompt = f"""
    As an interviewer for the role of {role}, you have conducted an technical interview with {name.split(" ")[0]}.
    Based on the answers provided by {name.split(" ")[0]}, you need to provide feedback on the interview.

    Questions:
    {question}

    Given Answers:
    {given_answers}

    Expected Answers:
    {expected_answers}

    Calculated Cosine Similarity (Out of 5): 
    {similarity_score}

    Provide 3-5 bullet points of direct and honest feedback, focusing on both strengths and areas for improvement. Be encouraging and offer specific suggestions for growth. 

    Instructions: 
    * The interview was conducted using speech to text; please ignore minor grammatical errors.
    * Do not use any special characters other than these markdown tags: (bullet points, bold, italic, underline, code block).
    * Ensure that the feedback is provided in first person to {name.split(" ")[0]}.
    """

    try:
        response = palm.GenerativeModel(os.getenv("GEMINI_MODEL")).generate_content(prompt)
        feedback = response.candidates[0].content.parts[0].text
        logging.debug(f"Generated feedback: {feedback}")
        return feedback

    except Exception as e:
        logging.error(f"Error generating feedback: {e}, role={role}")
        return None


def sendFeedback(email, interview_id, feedback, similarity_score):
    """Inserts feedback into MongoDB."""

    logging.info(f"Sending feedback to MongoDB for email={email}, interview_id={interview_id}")

    try:
        result = collection.update_one(
            {"email": email, "interviews._id": interview_id},
            {
                "$set": {
                    "interviews.$.feedback": feedback,
                    "interviews.$.rating": similarity_score,
                }
            },
        )

        if result.modified_count > 0:
            logging.info(f"Feedback sent to MongoDB successfully for email={email}")
            return True
        else:
            logging.warning(f"No documents updated in MongoDB for email={email}, interview_id={interview_id}")
            return False

    except Exception as e:
        logging.error(f"Error sending feedback to MongoDB: {e}, email={email}, interview_id={interview_id}")
        return False


def signal_handler(sig, frame):
    """Handles SIGINT and SIGTERM signals to gracefully shut down the process."""

    logging.info("Shutting down the main process")
    consumer.close()
    client.close()
    exit(0)


if __name__ == "__main__":
    logging.info("Main Process Started")

    collection = client["automated_interview_platform_db"]["users"]
    logging.info("Connected to MongoDB")

    palm.configure(api_key=os.getenv("GEMINI_API_KEY"))
    logging.info("Gemini API key configured")

    consumer.subscribe(topics=["resume-upload", "feedback-request"])

    while True:
        try:
            message = consumer.poll(timeout_ms=100)
            if message is None:
                logging.debug("No new messages received within timeout")
                continue
            for topic_partition, messages in message.items():
                if topic_partition.topic == "resume-upload":
                    for message in messages:
                        name, email, role, interview_id = processMessage(message)
                        if email and role and interview_id:
                            resume = fetchResume(email, interview_id)
                            if not resume:
                                continue
                            questions, expected_answers = generateQuestions(resume, role)
                            if not questions or not expected_answers:
                                continue
                            if not sendQuestions(
                                email,
                                interview_id,
                                questions,
                                expected_answers,
                            ):
                                continue
                elif topic_partition.topic == "feedback-request":
                    for message in messages:
                        name, email, role, interview_id = processMessage(message)
                        if email and role and interview_id:
                            answers = fetchAnswers(email, interview_id)
                            if not answers:
                                continue
                            questions = [q["question"] for q in answers]
                            expected_answers = [q["expectedAnswer"] for q in answers]
                            given_answers = [q["userAnswer"] for q in answers]
                            similarity_score = calculateSimilarityScore(given_answers, expected_answers)
                            user_feedback = generateFeedback(
                                questions,
                                given_answers,
                                expected_answers,
                                name,
                                role,
                                similarity_score,
                            )
                            if not sendFeedback(
                                email,
                                interview_id,
                                user_feedback,
                                similarity_score,
                            ):
                                continue
        except Exception as e:
            logging.error(f"Unexpected error in main loop: {e}")

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
