FROM python:3.10-slim

WORKDIR /app

# Ensure python logs directly to terminal
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run migrations and start server when container starts
EXPOSE 8002
CMD python manage.py migrate && python manage.py runserver 0.0.0.0:8002
