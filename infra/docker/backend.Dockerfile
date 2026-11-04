FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/backend

COPY backend/pyproject.toml /app/backend/pyproject.toml
COPY backend/alembic.ini /app/backend/alembic.ini
COPY backend/app /app/backend/app
COPY backend/migrations /app/backend/migrations

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
