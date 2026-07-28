#!/bin/bash
#
# QuantumVest Comprehensive Environment Setup Script
#
# Sets up a full local development environment: Python virtualenv + backend
# dependencies, web-frontend and mobile-frontend Node dependencies, and
# blockchain dependencies (if present).
#
# Usage: ./scripts/setup_quantumvest_env.sh
#

set -euo pipefail

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}QuantumVest Comprehensive Environment Setup${NC}"
echo -e "${BLUE}=================================================${NC}"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Resolve the project root from this script's own location, rather than
# assuming a fixed path. A previous version of this script hardcoded
# PROJECT_DIR="/QuantumVest", which only worked on the machine it was
# originally written on and failed immediately for every real user.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
echo -e "${BLUE}Project directory: ${PROJECT_DIR}${NC}"

if [ ! -f "README.md" ] || ! grep -q "QuantumVest" "README.md"; then
  echo -e "${RED}Error: This doesn't appear to be the QuantumVest project directory.${NC}"
  echo -e "${YELLOW}Please run this script from within the QuantumVest project (e.g. ./scripts/setup_quantumvest_env.sh).${NC}"
  exit 1
fi

BACKEND_DIR="${PROJECT_DIR}/code/backend"
AI_MODELS_DIR="${PROJECT_DIR}/code/ai_models"
BLOCKCHAIN_DIR="${PROJECT_DIR}/code/blockchain"
WEB_FRONTEND_DIR="${PROJECT_DIR}/web-frontend"
MOBILE_FRONTEND_DIR="${PROJECT_DIR}/mobile-frontend"
VENV_DIR="${PROJECT_DIR}/venv"

# ---------------------------------------------------------------------------
# 1. Python backend environment
# ---------------------------------------------------------------------------
echo -e "\n${BLUE}--- Setting up Python backend environment ---${NC}"

if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${RED}Error: ${BACKEND_DIR} not found.${NC}"
  exit 1
fi

# Prefer python3.11 (matches the version used in CI), but fall back to
# whatever python3 is available rather than failing outright.
PYTHON_BIN=""
if command_exists python3.11; then
  PYTHON_BIN="python3.11"
elif command_exists python3; then
  PYTHON_BIN="python3"
  PY_VERSION="$($PYTHON_BIN --version 2>&1)"
  echo -e "${YELLOW}python3.11 not found; using $PY_VERSION instead. CI targets 3.11, so results may differ slightly.${NC}"
else
  echo -e "${RED}Error: No python3 interpreter found. Please install Python 3.${NC}"
  exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
  echo -e "${BLUE}Creating virtual environment at ${VENV_DIR}...${NC}"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
else
  echo -e "${GREEN}Virtual environment already exists at ${VENV_DIR}.${NC}"
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

echo -e "${BLUE}Installing backend dependencies...${NC}"
pip install --upgrade pip
pip install -r "${BACKEND_DIR}/requirements.txt"

if [ -f "${AI_MODELS_DIR}/requirements.txt" ]; then
  echo -e "${BLUE}Installing AI model dependencies...${NC}"
  pip install -r "${AI_MODELS_DIR}/requirements.txt"
fi

if [ ! -f "${BACKEND_DIR}/.env" ]; then
  echo -e "${YELLOW}${BACKEND_DIR}/.env not found.${NC}"
  if [ -f "${BACKEND_DIR}/.env.example" ]; then
    cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env"
    echo -e "${GREEN}Created code/backend/.env from .env.example. Review it before running in production.${NC}"
  else
    echo -e "${YELLOW}No .env.example found either — you'll need to create code/backend/.env manually${NC}"
    echo -e "${YELLOW}(see config.py for the variables it reads: SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL, etc).${NC}"
  fi
fi

deactivate
echo -e "${GREEN}Python backend environment setup complete.${NC}"

# ---------------------------------------------------------------------------
# 2. Web frontend (Vite + React)
# ---------------------------------------------------------------------------
echo -e "\n${BLUE}--- Setting up web frontend ---${NC}"

if [ ! -d "$WEB_FRONTEND_DIR" ]; then
  echo -e "${YELLOW}${WEB_FRONTEND_DIR} not found. Skipping web frontend setup.${NC}"
elif ! command_exists npm; then
  echo -e "${RED}Error: npm not found. Please install Node.js before proceeding.${NC}"
  exit 1
else
  (cd "$WEB_FRONTEND_DIR" && npm install)

  if [ ! -f "${WEB_FRONTEND_DIR}/.env" ]; then
    # web-frontend is built with Vite: only VITE_-prefixed variables are
    # exposed to client code via import.meta.env.
    echo "VITE_API_BASE_URL=http://localhost:5000/api/v1" > "${WEB_FRONTEND_DIR}/.env"
    echo -e "${GREEN}Created web-frontend/.env${NC}"
  fi
  echo -e "${GREEN}Web frontend setup complete.${NC}"
fi

# ---------------------------------------------------------------------------
# 3. Mobile frontend (Expo + React Native)
# ---------------------------------------------------------------------------
echo -e "\n${BLUE}--- Setting up mobile frontend ---${NC}"

if [ ! -d "$MOBILE_FRONTEND_DIR" ]; then
  echo -e "${YELLOW}${MOBILE_FRONTEND_DIR} not found. Skipping mobile frontend setup.${NC}"
elif ! command_exists npm; then
  echo -e "${RED}Error: npm not found. Please install Node.js before proceeding.${NC}"
  exit 1
else
  (cd "$MOBILE_FRONTEND_DIR" && npm install)

  if [ ! -f "${MOBILE_FRONTEND_DIR}/.env" ]; then
    cat > "${MOBILE_FRONTEND_DIR}/.env" << 'EOL'
API_BASE_URL=http://localhost:5000/api/v1
APP_ENV=development
EOL
    echo -e "${GREEN}Created mobile-frontend/.env${NC}"
  fi

  echo -e "${GREEN}Mobile frontend setup complete.${NC}"
  echo -e "${YELLOW}Run 'cd mobile-frontend && npm start' to launch Expo (requires Expo Go or a simulator).${NC}"
fi

# ---------------------------------------------------------------------------
# 4. Blockchain (Truffle/Hardhat)
# ---------------------------------------------------------------------------
echo -e "\n${BLUE}--- Setting up blockchain environment ---${NC}"

if [ ! -d "$BLOCKCHAIN_DIR" ]; then
  echo -e "${YELLOW}${BLOCKCHAIN_DIR} not found. Skipping blockchain setup.${NC}"
elif [ ! -f "${BLOCKCHAIN_DIR}/package.json" ]; then
  echo -e "${YELLOW}No package.json in ${BLOCKCHAIN_DIR}. Skipping.${NC}"
elif ! command_exists npm; then
  echo -e "${RED}Error: npm not found. Please install Node.js before proceeding.${NC}"
  exit 1
else
  (cd "$BLOCKCHAIN_DIR" && npm install)
  echo -e "${GREEN}Blockchain environment setup complete.${NC}"
fi

# ---------------------------------------------------------------------------
# Summary / next steps
# ---------------------------------------------------------------------------
echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}QuantumVest environment setup complete!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "\n${BLUE}To start the backend (Flask):${NC}"
echo -e "  source venv/bin/activate"
echo -e "  cd code/backend"
echo -e "  FLASK_ENV=development python3 wsgi.py"
echo -e "  # or, for auto-reload during development:"
echo -e "  export FLASK_APP=wsgi.py"
echo -e "  export FLASK_ENV=development"
echo -e "  flask run --host=0.0.0.0 --port=5000"
echo -e "\n${BLUE}To start the web frontend (Vite):${NC}"
echo -e "  cd web-frontend && npm start   # http://localhost:3000"
echo -e "\n${BLUE}To start the mobile frontend (Expo):${NC}"
echo -e "  cd mobile-frontend && npm start"
echo -e "\n${BLUE}Or, to start backend + web frontend together:${NC}"
echo -e "  ./scripts/run_quantumvest.sh"
