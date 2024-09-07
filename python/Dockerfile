FROM python:3.11-slim-bookworm AS builder
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

FROM python:3.11-slim-bookworm AS production
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY . .
ENV PYTHONUNBUFFERED=1
ENV DONTWRITEBYTECODE=1
CMD ["python", "main.py"]