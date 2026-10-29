#!/bin/bash
# run_backend_tests.sh: Runs all unit and integration tests for the QuantumVest backend.

# Exit immediately if a command exits with a non-zero status.
# Treat unset variables as an error.
# Exit if any command in a pipeline fails.
set -euo pipefail

# Define project root (assuming script is run from the project root or a known location)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==================================================="
echo " Running QuantumVest Backend Tests"
echo "==================================================="

BACKEND_DIR="${PROJECT_DIR}/code/backend"
VENV_DIR="${PROJECT_DIR}/venv"

if [ ! -d "${BACKEND_DIR}" ]; then
    echo "Error: Backend directory not found at ${BACKEND_DIR}. Cannot run tests." >&2
    exit 1
fi

if [ ! -d "${VENV_DIR}" ]; then
    echo "Error: Virtual environment not found at ${VENV_DIR}. Please run setup_quantumvest_env.sh first." >&2
    exit 1
fi

cd "${BACKEND_DIR}"
echo "Changed directory to $(pwd) for test execution."

# Activate virtual environment
source "${VENV_DIR}/bin/activate" || { echo "Error: Failed to activate virtual environment." >&2; exit 1; }

# Assuming tests are run using 'pytest' as it is the standard for modern Python projects
if command -v pytest &> /dev/null; then
    echo "Running tests with pytest..."
    pytest || { echo "Error: Backend tests failed." >&2; deactivate; exit 1; }
    echo "Backend tests completed successfully."
else
    echo "Warning: 'pytest' not found in the virtual environment. Please ensure it is installed (e.g., pip install pytest)."
    echo "Skipping test execution."
fi

deactivate
cd "${PROJECT_DIR}" # Return to the main project directory

echo "==================================================="
echo " Backend test run finished."
echo "==================================================="
