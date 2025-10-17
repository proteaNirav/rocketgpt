#!/usr/bin/env bash
set -e
echo "🚀 Starting RocketGPT API…"

# Install deps
pip install --no-cache-dir -r rocketgpt_v3_full/api/python/requirements.txt

# Port default
[ -z "$PORT" ] && PORT=8080
echo "Using PORT: $PORT"

cd rocketgpt_v3_full/api/python
exec uvicorn main:app --host 0.0.0.0 --port $PORT
