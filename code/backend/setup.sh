#!/bin/bash
set -e

echo "=== QuantumVest Backend Setup ==="

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env from example if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example — please update with your settings"
fi

# Create resource directories
mkdir -p ../resources/{data,data_cache,models,model_reports} uploads logs

echo ""
echo "=== Setup Complete ==="
echo "To start the server: ./run.sh"
echo "Or activate venv: source venv/bin/activate && python app.py"
