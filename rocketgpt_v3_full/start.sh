#!/usr/bin/env bash
set -e
echo "🚀 Starting RocketGPT API Build..."

# install backend dependencies
pip install --no-cache-dir -r rocketgpt_v3_full/api/python/requirements.txt

# run server (Railway automatically sets $PORT)
cd rocketgpt_v3_full/api/python
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
