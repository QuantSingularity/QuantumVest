# CLI Reference

Command-line interface reference for QuantumVest administration, data operations, and development tasks.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Global Options](#global-options)
- [Commands](#commands)
  - [Setup Commands](#setup-commands)
  - [Server Commands](#server-commands)
  - [Database Commands](#database-commands)
  - [Data Pipeline Commands](#data-pipeline-commands)
  - [Model Commands](#model-commands)
  - [Testing Commands](#testing-commands)
  - [Deployment Commands](#deployment-commands)

---

## Overview

QuantumVest provides CLI tools through shell scripts and Python scripts for administration, development, and operational tasks.

### CLI Components

| Component      | Location          | Purpose                            |
| -------------- | ----------------- | ---------------------------------- |
| Setup Scripts  | `scripts/`        | Environment setup and installation |
| Backend CLI    | `code/backend/`   | Database, API, and data operations |
| AI Model CLI   | `code/ai_models/` | Model training and evaluation      |
| DevOps Scripts | `scripts/`        | Deployment and maintenance         |

---

## Installation

No separate CLI installation required. Scripts are available after repository clone.

```bash
git clone https://github.com/quantsingularity/QuantumVest.git
cd QuantumVest
chmod +x scripts/*.sh  # Make scripts executable
```

---

## Global Options

Most scripts support common options:

| Option          | Description            | Example                            |
| --------------- | ---------------------- | ---------------------------------- |
| `--help`        | Show help message      | `./script.sh --help`               |
| `--verbose`     | Enable verbose output  | `./script.sh --verbose`            |
| `--config FILE` | Use custom config file | `./script.sh --config custom.conf` |

---

## Commands

### Setup Commands

#### setup_quantumvest_env.sh

Complete environment setup for QuantumVest.

**Usage**:

```bash
./scripts/setup_quantumvest_env.sh [OPTIONS]
```

**Description**: Installs all dependencies, creates virtual environments, and configures the application.

**What it does**:

- Creates Python virtual environment
- Installs backend dependencies
- Installs frontend dependencies
- Sets up database connections
- Initializes configuration files

**Example**:

```bash
# Standard setup
./scripts/setup_quantumvest_env.sh

# With verbose output
VERBOSE=1 ./scripts/setup_quantumvest_env.sh
```

---

#### env_setup.sh

Environment-specific configuration setup.

**Usage**:

```bash
./scripts/env_setup.sh [environment]
```

**Arguments**:

| Argument    | Description                           | Example   |
| ----------- | ------------------------------------- | --------- |
| environment | Target environment (dev/staging/prod) | `staging` |

**Example**:

```bash
# Setup development environment
./scripts/env_setup.sh dev

# Setup production environment
./scripts/env_setup.sh prod
```

---

### Server Commands

#### run_quantumvest.sh

Start all QuantumVest services.

**Usage**:

```bash
./scripts/run_quantumvest.sh [OPTIONS]
```

**Options**:

| Option            | Description         | Example           |
| ----------------- | ------------------- | ----------------- |
| `--backend-only`  | Start only backend  | `--backend-only`  |
| `--frontend-only` | Start only frontend | `--frontend-only` |
| `--port PORT`     | Custom port         | `--port 8080`     |

**Example**:

```bash
# Start all services
./scripts/run_quantumvest.sh

# Start backend only on port 8000
./scripts/run_quantumvest.sh --backend-only --port 8000
```

---

#### Backend Server (app.py)

Start Flask backend server directly.

**Usage**:

```bash
cd code/backend
source venv/bin/activate
python app.py [OPTIONS]
```

**Environment Variables**:

| Variable   | Default     | Description             |
| ---------- | ----------- | ----------------------- |
| FLASK_APP  | app.py      | Application entry point |
| FLASK_ENV  | development | Environment mode        |
| FLASK_HOST | 0.0.0.0     | Server host             |
| FLASK_PORT | 5000        | Server port             |

**Example**:

```bash
# Development server
FLASK_ENV=development python app.py

# Production with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

### Database Commands

#### migrate_db.py

Database migration and initialization.

**Usage**:

```bash
cd code/backend
source venv/bin/activate
python migrate_db.py [COMMAND]
```

**Commands**:

| Command     | Description         | Example                          |
| ----------- | ------------------- | -------------------------------- |
| `init`      | Initialize database | `python migrate_db.py init`      |
| `migrate`   | Create migration    | `python migrate_db.py migrate`   |
| `upgrade`   | Apply migrations    | `python migrate_db.py upgrade`   |
| `downgrade` | Revert migration    | `python migrate_db.py downgrade` |
| `seed`      | Seed default data   | `python migrate_db.py seed`      |

**Examples**:

```bash
# Initialize database
python migrate_db.py init

# Create migration for model changes
python migrate_db.py migrate -m "Add portfolio metrics table"

# Apply all pending migrations
python migrate_db.py upgrade

# Revert last migration
python migrate_db.py downgrade

# Seed database with default assets
python migrate_db.py seed
```

---

### Data Pipeline Commands

#### Data Fetcher

Fetch market data for assets.

**Usage**:

```bash
cd code/backend
python -m data_pipeline.data_fetcher [OPTIONS]
```

**Options**:

| Option            | Description               | Example             |
| ----------------- | ------------------------- | ------------------- |
| `--symbol SYMBOL` | Asset symbol              | `--symbol AAPL`     |
| `--type TYPE`     | Asset type (stock/crypto) | `--type stock`      |
| `--days DAYS`     | Historical days           | `--days 365`        |
| `--output FILE`   | Output file               | `--output data.csv` |

**Examples**:

```bash
# Fetch Apple stock data for 1 year
python -m data_pipeline.data_fetcher --symbol AAPL --type stock --days 365

# Fetch Bitcoin data
python -m data_pipeline.data_fetcher --symbol BTC --type crypto --days 180

# Fetch and save to file
python -m data_pipeline.data_fetcher --symbol TSLA --days 730 --output tsla_data.csv
```

---

#### Stock API

Direct stock data operations.

**Usage**:

```bash
python -c "from data_pipeline.stock_api import StockDataFetcher; \
fetcher = StockDataFetcher(); \
data = fetcher.get_stock_data('AAPL'); \
print(data)"
```

**Example**:

```bash
# Get current stock price
python -c "from data_pipeline.stock_api import StockDataFetcher; \
print(StockDataFetcher().get_stock_data('AAPL')['price'])"

# Get historical data
python -c "from data_pipeline.stock_api import StockDataFetcher; \
history = StockDataFetcher().get_historical_data('MSFT', period='1y'); \
print(history.head())"
```

---

### Model Commands

#### Train Prediction Model

Train AI prediction models.

**Usage**:

```bash
cd code/ai_models
python train_prediction_model.py [OPTIONS]
```

**Options**:

| Option       | Type   | Required | Default | Description      | Example             |
| ------------ | ------ | -------- | ------- | ---------------- | ------------------- |
| --asset_type | string | No       | stock   | Asset type       | --asset_type crypto |
| --symbol     | string | Yes      | -       | Asset symbol     | --symbol AAPL       |
| --epochs     | int    | No       | 100     | Training epochs  | --epochs 200        |
| --batch_size | int    | No       | 32      | Batch size       | --batch_size 64     |
| --lookback   | int    | No       | 60      | Lookback window  | --lookback 90       |
| --output     | string | No       | models/ | Model output dir | --output trained/   |

**Examples**:

```bash
# Train AAPL stock model
python train_prediction_model.py --symbol AAPL --epochs 150

# Train BTC crypto model with custom params
python train_prediction_model.py \
  --asset_type crypto \
  --symbol BTC \
  --epochs 200 \
  --batch_size 64 \
  --lookback 90

# Train and save to custom location
python train_prediction_model.py --symbol GOOGL --output ./trained_models/
```

---

#### Train Optimization Model

Train portfolio optimization models.

**Usage**:

```bash
cd code/ai_models
python train_optimization_model.py [OPTIONS]
```

**Options**:

| Option            | Description            | Example                            |
| ----------------- | ---------------------- | ---------------------------------- |
| --data_path PATH  | Training data path     | --data_path ../resources/datasets/ |
| --model_type TYPE | Model type (rf/xgb/nn) | --model_type xgb                   |
| --evaluate        | Run evaluation         | --evaluate                         |

**Example**:

```bash
# Train optimization model
python train_optimization_model.py --data_path ../resources/datasets/

# Train with XGBoost
python train_optimization_model.py --model_type xgb --evaluate

# Evaluate existing model
python train_optimization_model.py --evaluate
```

---

#### Data Preprocessing

Preprocess data for model training.

**Usage**:

```bash
cd code/ai_models/training_scripts
python data_preprocessing.py [OPTIONS]
```

**Options**:

| Option          | Description     | Example                 |
| --------------- | --------------- | ----------------------- |
| --input FILE    | Input data file | --input raw_data.csv    |
| --output FILE   | Output file     | --output processed.csv  |
| --features LIST | Feature columns | --features price,volume |

**Example**:

```bash
# Preprocess raw data
python data_preprocessing.py \
  --input ../../resources/datasets/raw_stock_data.csv \
  --output ../../resources/datasets/processed_data.csv

# Select specific features
python data_preprocessing.py \
  --input raw.csv \
  --output processed.csv \
  --features price,volume,ma_50,ma_200
```

---

### Testing Commands

#### run_all_tests.sh

Run complete test suite.

**Usage**:

```bash
./scripts/run_all_tests.sh [OPTIONS]
```

**Options**:

| Option     | Description              | Example    |
| ---------- | ------------------------ | ---------- |
| --coverage | Generate coverage report | --coverage |
| --verbose  | Verbose output           | --verbose  |
| --fast     | Skip slow tests          | --fast     |

**Example**:

```bash
# Run all tests
./scripts/run_all_tests.sh

# Run with coverage
./scripts/run_all_tests.sh --coverage

# Fast test run
./scripts/run_all_tests.sh --fast
```

---

#### run_backend_tests.sh

Run backend tests only.

**Usage**:

```bash
./scripts/run_backend_tests.sh
```

**Example**:

```bash
# Run backend tests
./scripts/run_backend_tests.sh

# Run specific test file
cd code/backend
pytest tests/test_endpoints.py -v

# Run with coverage
pytest --cov=. --cov-report=html
```

---

#### Pytest Commands

Direct pytest usage for backend.

**Usage**:

```bash
cd code/backend
pytest [OPTIONS] [PATH]
```

**Common Options**:

| Option  | Description                   | Example                |
| ------- | ----------------------------- | ---------------------- |
| -v      | Verbose output                | pytest -v              |
| -k EXPR | Run tests matching expression | pytest -k "test_login" |
| --cov   | Coverage report               | pytest --cov=.         |
| -x      | Stop on first failure         | pytest -x              |
| --pdb   | Debug on failure              | pytest --pdb           |

**Examples**:

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_endpoints.py

# Run tests matching pattern
pytest -k "test_portfolio"

# Run with coverage
pytest --cov=. --cov-report=html

# Stop on first failure
pytest -x

# Run in parallel (requires pytest-xdist)
pytest -n auto
```

---

### Deployment Commands

#### deploy.sh

Deploy to environment.

**Usage**:

```bash
./scripts/deploy.sh [environment] [OPTIONS]
```

**Arguments**:

| Argument    | Description        | Example             |
| ----------- | ------------------ | ------------------- |
| environment | Target environment | staging, production |

**Options**:

| Option       | Description          | Example      |
| ------------ | -------------------- | ------------ |
| --skip-tests | Skip test execution  | --skip-tests |
| --no-backup  | Skip database backup | --no-backup  |
| --force      | Force deployment     | --force      |

**Examples**:

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production with tests
./scripts/deploy.sh production

# Force deploy without backup
./scripts/deploy.sh production --force --no-backup
```

---

#### build_frontend.sh

Build frontend for production.

**Usage**:

```bash
./scripts/build_frontend.sh
```

**Example**:

```bash
# Build frontend
./scripts/build_frontend.sh

# The built files will be in web-frontend/build/
```

---

#### lint-all.sh

Run code quality checks.

**Usage**:

```bash
./scripts/lint-all.sh [OPTIONS]
```

**Options**:

| Option       | Description          | Example      |
| ------------ | -------------------- | ------------ |
| --fix        | Auto-fix issues      | --fix        |
| --check-only | Check without fixing | --check-only |

**Example**:

```bash
# Check code quality
./scripts/lint-all.sh

# Auto-fix issues
./scripts/lint-all.sh --fix

# Check only (CI mode)
./scripts/lint-all.sh --check-only
```

---

#### maintenance.sh

System maintenance operations.

**Usage**:

```bash
./scripts/maintenance.sh [COMMAND]
```

**Commands**:

| Command  | Description       | Example  |
| -------- | ----------------- | -------- |
| backup   | Backup database   | backup   |
| restore  | Restore database  | restore  |
| clean    | Clean old logs    | clean    |
| optimize | Optimize database | optimize |

**Examples**:

```bash
# Backup database
./scripts/maintenance.sh backup

# Restore from backup
./scripts/maintenance.sh restore

# Clean old logs
./scripts/maintenance.sh clean

# Optimize database
./scripts/maintenance.sh optimize
```

---

#### dev_workflow.sh

Development workflow automation: linting, tests, code quality checks and documentation generation across the backend, AI models, web-frontend, mobile-frontend and blockchain code.

**Usage**:

```bash
./scripts/dev_workflow.sh [OPTIONS]
```

**Options**:

| Option            | Description                  |
| ----------------- | ---------------------------- |
| `-h`, `--help`    | Show help message            |
| `-l`, `--lint`    | Run linting only             |
| `-t`, `--test`    | Run tests only               |
| `-q`, `--quality` | Run code quality checks only |
| `-d`, `--docs`    | Generate documentation only  |
| `-a`, `--all`     | Run all checks (default)     |

**Examples**:

```bash
# Run every check
./scripts/dev_workflow.sh

# Lint only
./scripts/dev_workflow.sh --lint
```

---

#### cicd.sh

Sets up CI/CD enhancements for the repository: GitHub Actions workflows, release management and version control hooks. Run it from the repository root.

**Usage**:

```bash
./scripts/cicd.sh [OPTIONS]
```

**Options**:

| Option                    | Description                             |
| ------------------------- | --------------------------------------- |
| `-h`, `--help`            | Show help message                       |
| `-g`, `--github-actions`  | Set up GitHub Actions workflows only    |
| `-r`, `--release`         | Set up release management only          |
| `-v`, `--version-control` | Set up version control hooks only       |
| `-a`, `--all`             | Set up all CI/CD enhancements (default) |

**Examples**:

```bash
# Set up everything
./scripts/cicd.sh

# Only the version control hooks
./scripts/cicd.sh --version-control
```

---

## Command Cheat Sheet

### Quick Reference

```bash
# Setup
./scripts/setup_quantumvest_env.sh

# Start services
./scripts/run_quantumvest.sh

# Database operations
cd code/backend && python migrate_db.py upgrade

# Fetch data
python -m data_pipeline.data_fetcher --symbol AAPL --days 365

# Train model
cd code/ai_models && python train_prediction_model.py --symbol AAPL

# Run tests
./scripts/run_all_tests.sh

# Deploy
./scripts/deploy.sh staging

# Lint code
./scripts/lint-all.sh --fix

# Maintenance
./scripts/maintenance.sh backup
```

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied

```bash
chmod +x scripts/*.sh
```

#### 2. Virtual Environment Not Found

```bash
cd code/backend
python3 -m venv venv
source venv/bin/activate
```

#### 3. Module Not Found

```bash
cd code/backend
source venv/bin/activate
pip install -r requirements.txt
```

#### 4. Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string in .env
cat .env | grep DATABASE_URL
```

---

## Next Steps

- **Usage Guide**: See [USAGE.md](USAGE.md) for practical examples
- **API Reference**: Check [API.md](API.md) for REST API usage
- **Developer Guide**: Read [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more issues

---

_For script internals and customization, refer to inline script documentation._
