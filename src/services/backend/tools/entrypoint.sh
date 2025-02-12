#!/bin/bash
set -e

# Wait for database
echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
    sleep 0.1
done
echo "Database is ready!"

# Clear existing migrations if needed
if [ "$RESET_MIGRATIONS" = "true" ]; then
    echo "Resetting migrations..."
    find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
    find . -path "*/migrations/*.pyc" -delete
fi

# Make migrations for each app in specific order
echo "Making migrations..."
python manage.py makemigrations users --noinput
python manage.py makemigrations auth --noinput
python manage.py makemigrations admin --noinput
python manage.py makemigrations contenttypes --noinput
python manage.py makemigrations sessions --noinput
python manage.py makemigrations matches --noinput
python manage.py makemigrations tournaments --noinput
python manage.py makemigrations token_blacklist --noinput

# Apply migrations in specific order
echo "Applying migrations..."
python manage.py migrate users --noinput
python manage.py migrate auth --noinput
python manage.py migrate admin --noinput
python manage.py migrate contenttypes --noinput
python manage.py migrate sessions --noinput
python manage.py migrate matches --noinput
python manage.py migrate tournaments --noinput
python manage.py migrate token_blacklist --noinput

# Clear existing static files
echo "Collecting static files..."
rm -rf /app/static/*
python manage.py collectstatic --no-input

# Create superuser if needed
if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput || true
fi

# Start server
echo "Starting server..."
daphne -b 0.0.0.0 -p 8000 backend.asgi:application