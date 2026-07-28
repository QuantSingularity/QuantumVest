#!/bin/bash
# QuantumVest Development Workflow Automation Script
# This script automates development workflow tasks including testing, linting, and code quality checks

# Exit immediately if a command exits with a non-zero status (individual
# check functions below trap their own failures so one failing tool doesn't
# prevent the rest of the workflow from running — see run_* functions).
set -e

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}QuantumVest Development Workflow Automation Script${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to run linting on all code
run_linting() {
  echo -e "\n${BLUE}Running linting on all code...${NC}"
  local status=0

  # Use the existing lint-all.sh if available
  if [ -f "scripts/lint-all.sh" ]; then
    echo -e "${BLUE}Using existing scripts/lint-all.sh...${NC}"
    bash scripts/lint-all.sh || status=1
    return $status
  elif [ -f "lint-all.sh" ]; then
    echo -e "${BLUE}Using existing lint-all.sh script...${NC}"
    bash lint-all.sh || status=1
    return $status
  fi

  # Python linting
  if [ -d "code/backend" ] || [ -d "code/ai_models" ]; then
    echo -e "\n${BLUE}Running Python linting...${NC}"

    if ! command_exists flake8; then
      echo -e "${YELLOW}flake8 not found. Installing...${NC}"
      pip install flake8
    fi
    if ! command_exists black; then
      echo -e "${YELLOW}black not found. Installing...${NC}"
      pip install black
    fi

    # Batch all files into a single invocation per tool so one bad file
    # doesn't stop the run before the rest have been checked, and errors
    # across the whole codebase are reported together.
    echo -e "${BLUE}Running flake8...${NC}"
    find code -name "*.py" -print0 2>/dev/null | xargs -0 -r flake8 || status=1

    echo -e "${BLUE}Running black --check...${NC}"
    find code -name "*.py" -print0 2>/dev/null | xargs -0 -r black --check || status=1
  fi

  # JavaScript/TypeScript linting
  if [ -d "web-frontend" ] || [ -d "mobile-frontend" ] || [ -d "code/blockchain" ]; then
    echo -e "\n${BLUE}Running JavaScript/TypeScript linting...${NC}"

    if [ -d "web-frontend" ]; then
      echo -e "${BLUE}Linting web frontend code...${NC}"
      (
        cd web-frontend
        if grep -q "\"lint\":" package.json; then
          npm run lint
        else
          echo -e "${YELLOW}No lint script found in web-frontend package.json. Skipping.${NC}"
        fi
      ) || status=1
    fi

    if [ -d "mobile-frontend" ]; then
      echo -e "${BLUE}Linting mobile frontend code...${NC}"
      (
        cd mobile-frontend
        if grep -q "\"lint\":" package.json; then
          npm run lint
        else
          echo -e "${YELLOW}No lint script found in mobile-frontend package.json. Skipping.${NC}"
        fi
      ) || status=1
    fi

    if [ -d "code/blockchain" ]; then
      echo -e "${BLUE}Linting blockchain code...${NC}"
      (
        cd code/blockchain
        if [ -f "package.json" ] && grep -q "\"lint\":" package.json; then
          npm run lint
        else
          echo -e "${YELLOW}No lint script found in blockchain package.json. Skipping.${NC}"
        fi
      ) || status=1
    fi
  fi

  # Terraform linting
  if [ -d "infrastructure/terraform" ]; then
    echo -e "\n${BLUE}Running Terraform linting...${NC}"

    if ! command_exists tflint; then
      echo -e "${YELLOW}tflint not found. Skipping Terraform linting.${NC}"
      echo -e "${YELLOW}Please install tflint for Terraform linting.${NC}"
    else
      # .tf files live under infrastructure/terraform/{modules,environments},
      # not directly in infrastructure/ — tflint needs --recursive (or to be
      # run from that directory) to find them at all.
      (cd infrastructure/terraform && tflint --recursive) || status=1
    fi
  fi

  if [ "$status" -eq 0 ]; then
    echo -e "\n${GREEN}Linting completed with no errors.${NC}"
  else
    echo -e "\n${RED}Linting completed with errors — see above.${NC}"
  fi
  return $status
}

# Function to run tests
run_tests() {
  echo -e "\n${BLUE}Running tests...${NC}"
  local status=0

  # Backend tests
  if [ -d "code/backend" ]; then
    echo -e "\n${BLUE}Running backend tests...${NC}"
    if ! command_exists pytest; then
      echo -e "${YELLOW}pytest not found. Installing...${NC}"
      pip install pytest
    fi
    if [ -d "code/backend/tests" ]; then
      (cd code/backend && pytest tests/) || status=1
    else
      echo -e "${YELLOW}No tests directory found in backend. Skipping.${NC}"
    fi
  fi

  # AI models tests
  if [ -d "code/ai_models" ]; then
    echo -e "\n${BLUE}Running AI models tests...${NC}"
    if find code/ai_models -name "test_*.py" -o -name "*_test.py" 2>/dev/null | grep -q .; then
      if ! command_exists pytest; then
        echo -e "${YELLOW}pytest not found. Installing...${NC}"
        pip install pytest
      fi
      (cd code/ai_models && pytest .) || status=1
    else
      echo -e "${YELLOW}No test files found in code/ai_models. Skipping.${NC}"
    fi
  fi

  # Web frontend tests
  if [ -d "web-frontend" ]; then
    echo -e "\n${BLUE}Running web frontend tests...${NC}"
    (
      cd web-frontend
      if grep -q "\"test\":" package.json; then
        CI=true npm test
      else
        echo -e "${YELLOW}No test script found in web-frontend package.json. Skipping.${NC}"
      fi
    ) || status=1
  fi

  # Mobile frontend tests
  if [ -d "mobile-frontend" ]; then
    echo -e "\n${BLUE}Running mobile frontend tests...${NC}"
    (
      cd mobile-frontend
      if grep -q "\"test\":" package.json; then
        CI=true npm test
      else
        echo -e "${YELLOW}No test script found in mobile-frontend package.json. Skipping.${NC}"
      fi
    ) || status=1
  fi

  # Blockchain tests
  if [ -d "code/blockchain" ]; then
    echo -e "\n${BLUE}Running blockchain tests...${NC}"
    (
      cd code/blockchain
      if [ -f "package.json" ] && grep -q "\"test\":" package.json; then
        npm test
      else
        echo -e "${YELLOW}No test script found in blockchain package.json. Skipping.${NC}"
      fi
    ) || status=1
  fi

  if [ "$status" -eq 0 ]; then
    echo -e "\n${GREEN}Tests completed successfully.${NC}"
  else
    echo -e "\n${RED}One or more test suites failed — see above.${NC}"
  fi
  return $status
}

# Function to run code quality checks
run_code_quality() {
  echo -e "\n${BLUE}Running code quality checks...${NC}"
  local status=0

  # Python code quality
  if [ -d "code/backend" ] || [ -d "code/ai_models" ]; then
    echo -e "\n${BLUE}Running Python code quality checks...${NC}"

    if ! command_exists pylint; then
      echo -e "${YELLOW}pylint not found. Installing...${NC}"
      pip install pylint
    fi

    echo -e "${BLUE}Running pylint...${NC}"
    find code -name "*.py" -print0 2>/dev/null | xargs -0 -r pylint || {
      echo -e "${YELLOW}pylint reported issues (non-blocking).${NC}"
    }
  fi

  # JavaScript/TypeScript code quality
  if [ -d "web-frontend" ] || [ -d "mobile-frontend" ] || [ -d "code/blockchain" ]; then
    echo -e "\n${BLUE}Running JavaScript/TypeScript code quality checks...${NC}"

    if [ -d "web-frontend" ] && [ -f "web-frontend/node_modules/.bin/eslint" ]; then
      echo -e "${BLUE}Checking web frontend code quality...${NC}"
      (cd web-frontend && ./node_modules/.bin/eslint src/ --max-warnings=0) || {
        echo -e "${YELLOW}ESLint reported issues in web-frontend (non-blocking).${NC}"
      }
    fi

    if [ -d "mobile-frontend" ] && [ -f "mobile-frontend/node_modules/.bin/eslint" ]; then
      echo -e "${BLUE}Checking mobile frontend code quality...${NC}"
      (cd mobile-frontend && ./node_modules/.bin/eslint src/ --max-warnings=0) || {
        echo -e "${YELLOW}ESLint reported issues in mobile-frontend (non-blocking).${NC}"
      }
    fi
  fi

  echo -e "\n${GREEN}Code quality checks completed.${NC}"
  return $status
}

# Function to generate documentation
generate_docs() {
  echo -e "\n${BLUE}Generating documentation...${NC}"
  local status=0

  # Python documentation
  if [ -d "code/backend" ] || [ -d "code/ai_models" ]; then
    echo -e "\n${BLUE}Generating Python documentation...${NC}"

    if ! command_exists sphinx-build; then
      echo -e "${YELLOW}sphinx not found. Installing...${NC}"
      pip install sphinx sphinx_rtd_theme
    fi

    mkdir -p docs

    if [ -d "code/backend" ]; then
      echo -e "${BLUE}Generating backend documentation...${NC}"
      if [ ! -d "docs/backend" ]; then
        mkdir -p docs/backend
        (cd docs/backend && sphinx-quickstart --no-sep -p "QuantumVest Backend" -a "QuantumVest Team" -v "1.0" -r "1.0" -l "en" --ext-autodoc --ext-viewcode --ext-todo)
      fi
      (cd docs/backend && sphinx-build -b html . _build/html) || status=1
      echo -e "${GREEN}Backend documentation generated in docs/backend/_build/html${NC}"
    fi

    if [ -d "code/ai_models" ]; then
      echo -e "${BLUE}Generating AI models documentation...${NC}"
      if [ ! -d "docs/ai_models" ]; then
        mkdir -p docs/ai_models
        (cd docs/ai_models && sphinx-quickstart --no-sep -p "QuantumVest AI Models" -a "QuantumVest Team" -v "1.0" -r "1.0" -l "en" --ext-autodoc --ext-viewcode --ext-todo)
      fi
      (cd docs/ai_models && sphinx-build -b html . _build/html) || status=1
      echo -e "${GREEN}AI models documentation generated in docs/ai_models/_build/html${NC}"
    fi
  fi

  # JavaScript/TypeScript documentation
  if [ -d "web-frontend" ]; then
    echo -e "\n${BLUE}Generating web frontend documentation...${NC}"
    (
      cd web-frontend
      if [ -f "node_modules/.bin/jsdoc" ] || command_exists jsdoc; then
        mkdir -p docs
        if [ -f "node_modules/.bin/jsdoc" ]; then
          ./node_modules/.bin/jsdoc -r src -d docs
        else
          jsdoc -r src -d docs
        fi
        echo -e "${GREEN}Web frontend documentation generated in web-frontend/docs${NC}"
      else
        echo -e "${YELLOW}JSDoc not found. Skipping frontend documentation generation.${NC}"
        echo -e "${YELLOW}Run 'npm install --save-dev jsdoc' to install JSDoc.${NC}"
      fi
    ) || status=1
  fi

  echo -e "\n${GREEN}Documentation generation completed.${NC}"
  return $status
}

# Function to display help
show_help() {
  echo -e "${BLUE}Usage: $0 [options]${NC}"
  echo -e "${BLUE}Options:${NC}"
  echo -e "  ${GREEN}-h, --help${NC}        Show this help message"
  echo -e "  ${GREEN}-l, --lint${NC}        Run linting only"
  echo -e "  ${GREEN}-t, --test${NC}        Run tests only"
  echo -e "  ${GREEN}-q, --quality${NC}     Run code quality checks only"
  echo -e "  ${GREEN}-d, --docs${NC}        Generate documentation only"
  echo -e "  ${GREEN}-a, --all${NC}         Run all checks (default)"
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

  # OVERALL_STATUS tracks whether any individual check failed, so that a
  # single failing tool doesn't stop the rest of "--all" from running, while
  # the script still exits non-zero overall if anything failed.
  OVERALL_STATUS=0

  # Parse command line arguments
  if [ $# -eq 0 ]; then
    run_linting || OVERALL_STATUS=1
    run_tests || OVERALL_STATUS=1
    run_code_quality || OVERALL_STATUS=1
    generate_docs || OVERALL_STATUS=1
  else
    while [ $# -gt 0 ]; do
      case "$1" in
        -h|--help)
          show_help
          exit 0
          ;;
        -l|--lint)
          run_linting || OVERALL_STATUS=1
          ;;
        -t|--test)
          run_tests || OVERALL_STATUS=1
          ;;
        -q|--quality)
          run_code_quality || OVERALL_STATUS=1
          ;;
        -d|--docs)
          generate_docs || OVERALL_STATUS=1
          ;;
        -a|--all)
          run_linting || OVERALL_STATUS=1
          run_tests || OVERALL_STATUS=1
          run_code_quality || OVERALL_STATUS=1
          generate_docs || OVERALL_STATUS=1
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

  if [ "$OVERALL_STATUS" -eq 0 ]; then
    echo -e "\n${GREEN}QuantumVest development workflow automation completed successfully!${NC}"
  else
    echo -e "\n${RED}QuantumVest development workflow automation completed with failures.${NC}"
  fi
  exit $OVERALL_STATUS
}

# Run the main function with all arguments
main "$@"
