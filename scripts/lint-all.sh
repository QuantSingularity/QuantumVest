#!/bin/bash

# Linting and Fixing Script for QuantumVest Project (Python, JavaScript, YAML, Terraform)

set -e  # Exit immediately if a command exits with a non-zero status

echo "----------------------------------------"
echo "Starting linting and fixing process for QuantumVest..."
echo "----------------------------------------"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo "Checking for required tools..."

# Check for Python
if ! command_exists python3; then
  echo "Error: python3 is required but not installed. Please install Python 3."
  exit 1
else
  echo "python3 is installed."
fi

# Check for pip
if ! command_exists pip3; then
  echo "Error: pip3 is required but not installed. Please install pip3."
  exit 1
else
  echo "pip3 is installed."
fi

# Check for Node.js and npm
if ! command_exists node; then
  echo "Error: node is required but not installed. Please install Node.js."
  exit 1
else
  echo "node is installed."
fi

if ! command_exists npm; then
  echo "Error: npm is required but not installed. Please install npm."
  exit 1
else
  echo "npm is installed."
fi

# Check for terraform
if ! command_exists terraform; then
  echo "Warning: terraform is not installed. Terraform validation will be limited."
  TERRAFORM_AVAILABLE=false
else
  echo "terraform is installed."
  TERRAFORM_AVAILABLE=true
fi

# Check for yamllint
if ! command_exists yamllint; then
  echo "Warning: yamllint is not installed. YAML validation will be limited."
  YAMLLINT_AVAILABLE=false
else
  echo "yamllint is installed."
  YAMLLINT_AVAILABLE=true
fi

# Install required Python linting tools if not already installed
echo "----------------------------------------"
echo "Installing/Updating Python linting tools..."
pip3 install --upgrade black isort flake8 pylint

# Install global npm packages for JavaScript/TypeScript linting. These are a
# fallback only — each frontend's own local eslint/plugins (installed via
# its package.json) are preferred when we cd into that project below.
echo "----------------------------------------"
echo "Installing/Updating JavaScript linting tools..."
npm install -g eslint prettier eslint-plugin-react eslint-plugin-react-hooks

# Define directories to process. These are real top-level directories —
# black/isort/flake8/pylint/eslint/prettier all recurse into subdirectories
# on their own, so there's no need (and no accuracy benefit) to enumerate
# every subdirectory by hand.
PYTHON_DIRECTORIES=(
  "code/backend"
  "code/ai_models"
)

JS_DIRECTORIES=(
  "web-frontend/src"
  "mobile-frontend/src"
  "code/blockchain"
)

YAML_DIRECTORIES=(
  "infrastructure/kubernetes"
  "infrastructure/ansible"
  ".github/workflows"
)

# terraform fmt/validate are recursive, so only the top-level directory is
# needed — infrastructure/terraform/{modules,environments} are covered
# automatically.
TERRAFORM_DIRECTORIES=(
  "infrastructure/terraform"
)

# 1. Python Linting
echo "----------------------------------------"
echo "Running Python linting tools..."

# 1.1 Run Black (code formatter)
echo "Running Black code formatter..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Formatting Python files in $dir..."
    python3 -m black "$dir" || {
      echo "Black encountered issues in $dir. Please review the above errors."
    }
  else
    echo "Directory $dir not found. Skipping Black formatting for this directory."
  fi
done
echo "Black formatting completed."

# 1.2 Run isort (import sorter)
echo "Running isort to sort imports..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Sorting imports in Python files in $dir..."
    python3 -m isort "$dir" || {
      echo "isort encountered issues in $dir. Please review the above errors."
    }
  else
    echo "Directory $dir not found. Skipping isort for this directory."
  fi
done
echo "Import sorting completed."

# 1.3 Run flake8 (linter)
echo "Running flake8 linter..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Linting Python files in $dir with flake8..."
    python3 -m flake8 "$dir" || {
      echo "Flake8 found issues in $dir. Please review the above warnings/errors."
    }
  else
    echo "Directory $dir not found. Skipping flake8 for this directory."
  fi
done
echo "Flake8 linting completed."

# 1.4 Run pylint (more comprehensive linter)
echo "Running pylint for more comprehensive linting..."
for dir in "${PYTHON_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "Linting Python files in $dir with pylint..."
    find "$dir" -type f -name "*.py" -print0 | xargs -0 -r python3 -m pylint --disable=C0111,C0103,C0303,W0621,C0301,W0612,W0611,R0913,R0914,R0915 || {
      echo "Pylint found issues in $dir. Please review the above warnings/errors."
    }
  else
    echo "Directory $dir not found. Skipping pylint for this directory."
  fi
done
echo "Pylint linting completed."

# 2. JavaScript/TypeScript Linting
echo "----------------------------------------"
echo "Running JavaScript/TypeScript linting tools..."

# 2.1 Create ESLint config if it doesn't exist (only relevant for
# directories without their own config, e.g. code/blockchain)
if [ ! -f ".eslintrc.js" ] && [ ! -f ".eslintrc.json" ] && [ ! -f "eslint.config.js" ]; then
  echo "Creating ESLint configuration..."
  cat > .eslintrc.js << EOF
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
  ],
  rules: {
    'no-unused-vars': 'warn',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
EOF
fi

# 2.2 Create Prettier config if it doesn't exist
if [ ! -f ".prettierrc.json" ] && [ ! -f ".prettierrc.js" ]; then
  echo "Creating Prettier configuration..."
  cat > .prettierrc.json << EOF
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
EOF
fi

# 2.3 Run ESLint. Each JS_DIRECTORIES entry is inside a project
# (web-frontend, mobile-frontend, code/blockchain) that may have its own
# local eslint + plugins installed via package.json — cd into that project
# root first so npx resolves those local versions instead of silently
# falling back to whatever's installed globally.
echo "Running ESLint for JavaScript/TypeScript files..."
for dir in "${JS_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    project_root=$(dirname "$dir")
    rel_dir=$(basename "$dir")
    echo "Linting JavaScript/TypeScript files in $dir with ESLint..."
    (cd "$project_root" && npx eslint "$rel_dir" --ext .js,.jsx,.ts,.tsx --fix) || {
      echo "ESLint found issues in $dir. Please review the above warnings/errors."
    }
  else
    echo "Directory $dir not found. Skipping ESLint for this directory."
  fi
done
echo "ESLint linting completed."

# 2.4 Run Prettier
echo "Running Prettier for JavaScript/TypeScript files..."
for dir in "${JS_DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    project_root=$(dirname "$dir")
    rel_dir=$(basename "$dir")
    echo "Formatting JavaScript/TypeScript files in $dir with Prettier..."
    (cd "$project_root" && npx prettier --write "${rel_dir}/**/*.{js,jsx,ts,tsx}" --ignore-unknown) || {
      echo "Prettier encountered issues in $dir. Please review the above errors."
    }
  else
    echo "Directory $dir not found. Skipping Prettier for this directory."
  fi
done
echo "Prettier formatting completed."

# 3. YAML Linting
echo "----------------------------------------"
echo "Running YAML linting tools..."

# 3.1 Run yamllint if available
if [ "$YAMLLINT_AVAILABLE" = true ]; then
  echo "Running yamllint for YAML files..."
  for dir in "${YAML_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
      echo "Linting YAML files in $dir with yamllint..."
      yamllint "$dir" || {
        echo "yamllint found issues in $dir. Please review the above warnings/errors."
      }
    else
      echo "Directory $dir not found. Skipping yamllint for this directory."
    fi
  done
  echo "yamllint completed."
else
  echo "Skipping yamllint (not installed)."

  # 3.2 Basic YAML validation using Python
  echo "Performing basic YAML validation using Python..."
  pip3 install --upgrade pyyaml

  YAML_FILES_TO_VALIDATE=()
  for dir in "${YAML_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
      while IFS= read -r -d $'\0' file; do
        YAML_FILES_TO_VALIDATE+=("$file")
      done < <(find "$dir" -type f \( -name "*.yaml" -o -name "*.yml" \) -print0)
    elif [ -f "$dir" ]; then
       YAML_FILES_TO_VALIDATE+=("$dir")
    fi
  done

  echo "Validating YAML files..."
  for file in "${YAML_FILES_TO_VALIDATE[@]}"; do
      echo "Validating $file..."
      python3 -c "import yaml; yaml.safe_load(open('$file', 'r'))" || {
          echo "YAML validation found issues in $file. Please review the above errors."
      }
  done
  echo "Basic YAML validation completed."
fi

# 4. Terraform Linting
echo "----------------------------------------"
echo "Running Terraform linting tools..."

# 4.1 Run terraform fmt if available
if [ "$TERRAFORM_AVAILABLE" = true ]; then
  echo "Running terraform fmt for Terraform files..."
  for dir in "${TERRAFORM_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
      echo "Formatting Terraform files in $dir..."
      terraform fmt -recursive "$dir" || {
        echo "terraform fmt encountered issues in $dir. Please review the above errors."
      }
    else
      echo "Directory $dir not found. Skipping terraform fmt for this directory."
    fi
  done
  echo "terraform fmt completed."

  # 4.2 Run terraform validate if available
  echo "Running terraform validate for Terraform files..."
  # Validate the root first
  if [ -d "infrastructure/terraform" ]; then
      echo "Validating Terraform files in infrastructure/terraform..."
      (cd "infrastructure/terraform" && terraform init -backend=false && terraform validate) || {
        echo "terraform validate encountered issues in infrastructure/terraform. Please review the above errors."
      }
  else
      echo "Directory infrastructure/terraform not found. Skipping root validation."
  fi
  echo "terraform validate completed (root level)."
else
  echo "Skipping Terraform linting (terraform not installed)."
fi

# 5. Common Fixes for All File Types
echo "----------------------------------------"
echo "Applying common fixes to all file types..."

# Directories to always exclude from the sweep below: dependency trees,
# virtualenvs, and build output (web-frontend builds into "build/", not
# "dist/", but both are excluded in case that ever changes).
COMMON_EXCLUDES=(-not -path "*/node_modules/*" -not -path "*/venv/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/.next/*" -not -path "*/.expo/*")

# 5.1 Fix trailing whitespace
echo "Fixing trailing whitespace..."
find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.yaml" -o -name "*.yml" -o -name "*.tf" -o -name "*.tfvars" \) "${COMMON_EXCLUDES[@]}" -exec sed -i 's/[ \t]*$//' {} \;
echo "Fixed trailing whitespace."

# 5.2 Ensure newline at end of file
echo "Ensuring newline at end of files..."
find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.yaml" -o -name "*.yml" -o -name "*.tf" -o -name "*.tfvars" \) "${COMMON_EXCLUDES[@]}" -exec sh -c '[ -n "$(tail -c1 "$1")" ] && echo "" >> "$1"' sh {} \;
echo "Ensured newline at end of files."

echo "----------------------------------------"
echo "Linting and fixing process for QuantumVest completed!"
echo "----------------------------------------"
