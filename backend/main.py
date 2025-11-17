# D:\Project\SB\backend\main.py
import os
import re
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# transformers + torch
from transformers import pipeline
import torch

# extractive helpers
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Summarizer API (abstractive + extractive)")

# Allow CORS for development (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change this to your frontend domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurable model name via env var
MODEL_NAME = os.getenv("SUMMARIZER_MODEL", "facebook/bart-large-cnn")
# Alternative smaller default: "sshleifer/distilbart-cnn-12-6"

# Determine device: use GPU if available, otherwise CPU
DEVICE = 0 if torch.cuda.is_available() else -1
logger.info(f"Device for pipeline: {'cuda' if DEVICE == 0 else 'cpu'} (device value: {DEVICE})")

# Load model at startup
@app.on_event("startup")
def load_model():
    global summarizer
    try:
        logger.info(f"Loading summarizer model: {MODEL_NAME} ...")
        summarizer = pipeline("summarization", model=MODEL_NAME, device=DEVICE)
        logger.info("Summarizer loaded successfully.")
    except Exception as e:
        logger.exception("Failed to load summarizer model on startup.")
        summarizer = None


# Request model (accepts optional generation parameters)
class SummarizeRequest(BaseModel):
    text: str
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    num_beams: Optional[int] = None
    extractive_k: Optional[int] = 2  # how many sentences to include in extractive summary


# ----- extractive helper functions -----
_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+')

def split_sentences(text: str):
    # Basic sentence splitter; keeps punctuation. Works decently for English.
    sents = [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]
    if not sents:
        # fallback: return the whole text as one "sentence"
        return [text.strip()]
    return sents

def extractive_summary(text: str, top_k: int = 2) -> str:
    sents = split_sentences(text)
    if len(sents) <= top_k:
        return " ".join(sents)

    try:
        vect = TfidfVectorizer().fit_transform(sents)
        sim = cosine_similarity(vect, vect)
        centrality = sim.sum(axis=1)  # sum similarities to all sentences
        top_idx = np.argsort(-centrality)[:top_k]  # highest centrality indices
        top_idx_sorted = sorted(top_idx)  # preserve original order
        chosen = [sents[i] for i in top_idx_sorted]
        return " ".join(chosen)
    except Exception as e:
        # If TF-IDF fails for any reason, fall back to returning first top_k sentences
        logger.exception("Extractive summary failed, falling back to first sentences.")
        return " ".join(sents[:top_k])


# ----- summarize endpoint -----
@app.post("/summarize")
async def summarize(req: SummarizeRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="`text` is required in the request body.")

    text = req.text.strip()

    # 1) Extractive summary (quick, preserves original sentences)
    try:
        k = int(req.extractive_k) if req.extractive_k is not None else 2
    except Exception:
        k = 2
    extractive = extractive_summary(text, top_k=k)

    # 2) Abstractive summary (uses model with tunable params)
    if 'summarizer' not in globals() or summarizer is None:
        # If model failed to load, return extractive only but indicate the model isn't loaded
        return {
            "abstractive_summary": None,
            "extractive_summary": extractive,
            "note": "Abstractive summarizer not loaded (server startup failure)."
        }

    # default generation params (sensible defaults)
    DEFAULTS = {
        "min_length": 40,
        "max_length": 160,
        "num_beams": 4,
        "do_sample": False,
        "length_penalty": 0.8,
        "no_repeat_ngram_size": 3,
        "early_stopping": True
    }

    # override with request-provided values if present
    gen_min = req.min_length if req.min_length is not None else DEFAULTS["min_length"]
    gen_max = req.max_length if req.max_length is not None else DEFAULTS["max_length"]
    gen_beams = req.num_beams if req.num_beams is not None else DEFAULTS["num_beams"]

    # Basic safety checks for lengths
    if gen_min < 5:
        gen_min = DEFAULTS["min_length"]
    if gen_max < gen_min:
        gen_max = max(gen_min + 20, DEFAULTS["max_length"])

    try:
        result = summarizer(
            text,
            max_length=int(gen_max),
            min_length=int(gen_min),
            do_sample=DEFAULTS["do_sample"],
            num_beams=int(gen_beams),
            length_penalty=float(DEFAULTS["length_penalty"]),
            no_repeat_ngram_size=int(DEFAULTS["no_repeat_ngram_size"]),
            early_stopping=bool(DEFAULTS["early_stopping"])
        )
        abstractive = result[0].get("summary_text", "").strip()
    except Exception as e:
        logger.exception("Abstractive summarization failed.")
        abstractive = None

    # Return both summaries and the params used (helps debugging from the frontend)
    return {
        "abstractive_summary": abstractive,
        "extractive_summary": extractive,
        "used_generation_params": {
            "min_length": gen_min,
            "max_length": gen_max,
            "num_beams": gen_beams,
            "device": ("cuda" if DEVICE == 0 else "cpu"),
            "model": MODEL_NAME
        }
    }
