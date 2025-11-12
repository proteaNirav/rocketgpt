#!/usr/bin/env bash
set -e
echo "🚀 Starting RocketGPT API..."

# (Re)build ToolBase at runtime in case CSVs change
python /app/tools/generate_toolbase.py || true

# Run API
cd /app
UV_PORT="${PORT:-8080}"
exec uvicorn main:app --host 0.0.0.0 --port "${UV_PORT}"
