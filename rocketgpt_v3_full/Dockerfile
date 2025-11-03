# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    WORKDIR=/app

WORKDIR /app

# copy only what we need
COPY api/python/ /app/
COPY tools/ /app/tools/
COPY web/ /app/web/
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# install deps
RUN pip install --no-cache-dir -r /app/requirements.txt

# build ToolBase inside the image (no local python needed)
RUN python /app/tools/generate_toolbase.py || true

# Railway will set $PORT; fallback 8080 for manual runs
ENV PORT=8080
EXPOSE 8080
CMD ["/bin/bash","/app/start.sh"]
