#!/usr/bin/env bash
set -e
echo "🚀 Starting RocketGPT API Build..."

# install backend dependencies
pip install --no-cache-dir -r rocketgpt_v3_full/api/python/requirements.txt

# Set default port if Railway didn't inject it
if [ -z "$PORT" ]; then
  PORT=8080
fi
echo "Using PORT: $PORT"

cd rocketgpt_v3_full/api/python
exec uvicorn main:app --host 0.0.0.0 --port $PORT
