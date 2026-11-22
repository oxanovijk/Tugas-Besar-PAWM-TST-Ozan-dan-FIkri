FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 JEJAK_DATABASE=/var/lib/jejaknusantara/jejaknusantara.sqlite3
WORKDIR /app

COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends libcap2-bin \
    && setcap 'cap_net_bind_service=+ep' $(readlink -f $(which python)) \
    && apt-get purge -y --auto-remove libcap2-bin \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt \
    && mkdir -p /var/lib/jejaknusantara \
    && chown 10001:10001 /var/lib/jejaknusantara

COPY jejaknusantara/ jejaknusantara/
USER 10001:10001
EXPOSE 80
CMD ["python", "-m", "uvicorn", "jejaknusantara.api:create_app", "--factory", "--host", "0.0.0.0", "--port", "80"]