#!/bin/bash
# QuantumVest CI/CD Enhancement Script
# This script automates CI/CD processes including GitHub Actions workflow setup and release management

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
echo -e "${GREEN}QuantumVest CI/CD Enhancement Script${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to set up GitHub Actions workflows
setup_github_actions() {
  echo -e "\n${BLUE}Setting up GitHub Actions workflows...${NC}"

  # Don't blindly overwrite/duplicate existing workflows. If ci.yml/cd.yml
  # already exist, or some other workflow file is already present, creating
  # new ones risks running two conflicting CI pipelines on every push.
  mkdir -p .github/workflows

  if [ -f ".github/workflows/ci.yml" ] || [ -f ".github/workflows/cd.yml" ]; then
    echo -e "${YELLOW}.github/workflows/ci.yml or cd.yml already exists. Skipping to avoid overwriting it.${NC}"
    echo -e "${YELLOW}Remove the existing file(s) first if you want this script to regenerate them.${NC}"
    return
  fi

  if find .github/workflows -maxdepth 1 -name "*.yml" 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}Existing workflow file(s) found in .github/workflows/:${NC}"
    find .github/workflows -maxdepth 1 -name "*.yml" -printf "  - %f\n" 2>/dev/null
    echo -e "${YELLOW}Skipping generation of ci.yml/cd.yml to avoid a conflicting duplicate pipeline.${NC}"
    return
  fi

  # Create CI workflow file
  echo -e "${BLUE}Creating CI workflow file...${NC}"
  cat > .github/workflows/ci.yml << 'EOL'
name: QuantumVest CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:6
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        if [ -f code/backend/requirements.txt ]; then
          pip install -r code/backend/requirements.txt
        fi
        pip install pytest pytest-cov

    - name: Run tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379/0
        # NOTE: config.py's get_config() reads FLASK_ENV (not ENVIRONMENT)
        # to select TestingConfig. TestingConfig hardcodes an in-memory
        # sqlite database regardless of DATABASE_URL, so the Postgres/Redis
        # services above exist for tests that may shell out to them
        # directly, not for SQLAlchemy itself.
        FLASK_ENV: testing
      run: |
        cd code/backend
        pytest --cov=. --cov-report=xml

    - name: Upload coverage report
      uses: codecov/codecov-action@v3
      with:
        file: ./code/backend/coverage.xml
        flags: backend

  web-frontend-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: web-frontend/package-lock.json

    - name: Install dependencies
      run: |
        cd web-frontend
        npm ci

    - name: Run tests
      run: |
        cd web-frontend
        npm test

    - name: Build
      run: |
        cd web-frontend
        npm run build

    - name: Upload coverage report
      uses: codecov/codecov-action@v3
      with:
        file: ./web-frontend/coverage/coverage-final.json
        flags: web-frontend

  mobile-frontend-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: mobile-frontend/package-lock.json

    - name: Install dependencies
      run: |
        cd mobile-frontend
        npm ci

    - name: Run tests
      run: |
        cd mobile-frontend
        npm test

  blockchain-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: code/blockchain/package-lock.json

    - name: Install dependencies
      run: |
        cd code/blockchain
        npm ci

    - name: Run tests
      run: |
        cd code/blockchain
        npm test

  linting:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install Python linters
      run: |
        python -m pip install --upgrade pip
        pip install flake8 black

    - name: Run Python linting
      run: |
        flake8 code/backend
        black --check code/backend

    - name: Install web-frontend dependencies
      run: |
        cd web-frontend
        npm ci

    - name: Run web-frontend linting
      run: |
        cd web-frontend
        npm run lint
EOL

  # Create CD workflow file
  echo -e "${BLUE}Creating CD workflow file...${NC}"
  cat > .github/workflows/cd.yml << 'EOL'
name: QuantumVest CD

on:
  push:
    branches: [ main ]
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: yourusername/quantumvest
        tags: |
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=ref,event=branch

    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: ./code/backend
        push: true
        tags: ${{ steps.meta.outputs.tags }}-backend
        labels: ${{ steps.meta.outputs.labels }}

    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: ./web-frontend
        push: true
        tags: ${{ steps.meta.outputs.tags }}-frontend
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DEPLOY_HOST }}
        username: ${{ secrets.DEPLOY_USERNAME }}
        key: ${{ secrets.DEPLOY_KEY }}
        script: |
          cd /path/to/deployment
          docker compose pull
          docker compose up -d

    - name: Create GitHub Release
      uses: softprops/action-gh-release@v1
      with:
        generate_release_notes: true
EOL

  echo -e "${GREEN}GitHub Actions workflows created successfully.${NC}"
}

# Function to set up release management
setup_release_management() {
  echo -e "\n${BLUE}Setting up release management...${NC}"

  # Create release script
  echo -e "${BLUE}Creating release script...${NC}"
  cat > release.sh << 'EOL'
#!/bin/bash
# QuantumVest Release Management Script

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
echo -e "${GREEN}QuantumVest Release Management Script${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if version is provided
if [ $# -ne 1 ]; then
  echo -e "${RED}Error: Version number is required.${NC}"
  echo -e "${YELLOW}Usage: $0 <version>${NC}"
  echo -e "${YELLOW}Example: $0 1.2.3${NC}"
  exit 1
fi

VERSION=$1

# Validate version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: Invalid version format.${NC}"
  echo -e "${YELLOW}Version must be in the format: X.Y.Z${NC}"
  exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo -e "${RED}Error: git is not installed.${NC}"
  exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
  echo -e "${RED}Error: Not in a git repository.${NC}"
  exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}Error: There are uncommitted changes.${NC}"
  echo -e "${YELLOW}Please commit or stash your changes before creating a release.${NC}"
  exit 1
fi

# Update version in package.json files
echo -e "${BLUE}Updating version in package.json files...${NC}"

# Web frontend package.json
if [ -f "web-frontend/package.json" ]; then
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" web-frontend/package.json
  echo -e "${GREEN}Updated version in web-frontend/package.json${NC}"
fi

# Mobile frontend package.json
if [ -f "mobile-frontend/package.json" ]; then
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" mobile-frontend/package.json
  echo -e "${GREEN}Updated version in mobile-frontend/package.json${NC}"
fi

# Blockchain package.json
if [ -f "code/blockchain/package.json" ]; then
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" code/blockchain/package.json
  echo -e "${GREEN}Updated version in code/blockchain/package.json${NC}"
fi

# Update version in Python files
echo -e "${BLUE}Updating version in Python files...${NC}"

# Backend version file
if [ -f "code/backend/version.py" ]; then
  echo "__version__ = '$VERSION'" > code/backend/version.py
  echo -e "${GREEN}Updated version in code/backend/version.py${NC}"
elif [ -f "code/backend/__init__.py" ] && grep -q "__version__" code/backend/__init__.py; then
  sed -i "s/__version__ = '.*'/__version__ = '$VERSION'/" code/backend/__init__.py
  echo -e "${GREEN}Updated version in code/backend/__init__.py${NC}"
else
  echo "__version__ = '$VERSION'" > code/backend/version.py
  echo -e "${GREEN}Created code/backend/version.py with version $VERSION${NC}"
fi

# Create changelog entry
echo -e "${BLUE}Creating changelog entry...${NC}"

# Create CHANGELOG.md if it doesn't exist
if [ ! -f "CHANGELOG.md" ]; then
  echo "# Changelog" > CHANGELOG.md
  echo "" >> CHANGELOG.md
fi

# Get the current date
RELEASE_DATE=$(date +"%Y-%m-%d")

# Create a temporary file for the new changelog entry
TEMP_FILE=$(mktemp)

# Write the new changelog entry
{
  echo "## [$VERSION] - $RELEASE_DATE"
  echo ""
  echo "### Added"
  echo "- "
  echo ""
  echo "### Changed"
  echo "- "
  echo ""
  echo "### Fixed"
  echo "- "
  echo ""
} > "$TEMP_FILE"

# Prepend the new changelog entry to the existing changelog
cat CHANGELOG.md >> "$TEMP_FILE"
mv "$TEMP_FILE" CHANGELOG.md

echo -e "${GREEN}Created changelog entry for version $VERSION${NC}"
echo -e "${YELLOW}Please edit CHANGELOG.md to add the actual changes.${NC}"

# Commit the version changes
echo -e "${BLUE}Committing version changes...${NC}"
git add web-frontend/package.json mobile-frontend/package.json code/blockchain/package.json code/backend/version.py code/backend/__init__.py CHANGELOG.md 2>/dev/null || true
git commit -m "Bump version to $VERSION"

# Create a tag
echo -e "${BLUE}Creating tag v$VERSION...${NC}"
git tag -a "v$VERSION" -m "Version $VERSION"

echo -e "${GREEN}Release $VERSION prepared successfully.${NC}"
echo -e "${YELLOW}To push the changes and tag, run:${NC}"
echo -e "  git push origin main && git push origin v$VERSION"
EOL

  # Make the release script executable
  chmod +x release.sh

  echo -e "${GREEN}Release management script created successfully.${NC}"
}

# Function to set up version control hooks
setup_version_control_hooks() {
  echo -e "\n${BLUE}Setting up version control hooks...${NC}"

  if [ ! -d ".git" ]; then
    echo -e "${YELLOW}No .git directory found — this doesn't look like a git repository yet.${NC}"
    echo -e "${YELLOW}Run 'git init' first, then re-run this script to install hooks.${NC}"
    return
  fi

  # Create .git/hooks directory if it doesn't exist
  mkdir -p .git/hooks

  # Create pre-commit hook
  echo -e "${BLUE}Creating pre-commit hook...${NC}"
  cat > .git/hooks/pre-commit << 'EOL'
#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running pre-commit checks...${NC}"

# Check for Python syntax errors
echo -e "${BLUE}Checking for Python syntax errors...${NC}"
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.py$'); do
  if [ -f "$file" ]; then
    python3 -m py_compile "$file" || {
      echo -e "${RED}Python syntax error in $file${NC}"
      exit 1
    }
  fi
done

# Check for JavaScript/TypeScript syntax errors
echo -e "${BLUE}Checking for JavaScript/TypeScript syntax errors...${NC}"
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$'); do
  if [ -f "$file" ]; then
    if command -v node &> /dev/null; then
      node --check "$file" || {
        echo -e "${RED}JavaScript syntax error in $file${NC}"
        exit 1
      }
    fi
  fi
done

# Run linting if scripts/lint-all.sh exists
if [ -f "scripts/lint-all.sh" ]; then
  echo -e "${BLUE}Running linting...${NC}"
  bash scripts/lint-all.sh || {
    echo -e "${RED}Linting failed${NC}"
    echo -e "${YELLOW}Please fix the linting errors before committing.${NC}"
    exit 1
  }
fi

echo -e "${GREEN}Pre-commit checks passed.${NC}"
EOL

  # Make the pre-commit hook executable
  chmod +x .git/hooks/pre-commit

  # Create pre-push hook
  echo -e "${BLUE}Creating pre-push hook...${NC}"
  cat > .git/hooks/pre-push << 'EOL'
#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running pre-push checks...${NC}"

# Run backend tests if they exist
if [ -d "code/backend/tests" ]; then
  echo -e "${BLUE}Running backend tests...${NC}"
  (
    cd code/backend
    python3 -m pytest
  ) || {
    echo -e "${RED}Backend tests failed${NC}"
    echo -e "${YELLOW}Please fix the failing tests before pushing.${NC}"
    exit 1
  }
fi

# Run web frontend tests if they exist
if [ -d "web-frontend" ] && grep -q "\"test\":" web-frontend/package.json; then
  echo -e "${BLUE}Running web frontend tests...${NC}"
  (
    cd web-frontend
    CI=true npm test
  ) || {
    echo -e "${RED}Web frontend tests failed${NC}"
    echo -e "${YELLOW}Please fix the failing tests before pushing.${NC}"
    exit 1
  }
fi

# Run mobile frontend tests if they exist
if [ -d "mobile-frontend" ] && grep -q "\"test\":" mobile-frontend/package.json; then
  echo -e "${BLUE}Running mobile frontend tests...${NC}"
  (
    cd mobile-frontend
    CI=true npm test
  ) || {
    echo -e "${RED}Mobile frontend tests failed${NC}"
    echo -e "${YELLOW}Please fix the failing tests before pushing.${NC}"
    exit 1
  }
fi

echo -e "${GREEN}Pre-push checks passed.${NC}"
EOL

  # Make the pre-push hook executable
  chmod +x .git/hooks/pre-push

  echo -e "${GREEN}Version control hooks created successfully.${NC}"
}

# Function to display help
show_help() {
  echo -e "${BLUE}Usage: $0 [options]${NC}"
  echo -e "${BLUE}Options:${NC}"
  echo -e "  ${GREEN}-h, --help${NC}              Show this help message"
  echo -e "  ${GREEN}-g, --github-actions${NC}    Set up GitHub Actions workflows only"
  echo -e "  ${GREEN}-r, --release${NC}           Set up release management only"
  echo -e "  ${GREEN}-v, --version-control${NC}   Set up version control hooks only"
  echo -e "  ${GREEN}-a, --all${NC}               Set up all CI/CD enhancements (default)"
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

  # Parse command line arguments
  if [ $# -eq 0 ]; then
    # No arguments, set up all CI/CD enhancements
    setup_github_actions
    setup_release_management
    setup_version_control_hooks
  else
    while [ $# -gt 0 ]; do
      case "$1" in
        -h|--help)
          show_help
          exit 0
          ;;
        -g|--github-actions)
          setup_github_actions
          ;;
        -r|--release)
          setup_release_management
          ;;
        -v|--version-control)
          setup_version_control_hooks
          ;;
        -a|--all)
          setup_github_actions
          setup_release_management
          setup_version_control_hooks
          ;;
        *)
          echo -e "${RED}Unknown option: $1${NC}"
          show_help
          exit 1
          ;;
      esac
      shift
    done
  fi

  echo -e "\n${GREEN}QuantumVest CI/CD enhancements completed!${NC}"
}

# Run the main function with all arguments
main "$@"
