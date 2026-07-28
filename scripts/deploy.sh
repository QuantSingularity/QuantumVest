#!/bin/bash
# QuantumVest Deployment Automation Script
# This script automates the deployment process for QuantumVest
# It handles Docker container management, database initialization, and service orchestration

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
echo -e "${GREEN}QuantumVest Deployment Automation Script${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Run docker-compose, preferring the v2 "docker compose" plugin and falling
# back to the standalone v1 binary if that's what's installed.
compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

# Function to deploy Docker containers
deploy_docker() {
  echo -e "\n${BLUE}Deploying Docker containers...${NC}"

  if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo -e "${YELLOW}Please install Docker before proceeding.${NC}"
    exit 1
  fi

  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    echo -e "${YELLOW}Please start Docker before proceeding.${NC}"
    exit 1
  fi

  if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}Error: Neither docker-compose nor the docker compose plugin is installed.${NC}"
    echo -e "${YELLOW}Please install one of them before proceeding.${NC}"
    exit 1
  fi

  if [ -f "docker-compose.yml" ]; then
    echo -e "${BLUE}Using docker-compose.yml in the current directory...${NC}"
    compose down
    compose build
    compose up -d
  elif [ -f "infrastructure/docker-compose.yml" ]; then
    echo -e "${BLUE}Using docker-compose.yml in the infrastructure directory...${NC}"
    if [ ! -f "infrastructure/.env" ]; then
      echo -e "${RED}Error: infrastructure/.env not found.${NC}"
      echo -e "${YELLOW}The compose file requires secrets (DB_PASSWORD, MYSQL_ROOT_PASSWORD, JWT_SECRET,${NC}"
      echo -e "${YELLOW}ENCRYPTION_KEY, REDIS_PASSWORD, GRAFANA_PASSWORD) with no defaults. Run${NC}"
      echo -e "${YELLOW}./scripts/env_setup.sh first, or copy infrastructure/.env.example to${NC}"
      echo -e "${YELLOW}infrastructure/.env and fill in real values.${NC}"
      exit 1
    fi
    (cd infrastructure && compose down && compose build && compose up -d)
  else
    echo -e "${RED}Error: docker-compose.yml not found (checked ./ and infrastructure/).${NC}"
    exit 1
  fi

  echo -e "${GREEN}Docker containers deployed successfully.${NC}"
}

# Function to initialize database
initialize_database() {
  echo -e "\n${BLUE}Initializing database...${NC}"

  if [ ! -d "code/backend" ]; then
    echo -e "${RED}Error: Backend directory not found.${NC}"
    echo -e "${YELLOW}Please ensure the backend directory exists before proceeding.${NC}"
    exit 1
  fi

  if [ -f "code/backend/migrations/run_migrations.py" ]; then
    echo -e "${BLUE}Running database migrations...${NC}"
    (cd code/backend && python3 migrations/run_migrations.py)
  elif [ -f "code/backend/alembic.ini" ]; then
    echo -e "${BLUE}Running Alembic migrations...${NC}"
    if ! command_exists alembic; then
      echo -e "${YELLOW}Alembic not found. Installing...${NC}"
      pip install alembic
    fi
    (cd code/backend && alembic upgrade head)
  else
    # This backend calls db.create_all() on startup (see app/__init__.py),
    # so there's no separate migration step to run.
    echo -e "${YELLOW}No migration scripts found. The backend creates its tables automatically on startup.${NC}"
  fi

  echo -e "${GREEN}Database initialization completed.${NC}"
}

# Function to deploy backend services
deploy_backend() {
  echo -e "\n${BLUE}Deploying backend services...${NC}"

  if [ ! -d "code/backend" ]; then
    echo -e "${RED}Error: Backend directory not found.${NC}"
    echo -e "${YELLOW}Please ensure the backend directory exists before proceeding.${NC}"
    exit 1
  fi

  if [ "$DEPLOY_MODE" = "docker" ]; then
    echo -e "${BLUE}Backend services are deployed via Docker.${NC}"
    echo -e "${BLUE}No additional action needed.${NC}"
  else
    echo -e "${BLUE}Deploying backend services directly...${NC}"

    if [ ! -d "venv" ]; then
      echo -e "${YELLOW}Python virtual environment not found. Creating...${NC}"
      python3 -m venv venv
    fi

    # shellcheck disable=SC1091
    source venv/bin/activate

    pip install -r code/backend/requirements.txt

    if ! command_exists gunicorn; then
      echo -e "${YELLOW}Gunicorn not found. Installing...${NC}"
      pip install gunicorn
    fi

    # The Flask app factory lives in wsgi.py (app = create_app(...)) — there
    # is no main.py in this backend.
    echo -e "${BLUE}Starting backend services with Gunicorn...${NC}"
    (cd code/backend && FLASK_ENV=production gunicorn wsgi:app --workers 4 --bind 0.0.0.0:8000 --daemon)

    echo -e "${GREEN}Backend services deployed successfully.${NC}"
  fi
}

# Function to deploy frontend
deploy_frontend() {
  echo -e "\n${BLUE}Deploying frontend...${NC}"

  # The real directory is "web-frontend" at the project root.
  if [ ! -d "web-frontend" ]; then
    echo -e "${RED}Error: web-frontend directory not found.${NC}"
    echo -e "${YELLOW}Please ensure the web-frontend directory exists before proceeding.${NC}"
    exit 1
  fi

  if [ "$DEPLOY_MODE" = "docker" ]; then
    echo -e "${BLUE}Frontend is deployed via Docker.${NC}"
    echo -e "${BLUE}No additional action needed.${NC}"
  else
    echo -e "${BLUE}Building and deploying frontend directly...${NC}"

    if ! command_exists node; then
      echo -e "${RED}Error: Node.js is not installed.${NC}"
      echo -e "${YELLOW}Please install Node.js before proceeding.${NC}"
      exit 1
    fi

    (cd web-frontend && npm install && npm run build)

    # web-frontend is a Vite app; its build output directory is "build"
    # (see vite.config.js: build.outDir = "build").
    if [ ! -d "web-frontend/build" ]; then
      echo -e "${RED}Error: Frontend build failed (web-frontend/build not found).${NC}"
      exit 1
    fi

    if ! command_exists nginx; then
      echo -e "${YELLOW}Nginx not found. Installing...${NC}"
      sudo apt-get update
      sudo apt-get install -y nginx
    fi

    echo -e "${BLUE}Deploying frontend to Nginx...${NC}"
    sudo mkdir -p /var/www/quantumvest
    sudo cp -r web-frontend/build/* /var/www/quantumvest/

    echo -e "${BLUE}Creating Nginx configuration...${NC}"
    sudo tee /etc/nginx/sites-available/quantumvest > /dev/null << EOL
server {
    listen 80;
    server_name _;

    root /var/www/quantumvest;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOL

    sudo ln -sf /etc/nginx/sites-available/quantumvest /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

    echo -e "${GREEN}Frontend deployed successfully.${NC}"
  fi
}

# Function to deploy mobile frontend
deploy_mobile_frontend() {
  echo -e "\n${BLUE}Deploying mobile frontend...${NC}"

  if [ ! -d "mobile-frontend" ]; then
    echo -e "${YELLOW}Mobile frontend directory not found. Skipping.${NC}"
    return
  fi

  echo -e "${BLUE}Building mobile frontend...${NC}"
  (cd mobile-frontend && npm install)

  if grep -q "\"expo\"" mobile-frontend/package.json; then
    echo -e "${BLUE}This is an Expo app.${NC}"

    # `expo build:android` / `expo build:ios` used the classic Expo build
    # service, which was shut down; builds now go through EAS.
    if ! command_exists eas; then
      echo -e "${YELLOW}eas-cli not found. Installing...${NC}"
      npm install -g eas-cli
    fi

    if [ "$BUILD_ANDROID" = "true" ]; then
      echo -e "${BLUE}Building for Android via EAS...${NC}"
      (cd mobile-frontend && eas build --platform android --non-interactive)
    fi

    if [ "$BUILD_IOS" = "true" ]; then
      echo -e "${BLUE}Building for iOS via EAS...${NC}"
      (cd mobile-frontend && eas build --platform ios --non-interactive)
    fi

    if [ "$BUILD_ANDROID" != "true" ] && [ "$BUILD_IOS" != "true" ]; then
      echo -e "${YELLOW}Neither --android nor --ios was passed. Nothing to build.${NC}"
      echo -e "${YELLOW}(EAS builds also require an Expo account and 'eas login'.)${NC}"
    fi
  else
    echo -e "${BLUE}Building bare React Native app...${NC}"

    if ! command_exists npx; then
      echo -e "${RED}Error: npx (bundled with npm) is required to run the React Native CLI.${NC}"
      exit 1
    fi

    if [ "$BUILD_ANDROID" = "true" ]; then
      echo -e "${BLUE}Building for Android...${NC}"
      (cd mobile-frontend/android && ./gradlew assembleRelease)
    fi

    if [ "$BUILD_IOS" = "true" ]; then
      echo -e "${YELLOW}iOS builds require macOS. Skipping.${NC}"
    fi
  fi

  echo -e "${GREEN}Mobile frontend build step completed.${NC}"
  echo -e "${YELLOW}Note: You need to manually upload the built app to app stores.${NC}"
}

# Function to display help
show_help() {
  echo -e "${BLUE}Usage: $0 [options]${NC}"
  echo -e "${BLUE}Options:${NC}"
  echo -e "  ${GREEN}-h, --help${NC}                Show this help message"
  echo -e "  ${GREEN}-m, --mode <mode>${NC}         Deployment mode: docker (default) or direct"
  echo -e "  ${GREEN}-a, --android${NC}             Build for Android (mobile frontend only)"
  echo -e "  ${GREEN}-i, --ios${NC}                 Build for iOS (mobile frontend only)"
  echo -e "  ${GREEN}-s, --skip-database${NC}       Skip database initialization"
  echo -e "  ${GREEN}-f, --skip-frontend${NC}       Skip frontend deployment"
  echo -e "  ${GREEN}-b, --skip-backend${NC}        Skip backend deployment"
  echo -e "  ${GREEN}-M, --skip-mobile${NC}         Skip mobile frontend deployment"
}

# Main function
main() {
  # Default values
  DEPLOY_MODE="docker"
  BUILD_ANDROID="false"
  BUILD_IOS="false"
  SKIP_DATABASE="false"
  SKIP_FRONTEND="false"
  SKIP_BACKEND="false"
  SKIP_MOBILE="false"

  # Parse command line arguments
  #
  # NOTE: -m is used for --mode (matching its documented meaning). A
  # previous version of this script also mapped -m to --skip-mobile, which
  # meant -m always resolved to --mode and --skip-mobile's short form could
  # never be reached. --skip-mobile now uses -M instead.
  while [ $# -gt 0 ]; do
    case "$1" in
      -h|--help)
        show_help
        exit 0
        ;;
      -m|--mode)
        DEPLOY_MODE="$2"
        shift
        ;;
      -a|--android)
        BUILD_ANDROID="true"
        ;;
      -i|--ios)
        BUILD_IOS="true"
        ;;
      -s|--skip-database)
        SKIP_DATABASE="true"
        ;;
      -f|--skip-frontend)
        SKIP_FRONTEND="true"
        ;;
      -b|--skip-backend)
        SKIP_BACKEND="true"
        ;;
      -M|--skip-mobile)
        SKIP_MOBILE="true"
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
    esac
    shift
  done

  if [ "$DEPLOY_MODE" != "docker" ] && [ "$DEPLOY_MODE" != "direct" ]; then
    echo -e "${RED}Error: Invalid deployment mode '$DEPLOY_MODE'. Must be 'docker' or 'direct'.${NC}"
    exit 1
  fi

  # Get the project directory
  PROJECT_DIR=$(pwd)
  echo -e "${BLUE}Project directory: $PROJECT_DIR${NC}"

  # Check if we're in the QuantumVest directory
  if [ ! -f "README.md" ] || ! grep -q "QuantumVest" "README.md"; then
    echo -e "${RED}Error: This doesn't appear to be the QuantumVest project directory.${NC}"
    echo -e "${YELLOW}Please run this script from the root of the QuantumVest project.${NC}"
    exit 1
  fi

  if [ "$DEPLOY_MODE" = "docker" ]; then
    deploy_docker
  fi

  if [ "$SKIP_DATABASE" = "false" ]; then
    initialize_database
  fi

  if [ "$SKIP_BACKEND" = "false" ]; then
    deploy_backend
  fi

  if [ "$SKIP_FRONTEND" = "false" ]; then
    deploy_frontend
  fi

  if [ "$SKIP_MOBILE" = "false" ]; then
    deploy_mobile_frontend
  fi

  echo -e "\n${GREEN}QuantumVest deployment completed successfully!${NC}"

  # Print access information
  echo -e "\n${BLUE}Access Information:${NC}"
  echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
  if [ "$DEPLOY_MODE" = "docker" ]; then
    echo -e "${GREEN}Backend API:${NC} http://localhost:8080/api/v1"
  else
    echo -e "${GREEN}Backend API:${NC} http://localhost:8000/api/v1"
  fi
}

# Run the main function with all arguments
main "$@"
