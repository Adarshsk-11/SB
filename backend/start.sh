#!/usr/bin/env bash
set -euo pipefail

# ensure TRANSFORMERS cache dir exists
export TRANSFORMERS_CACHE="${TRANSFORMERS_CACHE:-/tmp/model_cache}"
export HF_HOME="${TRANSFORMERS_CACHE}"   # optional alternative cache var

echo "Using TRANSFORMERS_CACHE=$TRANSFORMERS_CACHE"
mkdir -p "$TRANSFORMERS_CACHE"

# Optionally pre-download model (safe even if already present)
python download_model.py

# Start Uvicorn listening on RENDER's port env var ($PORT)
# Use 0.0.0.0 so it binds externally
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
