#!/bin/bash
# QuantumVest Environment Setup Automation Script
# This script automates the environment setup process for QuantumVest
# It handles dependency checking, installation, and environment configuration

# Exit immediately if a command exits with a non-zero status
set -e

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}QuantumVest Environment Setup Automation Script${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if an apt package is installed. Some required packages
# (e.g. build-essential, postgresql) don't provide a command of the same
# name, so `command_exists` alone would always report them as missing and
# needlessly try to reinstall them on every run.
apt_package_installed() {
  dpkg -s "$1" >/dev/null 2>&1
}

# Function to check and install system dependencies
check_system_dependencies() {
  echo -e "\n${BLUE}Checking system dependencies...${NC}"

  if ! command_exists apt-get; then
    echo -e "${YELLOW}apt-get not found (not a Debian/Ubuntu system). Skipping system package checks.${NC}"
    echo -e "${YELLOW}Please ensure curl, git, build tools, PostgreSQL, Docker, and Docker Compose are installed manually.${NC}"
    return
  fi

  # List of required system packages
  local required_packages=("curl" "git" "build-essential" "postgresql" "redis-server" "docker.io" "docker-compose")
  local missing_packages=()

  for package in "${required_packages[@]}"; do
    if ! apt_package_installed "$package"; then
      missing_packages+=("$package")
    fi
  done

  if [ ${#missing_packages[@]} -gt 0 ]; then
    echo -e "${YELLOW}The following packages are missing and will be installed:${NC}"
    for package in "${missing_packages[@]}"; do
      echo "  - $package"
    done

    echo -e "\n${BLUE}Installing missing packages...${NC}"
    sudo apt-get update
    sudo apt-get install -y "${missing_packages[@]}"
  else
    echo -e "${GREEN}All system dependencies are installed.${NC}"
  fi

  # Docker Compose may be provided as the "docker compose" plugin instead of
  # (or in addition to) the standalone docker-compose binary.
  if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${YELLOW}Neither 'docker-compose' nor the 'docker compose' plugin was found on PATH.${NC}"
    echo -e "${YELLOW}Docker-based setup/deploy steps will not work until one of them is installed.${NC}"
  fi
}

# Function to check and install Python dependencies
setup_python_environment() {
  echo -e "\n${BLUE}Setting up Python environment...${NC}"

  # Check Python version
  if ! command_exists python3; then
    echo -e "${RED}Python 3 is not installed. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
  fi

  # Create virtual environment if it doesn't exist
  if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating Python virtual environment...${NC}"
    python3 -m venv venv
  fi

  # Activate virtual environment
  echo -e "${BLUE}Activating virtual environment...${NC}"
  # shellcheck disable=SC1091
  source venv/bin/activate

  # Install Python dependencies
  echo -e "${BLUE}Installing Python dependencies...${NC}"
  pip install --upgrade pip

  # Check if requirements.txt exists in the backend directory
  if [ -f "code/backend/requirements.txt" ]; then
    pip install -r code/backend/requirements.txt
  else
    echo -e "${YELLOW}Warning: code/backend/requirements.txt not found. Installing common dependencies...${NC}"
    pip install flask flask-sqlalchemy flask-jwt-extended pandas numpy scikit-learn gunicorn pytest
  fi

  # Install AI model dependencies
  if [ -f "code/ai_models/requirements.txt" ]; then
    pip install -r code/ai_models/requirements.txt
  fi

  echo -e "${GREEN}Python environment setup complete.${NC}"
}

# Function to set up Node.js environment
setup_node_environment() {
  echo -e "\n${BLUE}Setting up Node.js environment...${NC}"

  # Check if Node.js is installed
  if ! command_exists node; then
    echo -e "${YELLOW}Node.js is not installed. Installing via NVM...${NC}"

    # Install NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

    # Load NVM
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1091
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # Install Node.js LTS
    nvm install --lts
    nvm use --lts
  fi

  # Install web frontend dependencies (the real directory is "web-frontend"
  # at the project root, not "code/frontend")
  if [ -d "web-frontend" ]; then
    echo -e "${BLUE}Installing web frontend dependencies...${NC}"
    (cd web-frontend && npm install)
  fi

  # Install blockchain dependencies
  if [ -d "code/blockchain" ]; then
    echo -e "${BLUE}Installing blockchain dependencies...${NC}"
    (cd code/blockchain && npm install)
  fi

  # Install mobile frontend dependencies
  if [ -d "mobile-frontend" ]; then
    echo -e "${BLUE}Installing mobile frontend dependencies...${NC}"
    (cd mobile-frontend && npm install)
  fi

  echo -e "${GREEN}Node.js environment setup complete.${NC}"
}

# Function to set up environment variables
setup_env_variables() {
  echo -e "\n${BLUE}Setting up environment variables...${NC}"

  # --- Backend .env -------------------------------------------------------
  # Variable names below must match app/config.py exactly:
  #   SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL, DEV_DATABASE_URL,
  #   ALPHA_VANTAGE_API_KEY, COINAPI_KEY, REDIS_URL, CORS_ORIGINS,
  #   MAX_LOGIN_ATTEMPTS, ACCOUNT_LOCKOUT_MINUTES, FLASK_ENV
  if [ -d "code/backend" ]; then
    if [ -f "code/backend/.env" ]; then
      echo -e "${GREEN}code/backend/.env already exists.${NC}"
    else
      echo -e "${YELLOW}code/backend/.env not found. Creating...${NC}"
      if [ -f "code/backend/.env.example" ]; then
        cp code/backend/.env.example code/backend/.env
        # The example ships with a sqlite default; point it at the local
        # Postgres instance this script provisions in setup_database().
        {
          echo ""
          echo "# Added by env_setup.sh — local Postgres instance"
          echo "DEV_DATABASE_URL=postgresql://quantumvest:quantumvest@localhost:5432/quantumvest_dev"
        } >> code/backend/.env
      else
        cat > code/backend/.env << 'EOL'
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
DATABASE_URL=postgresql://quantumvest:quantumvest@localhost:5432/quantumvest_dev
DEV_DATABASE_URL=postgresql://quantumvest:quantumvest@localhost:5432/quantumvest_dev
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000
ALPHA_VANTAGE_API_KEY=
COINAPI_KEY=
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30
EOL
      fi
      echo -e "${GREEN}code/backend/.env created. Please update it with real credentials before deploying.${NC}"
    fi
  fi

  # --- Web frontend .env ---------------------------------------------------
  # web-frontend is built with Vite, which only exposes variables prefixed
  # with VITE_ to client code (import.meta.env). A previous version of this
  # script wrote REACT_APP_*, which Vite silently ignores.
  if [ -d "web-frontend" ]; then
    if [ -f "web-frontend/.env" ]; then
      echo -e "${GREEN}web-frontend/.env already exists.${NC}"
    else
      echo -e "${YELLOW}web-frontend/.env not found. Creating...${NC}"
      cat > web-frontend/.env << 'EOL'
VITE_API_BASE_URL=http://localhost:5000/api/v1
EOL
      echo -e "${GREEN}web-frontend/.env created.${NC}"
    fi
  fi

  # --- Mobile frontend .env -------------------------------------------------
  if [ -d "mobile-frontend" ]; then
    if [ -f "mobile-frontend/.env" ]; then
      echo -e "${GREEN}mobile-frontend/.env already exists.${NC}"
    else
      echo -e "${YELLOW}mobile-frontend/.env not found. Creating...${NC}"
      cat > mobile-frontend/.env << 'EOL'
API_BASE_URL=http://localhost:5000/api/v1
APP_ENV=development
EOL
      echo -e "${GREEN}mobile-frontend/.env created.${NC}"
    fi
  fi
}

# Function to set up database
setup_database() {
  echo -e "\n${BLUE}Setting up database...${NC}"

  # Check if PostgreSQL service is running
  if command_exists systemctl && systemctl is-active --quiet postgresql 2>/dev/null; then
    echo -e "${GREEN}PostgreSQL is running.${NC}"
  elif command_exists systemctl; then
    echo -e "${YELLOW}PostgreSQL is not running. Starting service...${NC}"
    sudo systemctl start postgresql
  else
    echo -e "${YELLOW}systemctl not available; please ensure PostgreSQL is running manually.${NC}"
  fi

  # Create database and user if they don't exist. The source of truth for
  # the connection string is code/backend/.env's DATABASE_URL — NOT a
  # top-level .env, which nothing in the application actually reads.
  echo -e "${BLUE}Creating database and user if they don't exist...${NC}"

  if [ -f "code/backend/.env" ]; then
    DB_URL=$(grep -m1 '^DATABASE_URL=' code/backend/.env | cut -d= -f2-)

    if [ -n "$DB_URL" ] && [[ "$DB_URL" == postgresql://* ]]; then
      DB_USER=$(echo "$DB_URL" | sed -E 's#postgresql://([^:]+):.*#\1#')
      DB_NAME=$(echo "$DB_URL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')

      if command_exists psql && command_exists createdb; then
        if sudo -u postgres psql -lqt 2>/dev/null | cut -d '|' -f 1 | grep -qw "$DB_NAME"; then
          echo -e "${GREEN}Database $DB_NAME already exists.${NC}"
        else
          echo -e "${YELLOW}Creating role $DB_USER and database $DB_NAME...${NC}"
          sudo -u postgres psql -c "DO \$\$ BEGIN CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_USER'; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;" || true
          sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
          echo -e "${GREEN}Database $DB_NAME created.${NC}"
        fi
      else
        echo -e "${YELLOW}psql/createdb not found. Skipping automatic database creation.${NC}"
        echo -e "${YELLOW}Please create database '$DB_NAME' manually.${NC}"
      fi
    else
      echo -e "${YELLOW}DATABASE_URL in code/backend/.env is not a postgresql:// URL (or is unset). Skipping.${NC}"
    fi
  else
    echo -e "${YELLOW}code/backend/.env not found. Skipping database creation.${NC}"
  fi
}

# Function to set up Docker containers
setup_docker() {
  echo -e "\n${BLUE}Setting up Docker containers...${NC}"

  if command_exists systemctl && systemctl is-active --quiet docker 2>/dev/null; then
    echo -e "${GREEN}Docker is running.${NC}"
  elif command_exists systemctl; then
    echo -e "${YELLOW}Docker is not running. Starting service...${NC}"
    sudo systemctl start docker
  fi

  # The project's real compose file lives in infrastructure/. It requires
  # several secrets (MYSQL_ROOT_PASSWORD, DB_PASSWORD, REDIS_PASSWORD,
  # JWT_SECRET, ENCRYPTION_KEY, GRAFANA_PASSWORD) with no defaults, so
  # `docker compose up` fails immediately without an infrastructure/.env.
  if [ -f "infrastructure/docker-compose.yml" ]; then
    if [ ! -f "infrastructure/.env" ] && [ -f "infrastructure/.env.example" ]; then
      echo -e "${YELLOW}infrastructure/.env not found. Generating one with random secrets...${NC}"
      cp infrastructure/.env.example infrastructure/.env
      if command_exists openssl; then
        for var in DB_PASSWORD MYSQL_ROOT_PASSWORD JWT_SECRET ENCRYPTION_KEY REDIS_PASSWORD GRAFANA_PASSWORD; do
          secret=$(openssl rand -hex 24)
          # macOS/BSD sed needs -i '', GNU sed needs -i — this project targets Linux, so plain -i is used.
          sed -i "s#^${var}=.*#${var}=${secret}#" infrastructure/.env
        done
        echo -e "${GREEN}infrastructure/.env generated with random secrets.${NC}"
      else
        echo -e "${YELLOW}openssl not found. Please fill in infrastructure/.env manually before continuing.${NC}"
      fi
    fi

    echo -e "${BLUE}Starting Docker containers from infrastructure directory...${NC}"
    (cd infrastructure && (docker compose up -d 2>/dev/null || docker-compose up -d))
  elif [ -f "docker-compose.yml" ]; then
    echo -e "${BLUE}Starting Docker containers from the current directory...${NC}"
    docker compose up -d 2>/dev/null || docker-compose up -d
  else
    echo -e "${YELLOW}No docker-compose.yml found (checked ./ and infrastructure/). Skipping Docker setup.${NC}"
  fi
}

# Main function
main() {
  # Get the project directory
  PROJECT_DIR=$(pwd)

  echo -e "${BLUE}Project directory: $PROJECT_DIR${NC}"

  # Check if we're in the QuantumVest directory
  if [ ! -f "README.md" ] || ! grep -q "QuantumVest" "README.md"; then
    echo -e "${RED}Error: This doesn't appear to be the QuantumVest project directory.${NC}"
    echo -e "${YELLOW}Please run this script from the root of the QuantumVest project.${NC}"
    exit 1
  fi

  # Run the setup functions
  check_system_dependencies
  setup_python_environment
  setup_node_environment
  setup_env_variables
  setup_database
  setup_docker

  echo -e "\n${GREEN}QuantumVest environment setup complete!${NC}"
  echo -e "${BLUE}You can now start the application using:${NC}"
  echo -e "  ./scripts/run_quantumvest.sh"
}

# Run the main function
main
