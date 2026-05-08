FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV headless
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (cached layer)
COPY requirements_docker.txt .
RUN pip install --no-cache-dir -r requirements_docker.txt

# Copy server code and model
COPY ml_server.py .
COPY models/ ./models/

# HF Spaces requires port 7860
EXPOSE 7860

CMD ["python", "ml_server.py"]
