#!/bin/bash

# Run script for QuantumVest project
# This script starts both the backend and frontend components

# Exit on error and treat unset variables as errors, so a failed dependency
# install doesn't silently lead to starting a server that's bound to crash.
set -euo pipefail

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Always run from the project root, regardless of the caller's cwd.
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}Starting QuantumVest application...${NC}"

if [ ! -d "code/backend" ]; then
  echo -e "${RED}Error: code/backend not found. Are you running this from the QuantumVest project?${NC}" >&2
  exit 1
fi
if [ ! -d "web-frontend" ]; then
  echo -e "${RED}Error: web-frontend not found. Are you running this from the QuantumVest project?${NC}" >&2
  exit 1
fi

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo -e "${BLUE}Creating Python virtual environment...${NC}"
  python3 -m venv venv
fi

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
(
  cd code/backend
  # shellcheck disable=SC1091
  source ../../venv/bin/activate
  pip install -r requirements.txt > /dev/null
  # The Flask app factory lives in wsgi.py (app = create_app(...)); there is
  # no app.py in this backend. wsgi.py defaults to port 5000 when run
  # directly, which matches both frontends' default API base URL.
  FLASK_ENV=development python3 wsgi.py &
  echo $! > /tmp/quantumvest_backend.pid
)
BACKEND_PID=$(cat /tmp/quantumvest_backend.pid)

# Wait for backend to initialize
echo -e "${BLUE}Waiting for backend to initialize...${NC}"
sleep 5

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo -e "${RED}Error: backend process exited immediately. Check the output above for errors.${NC}" >&2
  exit 1
fi

# Start frontend
echo -e "${BLUE}Starting frontend...${NC}"
(
  cd web-frontend
  npm install > /dev/null
  npm start &
  echo $! > /tmp/quantumvest_frontend.pid
)
FRONTEND_PID=$(cat /tmp/quantumvest_frontend.pid)

echo -e "${GREEN}QuantumVest application is running!${NC}"
echo -e "${GREEN}Backend running with PID: ${BACKEND_PID} (http://localhost:5000/api/v1)${NC}"
echo -e "${GREEN}Frontend running with PID: ${FRONTEND_PID}${NC}"
echo -e "${GREEN}Access the application at: http://localhost:3000${NC}"
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Handle graceful shutdown
cleanup() {
  echo -e "${BLUE}Stopping services...${NC}"
  kill "$FRONTEND_PID" 2>/dev/null || true
  kill "$BACKEND_PID" 2>/dev/null || true
  rm -f /tmp/quantumvest_backend.pid /tmp/quantumvest_frontend.pid
  echo -e "${GREEN}All services stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
