#!/bin/bash
# run_all_tests.sh: Runs all tests (frontend, backend, AI models, etc.) for QuantumVest.

# Exit immediately if a command exits with a non-zero status.
# Treat unset variables as an error.
# Exit if any command in a pipeline fails.
set -euo pipefail

# Define project root (assuming script is run from the project root or a known location)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==================================================="
echo " Running All QuantumVest Tests"
echo "==================================================="

# --- Run Backend Tests ---
echo ""
echo "--- Running Backend Tests ---"
# Re-use the dedicated script for backend tests
"${PROJECT_DIR}/scripts/run_backend_tests.sh" || { echo "Error: Backend tests failed." >&2; exit 1; }

# --- Run Web Frontend Tests ---
echo ""
echo "--- Running Web Frontend Tests ---"
FRONTEND_DIR="${PROJECT_DIR}/web-frontend"

if [ ! -d "${FRONTEND_DIR}" ]; then
    echo "Warning: Frontend directory not found at ${FRONTEND_DIR}. Skipping frontend tests."
else
    cd "${FRONTEND_DIR}"
    if ! command -v npm &> /dev/null; then
        echo "Error: npm command could not be found. Please ensure Node.js and npm are installed." >&2
    elif [ ! -f "package.json" ]; then
        echo "Error: package.json not found in ${FRONTEND_DIR}. Cannot run frontend tests." >&2
    else
        echo "Running 'npm test' for web frontend..."
        # web-frontend's "test" script is plain `jest --coverage`, which runs
        # once and exits (unlike react-scripts' watch-by-default test
        # runner), but CI=true is set anyway as a safety net.
        CI=true npm test || { echo "Error: Web frontend tests failed." >&2; cd "${PROJECT_DIR}"; exit 1; }
        echo "Web frontend tests completed successfully."
    fi
    cd "${PROJECT_DIR}" # Return to the main project directory
fi

# --- Run Mobile Frontend Tests ---
echo ""
echo "--- Running Mobile Frontend Tests ---"
MOBILE_DIR="${PROJECT_DIR}/mobile-frontend"

if [ ! -d "${MOBILE_DIR}" ]; then
    echo "Warning: Mobile frontend directory not found at ${MOBILE_DIR}. Skipping mobile tests."
else
    cd "${MOBILE_DIR}"
    if ! command -v npm &> /dev/null; then
        echo "Error: npm command could not be found. Please ensure Node.js and npm are installed." >&2
    elif [ ! -f "package.json" ]; then
        echo "Error: package.json not found in ${MOBILE_DIR}. Cannot run mobile tests." >&2
    else
        echo "Running 'npm test' for mobile frontend..."
        CI=true npm test || { echo "Error: Mobile frontend tests failed." >&2; cd "${PROJECT_DIR}"; exit 1; }
        echo "Mobile frontend tests completed successfully."
    fi
    cd "${PROJECT_DIR}" # Return to the main project directory
fi

# --- Run AI Model Tests ---
echo ""
echo "--- Running AI Model Tests ---"
AI_MODELS_DIR="${PROJECT_DIR}/code/ai_models"

if [ ! -d "${AI_MODELS_DIR}" ]; then
    echo "Warning: AI Models directory not found at ${AI_MODELS_DIR}. Skipping AI model tests."
elif ! find "${AI_MODELS_DIR}" -name "test_*.py" -o -name "*_test.py" 2>/dev/null | grep -q .; then
    echo "Warning: No test files (test_*.py / *_test.py) found in ${AI_MODELS_DIR}. Skipping."
else
    cd "${AI_MODELS_DIR}"
    echo "Running AI model tests with 'python3 -m unittest discover'..."
    python3 -m unittest discover || { echo "Error: AI model tests failed." >&2; cd "${PROJECT_DIR}"; exit 1; }
    echo "AI model tests completed successfully."
    cd "${PROJECT_DIR}" # Return to the main project directory
fi

# --- Run Blockchain Tests ---
echo ""
echo "--- Running Blockchain Tests ---"
BLOCKCHAIN_DIR="${PROJECT_DIR}/code/blockchain"

if [ ! -d "${BLOCKCHAIN_DIR}" ]; then
    echo "Warning: Blockchain directory not found at ${BLOCKCHAIN_DIR}. Skipping blockchain tests."
else
    cd "${BLOCKCHAIN_DIR}"
    if ! command -v npm &> /dev/null; then
        echo "Error: npm command could not be found. Please ensure Node.js and npm are installed." >&2
    elif [ ! -f "package.json" ]; then
        echo "Error: package.json not found in ${BLOCKCHAIN_DIR}. Cannot run blockchain tests." >&2
    else
        echo "Running 'npm test' for blockchain..."
        npm test || { echo "Error: Blockchain tests failed." >&2; cd "${PROJECT_DIR}"; exit 1; }
        echo "Blockchain tests completed successfully."
    fi
    cd "${PROJECT_DIR}" # Return to the main project directory
fi

echo ""
echo "==================================================="
echo " All QuantumVest tests finished successfully."
echo "==================================================="
