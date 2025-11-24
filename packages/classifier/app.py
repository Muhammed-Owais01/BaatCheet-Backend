from fastapi import FastAPI
from pydantic import BaseModel
import joblib
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
import numpy as np
import re
import contractions
import sys

# Compatibility fix for older pickled tokenizers
import tensorflow.keras.preprocessing.text as keras_text
sys.modules['keras.src.preprocessing'] = keras_text
sys.modules['keras.src.preprocessing.text'] = keras_text

app = FastAPI()

# Load model and tokenizer
model = load_model("models/cnn_fix_model.h5")
tokenizer = joblib.load("models/tokenizer.pkl")
MAX_LEN = 200


def expand_contractions(text):
    return contractions.fix(text) # Expand contractions like don't to do not

def normalize_repeats(text):
    return re.sub(r'(.)\1{2,}', r'\1\1', text)  # Words like soooo become soo

newline_re       = re.compile(r'\n')
url_re           = re.compile(r'https?://\S+|www\.\S+')
email_re         = re.compile(r'\S+@\S+')
number_re        = re.compile(r'\d+')
allowed_chars_re = re.compile(r"[^a-zA-Z0-9!?'* ]")
multi_space_re   = re.compile(r'\s+')

def clean_text(text):
    text = text.lower()  # Lowercase
    text = expand_contractions(text)  # Expand contractions
    text = normalize_repeats(text)  # Normalize repeated characters
    text = newline_re.sub(' ', text) # Remove newlines
    text = url_re.sub(' URL ', text)  # Replace URLs
    text = email_re.sub(' EMAIL ', text) # Replace emails
    text = number_re.sub(' NUMBER ', text) # Replace numbers
    text = allowed_chars_re.sub(' ', text) # Keep letters, numbers, ! ? ' *
    text = multi_space_re.sub(' ', text).strip() # Remove extra spaces
    return text

class TextInput(BaseModel):
    text: str

@app.post("/predict")
def predict_toxicity(input: TextInput):
    text = clean_text(input.text)
    seq = pad_sequences(tokenizer.texts_to_sequences([text]), maxlen=MAX_LEN, padding='post')
    pred = model.predict(seq)[0][0]
    return {"toxic": bool(pred > 0.5), "score": float(pred)}
