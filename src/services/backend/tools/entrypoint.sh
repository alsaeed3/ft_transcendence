#!/bin/sh

set -e

# Wait for database
echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
    sleep 0.1
done
echo "Database is ready!"

# Run migrations
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Clear existing static files
rm -rf /app/static/*

# Collect static files
python manage.py collectstatic --no-input

# Create superuser if needed
if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser --noinput || true
fi

# Start server
uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --reload