# QuantumVest Backend Dockerfile
# Build context: this file expects to be built with `backend/` itself as the
# context (e.g. `docker build -f backend/Dockerfile backend/`, or via the
# top-level docker-compose.yml which sets context: ./backend).
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=docker \
    PORT=5000

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgomp1 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create resource directories
RUN mkdir -p \
    /app/resources/data \
    /app/resources/data_cache \
    /app/resources/models \
    /app/resources/model_reports \
    /app/uploads \
    /app/logs

# Create non-root user for security
RUN addgroup --system quantumvest && \
    adduser --system --ingroup quantumvest quantumvest && \
    chown -R quantumvest:quantumvest /app

USER quantumvest

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Expose port
EXPOSE ${PORT}

# Run with gunicorn in production.
# NOTE: "wsgi:app" refers to backend/wsgi.py, which builds the app via the
# create_app() factory. "gthread" is used instead of "eventlet" because no
# eventlet/greenlet dependency is declared in requirements.txt; gthread needs
# no extra package and gives the same worker a small thread pool for I/O-bound
# requests (market-data lookups, DB calls) without blocking the whole worker.
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "4", \
     "--worker-class", "gthread", \
     "--threads", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "wsgi:app"]
