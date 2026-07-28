# QuantumVest Automation Scripts

This package contains a suite of automation scripts for the QuantumVest project. Below is documentation for each script, including purpose, usage, options, and key features.

All scripts assume they're run from the root of the QuantumVest project (e.g. `./scripts/env_setup.sh`), and most verify their execution directory before proceeding.

---

## Scripts Overview

### 1. `env_setup.sh`

- **Purpose:** Automates the environment setup process for QuantumVest — system packages, Python virtualenv, Node dependencies (web-frontend, mobile-frontend, blockchain), `.env` files, local PostgreSQL database, and Docker.
- **Usage:**

  ```bash
  ./scripts/env_setup.sh
  ```

- **Features:**
  - Dependency checking and installation
  - Python and Node.js environment setup
  - Environment variable configuration (`code/backend/.env`, `web-frontend/.env`, `mobile-frontend/.env`)
  - Local PostgreSQL database setup
  - Docker container initialization (including generating `infrastructure/.env` secrets if missing)

---

### 2. `setup_quantumvest_env.sh`

- **Purpose:** A more focused alternative to `env_setup.sh` — sets up the Python virtualenv + backend dependencies, and installs dependencies for web-frontend, mobile-frontend, and the blockchain project. Prints exact commands to start each service afterward.
- **Usage:**

  ```bash
  ./scripts/setup_quantumvest_env.sh
  ```

---

### 3. `dev_workflow.sh`

- **Purpose:** Automates development workflow tasks — linting, testing, code quality checks, and documentation generation across the backend, AI models, web-frontend, mobile-frontend, and blockchain code.
- **Usage:**

  ```bash
  ./scripts/dev_workflow.sh [options]
  ```

- **Options:**
  - `-h, --help` Show help message
  - `-l, --lint` Run linting only
  - `-t, --test` Run tests only
  - `-q, --quality` Run code quality checks only
  - `-d, --docs` Generate documentation only
  - `-a, --all` Run all checks (default)

  Running with no options (or `--all`) runs every check even if an earlier one fails, then exits non-zero at the end if anything failed — so one failing lint rule won't prevent your tests from running.

---

### 4. `lint-all.sh`

- **Purpose:** A standalone, more thorough linter/formatter pass — Black, isort, flake8, and pylint for Python; ESLint and Prettier for JavaScript/TypeScript; yamllint for YAML; `terraform fmt`/`validate` for Terraform. Also fixes trailing whitespace and missing trailing newlines repo-wide.
- **Usage:**

  ```bash
  ./scripts/lint-all.sh
  ```

- **Note:** `dev_workflow.sh -l` will use this script automatically if it's present.

---

### 5. `deploy.sh`

- **Purpose:** Automates deployment — Docker Compose (default) or a direct deploy (Gunicorn + Nginx for the backend/web-frontend, EAS/Gradle for the mobile app).
- **Usage:**

  ```bash
  ./scripts/deploy.sh [options]
  ```

- **Options:**
  - `-h, --help` Show help message
  - `-m, --mode <mode>` Deployment mode: `docker` (default) or `direct`
  - `-a, --android` Build for Android (mobile frontend only)
  - `-i, --ios` Build for iOS (mobile frontend only)
  - `-s, --skip-database` Skip database initialization
  - `-f, --skip-frontend` Skip web frontend deployment
  - `-b, --skip-backend` Skip backend deployment
  - `-M, --skip-mobile` Skip mobile frontend deployment

  Docker mode requires `infrastructure/.env` to exist (it holds required secrets like `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`, etc. with no defaults). `./scripts/env_setup.sh` generates one automatically if it's missing.

---

### 6. `build_frontend.sh`

- **Purpose:** A focused script that just builds `web-frontend` for production (`npm install && npm run build`), with clear error messages if Node/npm or the directory are missing.
- **Usage:**

  ```bash
  ./scripts/build_frontend.sh
  ```

---

### 7. `run_quantumvest.sh`

- **Purpose:** Starts the backend (Flask, via `wsgi.py`) and the web frontend (Vite dev server) together for local development, and stops both cleanly on Ctrl+C.
- **Usage:**

  ```bash
  ./scripts/run_quantumvest.sh
  ```

- **Requires:** a Python virtualenv at `venv/` (created automatically if missing) with backend dependencies installed, and Node.js for the frontend. Run `./scripts/setup_quantumvest_env.sh` first if you haven't already.

---

### 8. `run_all_tests.sh`

- **Purpose:** Runs every test suite in the project in one pass: backend (pytest), web-frontend (Jest), mobile-frontend (Jest), AI models (unittest, if test files exist), and blockchain (npm test).
- **Usage:**

  ```bash
  ./scripts/run_all_tests.sh
  ```

---

### 9. `run_backend_tests.sh`

- **Purpose:** Runs just the backend's pytest suite (`code/backend/tests/`).
- **Usage:**

  ```bash
  ./scripts/run_backend_tests.sh
  ```

---

### 10. `maintenance.sh`

- **Purpose:** Automates maintenance tasks — log rotation/archival, backups (database dump + a tarball of code/config), and a system health check (disk/memory/CPU, running processes, Docker containers, database connectivity, and the backend/frontend HTTP endpoints).
- **Usage:**

  ```bash
  ./scripts/maintenance.sh [options]
  ```

- **Options:**
  - `-h, --help` Show help message
  - `-l, --logs` Rotate logs only
  - `-b, --backup` Backup data only
  - `-c, --check` Check system health only
  - `-a, --all` Perform all maintenance tasks (default)

---

### 11. `cicd.sh`

- **Purpose:** Automates CI/CD scaffolding — GitHub Actions workflows, a `release.sh` version-bump/changelog/tag script, and git pre-commit/pre-push hooks.
- **Usage:**

  ```bash
  ./scripts/cicd.sh [options]
  ```

- **Options:**
  - `-h, --help` Show help message
  - `-g, --github-actions` Set up GitHub Actions workflows only
  - `-r, --release` Set up release management only
  - `-v, --version-control` Set up version control hooks only
  - `-a, --all` Set up all CI/CD enhancements (default)

- **Note:** if `.github/workflows/` already contains workflow files (this repo ships with `cicd.yml`), the GitHub Actions step is skipped rather than generating a second, conflicting pipeline. Delete the existing workflow file(s) first if you want this script to (re)generate `ci.yml`/`cd.yml`.

---

## Installation Instructions

1. These scripts live in `scripts/` at the QuantumVest project root.
2. Make sure they're executable:

   ```bash
   chmod +x scripts/*.sh
   ```

3. Run them from the project root as needed, e.g. `./scripts/env_setup.sh`.

> **Note:** Each script verifies it's being run from the QuantumVest project root (by checking for a `README.md` containing "QuantumVest") before doing anything else.
