#!/bin/bash
# build_frontend.sh: Builds the QuantumVest web frontend for production.

# Exit immediately if a command exits with a non-zero status.
# Treat unset variables as an error.
# Exit if any command in a pipeline fails.
set -euo pipefail

# Define project root (assuming script is run from the project root or a known location)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==================================================="
echo " Building QuantumVest Web Frontend"
echo "==================================================="

FRONTEND_DIR="${PROJECT_DIR}/web-frontend"

if [ ! -d "${FRONTEND_DIR}" ]; then
    echo "Error: Frontend directory not found at ${FRONTEND_DIR}. Cannot build frontend." >&2
    exit 1
fi

cd "${FRONTEND_DIR}"
echo "Changed directory to $(pwd) for frontend build."

if ! command -v npm &> /dev/null; then
    echo "Error: npm command could not be found. Please ensure Node.js and npm are installed and in your PATH." >&2
    exit 1
elif [ ! -f "package.json" ]; then
    echo "Error: package.json not found in ${FRONTEND_DIR}. Cannot build frontend." >&2
    exit 1
else
    echo "Running 'npm run build' to create production assets..."
    npm run build || { echo "Error: Frontend build failed." >&2; exit 1; }
    echo "Frontend build completed successfully."
fi

cd "${PROJECT_DIR}" # Return to the main project directory

echo "==================================================="
echo " Frontend build finished."
echo "==================================================="
