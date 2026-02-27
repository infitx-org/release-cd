FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (layer caching)
COPY app/james/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/james/src/ ./src/

# Create directories for data and logs
RUN mkdir -p /app/data/chromadb /var/log/ai-agent

# Create non-root user
RUN useradd -m -u 1000 aiagent && \
    chown -R aiagent:aiagent /app /var/log/ai-agent

USER aiagent

EXPOSE 8000

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
