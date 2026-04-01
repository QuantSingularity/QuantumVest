#!/bin/bash
set -e

# QuantumVest Backend Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env if present
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

export FLASK_APP=app.py
export FLASK_ENV=${FLASK_ENV:-development}
export PORT=${PORT:-5000}

# Create resource directories
mkdir -p ../resources/{data,data_cache,models,model_reports} uploads logs

echo "Starting QuantumVest Backend on port $PORT (env: $FLASK_ENV)"

if [ "$FLASK_ENV" = "production" ] || [ "$FLASK_ENV" = "docker" ]; then
    WORKERS=${WORKERS:-4}
    exec gunicorn \
        --bind "0.0.0.0:$PORT" \
        --workers "$WORKERS" \
        --worker-class eventlet \
        --timeout 120 \
        --access-logfile logs/access.log \
        --error-logfile logs/error.log \
        --log-level info \
        app:app
else
    exec python app.py
fi
