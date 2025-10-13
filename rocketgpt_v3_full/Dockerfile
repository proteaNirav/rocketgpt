
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY api/python/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY api/python/ /app/
COPY web/ /app/web/
COPY tools/ /app/tools/
COPY core/config/ /app/core/config/
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","${PORT}"]
