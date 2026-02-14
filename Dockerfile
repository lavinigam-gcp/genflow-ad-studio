FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend
COPY backend/pyproject.toml backend/
COPY backend/app backend/app
COPY backend/main.py backend/
RUN cd backend && pip install --no-cache-dir -e .

# Install and build frontend
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci --silent
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copy frontend build to backend static dir
RUN cp -r frontend/dist backend/static

VOLUME /app/output
EXPOSE 8000

WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
