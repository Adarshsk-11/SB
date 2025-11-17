# download_model.py
import os
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

MODEL = os.environ.get("SUMMARIZER_MODEL", "facebook/bart-large-cnn")
CACHE = os.environ.get("TRANSFORMERS_CACHE", "/tmp/model_cache")

print(f"Downloading tokenizer and model {MODEL} into cache {CACHE} ...")
os.makedirs(CACHE, exist_ok=True)

AutoTokenizer.from_pretrained(MODEL, cache_dir=CACHE)
AutoModelForSeq2SeqLM.from_pretrained(MODEL, cache_dir=CACHE)
print("Model download complete.")
