FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY api/python/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY api/python/ /app/
COPY web/ /app/web/
COPY tools/ /app/tools/
COPY core/config/ /app/core/config/

EXPOSE 8080
# Use SHELL form so $PORT expands; default to 8080 if not set
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
