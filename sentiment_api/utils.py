import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import nltk

nltk.download("punkt")
nltk.download("stopwords")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = AutoModelForSequenceClassification.from_pretrained("./fine_tuned_model").to(device)
tokenizer = AutoTokenizer.from_pretrained("./fine_tuned_model")

index_to_label = {0: "Normal", 1: "Low", 2: "High", 3: "Medium"}

def analyze_text(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    predicted_index = torch.argmax(logits, dim=1).item()
    confidence = torch.softmax(logits, dim=1).max().item()

    return predicted_index, confidence

def alert_admin(query):
    print(f"🔔 [Admin Alert]: {query}")

def fetch_alternative_medications(query):
    print(f"🔎 [Alternative Meds]: Finding options for: {query}")

def is_bad_response(query):
    return False

def retry_rag_query(query):
    print(f"🔁 Retrying RAG for: {query}")

def send_normal_response(query):
    print(f"📨 Responding normally to: {query}")

def take_action_based_on_distress(predicted_index, confidence, user_query):
    predicted_label = index_to_label[predicted_index]
    action = "none"

    if predicted_label == "High":
        alert_admin(user_query)
        action = "alert_admin"

    elif predicted_label == "Medium" and confidence >= 0.5:
        alert_admin(user_query)
        action = "alert_admin"

    elif "alternative medicine" in user_query.lower():
        fetch_alternative_medications(user_query)
        action = "suggest_alternative_meds"

    elif is_bad_response(user_query):
        retry_rag_query(user_query)
        action = "retry_rag"

    else:
        send_normal_response(user_query)
        action = "send_normal"

    return predicted_label, confidence, action
