FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 JEJAK_DATABASE=/var/lib/jejaknusantara/jejaknusantara.sqlite3
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && mkdir -p /var/lib/jejaknusantara \
    && chown 10001:10001 /var/lib/jejaknusantara

COPY jejaknusantara/ jejaknusantara/
USER 10001:10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "jejaknusantara.api:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
