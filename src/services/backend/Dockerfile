FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy project files
COPY . .

# Ensure entrypoint script is executable
RUN chmod +x /app/tools/entrypoint.sh

RUN mkdir -p /app/media/avatars && chmod 755 /app/media/avatars

EXPOSE 8000

ENTRYPOINT ["/app/tools/entrypoint.sh"]