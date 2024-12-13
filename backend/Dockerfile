FROM python:3.12-alpine

WORKDIR /app

RUN apk update && apk add --no-cache \
    build-base \
    postgresql-dev \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev

COPY requirements.txt .

RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python manage.py makemigrations api && python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
