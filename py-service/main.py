import pymongo
import os
import re
from pymongo import MongoClient
import google.generativeai as palm
from sentence_transformers import SentenceTransformer, util
from langchain.document_loaders import PyPDFLoader # for reaading the pdf

def get_latest_resume_data_by_email(email):
    client = MongoClient('mongodb://sih-admin:vQ5blNx3ihoZ@20.207.85.19/vichaar_manthan_sih_db?retryWrites=true&ssl=false')  # Replace with your MongoDB URL
    db = client['vichaar_manthan_sih_db']  # Replace 'your_database' with your database name
    collection = db['users']  # Replace 'your_collection' with your collection name

    # Find the user by email
    user = collection.find_one({'email': email})
    
    if user and 'interviews' in user:
        # Sort interviews by time to get the latest one
        latest_interview = max(user['interviews'], key=lambda x: x['time'])
        resume_data = latest_interview.get('resumeData')
        return resume_data
    else:
        return None
    
#Converting binary content to text from MongoDB

def binary2text(resume_data):
    with open("temp.pdf", "wb") as pdf_file:
        pdf_file.write(resume_data)

    docLoader = PyPDFLoader("temp.pdf")
    document = docLoader.load()
    document = document[0].page_content
    return document

# Function to generate questions and expected answers using PaLM API
def generate_questions_and_answers(resume_text):
    prompt = f'''
    Based on the following resume text:
    \n{resume_text}\n
    Generate 5 technical interview questions and their expected answers in a fixed format like this:

    Questions:
    1. First Question Here
    2. Second Question Here
    3. Third Question Here
    4. Fourth Question Here
    5. Fifth Question Here
    
    Answers:
    1. First Answer Here
    2. Second Answer Here
    3. Third Answer Here
    4. Fourth Answer Here
    5. Fifth Answer Here

    Note: Do not use any markdown or special characters which might violate the format
    '''
    
    # Call PaLM API with the prompt
    response = palm.generate_text(prompt=prompt, model="models/text-bison-001", max_output_tokens=500)
    
    if response:
        questions_and_exanswers = response.result
        return questions_and_exanswers
    else:
        return "No response from the model"
    
def extract_questions_and_answers(text):

    # Split the input text into Questions and Answers parts
    try:
        questions_part, answers_part = text.split("Answers:")
    except ValueError:
        raise ValueError("Input text must contain both 'Questions:' and 'Answers:' sections.")

    # Extract questions using regex
    questions = re.findall(r'(?<=\d\.\s)(.*?)(?=\d\.\s|$)', questions_part, re.DOTALL)
    questions = [q.strip() for q in questions]  # Clean up whitespace

    # Extract answers using regex
    answers = re.findall(r'(?<=\d\.\s)(.*?)(?=\d\.\s|$)', answers_part, re.DOTALL)
    answers = [a.strip() for a in answers]  # Clean up whitespace

    return questions,answers

# Load the pre-trained model for embedding sentences
model = SentenceTransformer('all-MiniLM-L6-v2')

# Function to calculate cosine similarity between two lists of answers
def calculate_similarity_score(given_answers, expected_answers):
    if len(given_answers) != len(expected_answers):
        raise ValueError("The number of given and expected answers must be the same.")
    
    total_similarity = 0
    num_questions = len(given_answers)
    
    # Loop through each pair of answers
    for i in range(num_questions):
        given_embedding = model.encode(given_answers[i], convert_to_tensor=True)
        expected_embedding = model.encode(expected_answers[i], convert_to_tensor=True)
        
        # Compute cosine similarity
        similarity = util.cos_sim(given_embedding, expected_embedding).item()
        total_similarity += similarity
    
    # Calculate the average similarity score
    average_similarity = total_similarity / num_questions
    
    # Scale the score to be out of 5
    score_out_of_five = average_similarity * 5
    
    return score_out_of_five


# Example usage:
email = 'itsspirax@gmail.com'  # Replace with the actual email of the user
# Get the latest resumeData
resume_data = get_latest_resume_data_by_email(email)
print(resume_data)

resume_text = binary2text(resume_data)
print(resume_text)

# Initialize Google PaLM API
palm.configure(api_key=os.environ["GOOGLE_API_KEY"])

questions_and_exanswers = generate_questions_and_answers(resume_text)
print(questions_and_exanswers)

ques,exans = extract_questions_and_answers(questions_and_exanswers)
print(ques,exans)

# Example usage
given_answers = [
    "Supervised learning involves labeled data, while unsupervised learning uses unlabeled data.",
    "Feature engineering transforms raw data into useful features, including creating new features and removing outliers.",
    "Common machine learning models include decision trees, random forests, and neural networks.",
    "Diferent types of models include CNNs, RNNs and RL",
    "Models can be deployed via web services, mobile apps, or desktop applications."
]
# Calculate similarity score out of 5
score = calculate_similarity_score(given_answers, exans)
print(f"Similarity Score out of 5: {score:.2f}")