# Installation Guide

Complete installation instructions for QuantumVest across different environments and deployment scenarios.

## Table of Contents

- [System Prerequisites](#system-prerequisites)
- [Installation Methods](#installation-methods)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Mobile Setup](#mobile-setup)
- [Database Configuration](#database-configuration)
- [Blockchain Setup](#blockchain-setup)
- [Verification](#verification)

---

## System Prerequisites

### Required Software

| Component  | Minimum Version | Recommended | Purpose                     |
| ---------- | --------------- | ----------- | --------------------------- |
| Python     | 3.8             | 3.11+       | Backend runtime             |
| Node.js    | 14.0            | 18.0+       | Frontend/mobile build       |
| npm        | 6.0             | 8.0+        | Package management          |
| PostgreSQL | 12.0            | 14.0+       | Primary database            |
| Redis      | 5.0             | 7.0+        | Caching & task queue        |
| Docker     | 20.0            | 24.0+       | Containerization (optional) |
| Git        | 2.20            | 2.40+       | Version control             |

### Optional Components

| Component     | Version | Purpose                  |
| ------------- | ------- | ------------------------ |
| Kubernetes    | 1.20+   | Production orchestration |
| Terraform     | 1.0+    | Infrastructure as Code   |
| Ansible       | 2.10+   | Configuration management |
| Ethereum Node | Latest  | Blockchain data access   |

### System Resources

**Minimum** (Development):

- CPU: 2 cores
- RAM: 4 GB
- Disk: 10 GB free space

**Recommended** (Production):

- CPU: 8+ cores
- RAM: 16+ GB
- Disk: 100+ GB SSD
- Network: 100+ Mbps

---

## Installation Methods

QuantumVest supports multiple installation methods to suit different use cases.

### Method 1: Automated Setup Script (Recommended)

The fastest way to get started. This script handles all dependencies and configuration.

```bash
# Clone the repository
git clone https://github.com/quantsingularity/QuantumVest.git
cd QuantumVest

# Run the setup script
./scripts/setup_quantumvest_env.sh

# Start the application
./scripts/run_quantumvest.sh
```

The script will:

- Create Python virtual environments
- Install all dependencies
- Set up database connections
- Configure environment variables
- Initialize default data

### Method 2: Docker Compose (Containerized)

Best for production-like environments and easy deployment.

```bash
# Clone the repository
git clone https://github.com/quantsingularity/QuantumVest.git
cd QuantumVest

# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Docker Compose will start:

- Backend API server (Flask)
- PostgreSQL database
- Redis cache
- Frontend web server
- Monitoring services

### Method 3: Manual Installation

For developers who need full control over the setup process.

See detailed steps in the sections below.

### Method 4: Kubernetes Deployment

For production cluster deployment.

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/base/

# Or use Helm chart
helm install quantumvest infrastructure/helm/quantumvest/
```

See [Infrastructure Guide](../infrastructure/README.md) for details.

---

## Backend Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/quantsingularity/QuantumVest.git
cd QuantumVest/code/backend
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

**Note**: Installation may take 10-15 minutes due to large ML libraries (TensorFlow, PyTorch).

### Step 4: Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/quantumvest
SQLALCHEMY_DATABASE_URI=postgresql://user:password@localhost:5432/quantumvest

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key

# API Keys
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
COINGECKO_API_KEY=your-coingecko-key
FINNHUB_API_KEY=your-finnhub-key

# Optional: Blockchain
ETHEREUM_NODE_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
BSC_NODE_URL=https://bsc-dataseed.binance.org/

# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
```

### Step 5: Initialize Database

```bash
# Create database tables
python migrate_db.py

# Or using Flask-Migrate
flask db upgrade
```

### Step 6: Start Backend Server

```bash
# Development mode
python app.py

# Or with Gunicorn (production)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Backend will be available at `http://localhost:5000`.

---

## Frontend Setup

### Web Frontend

```bash
cd QuantumVest/web-frontend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env

# Edit .env
nano .env
```

Environment variables:

```bash
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_WS_URL=ws://localhost:5000/ws
REACT_APP_ENVIRONMENT=development
```

Start development server:

```bash
# Development
npm start

# Production build
npm run build

# Serve production build
npm install -g serve
serve -s build -l 3000
```

Frontend will be available at `http://localhost:3000`.

---

## Mobile Setup

### React Native Mobile App

```bash
cd QuantumVest/mobile-frontend

# Install dependencies
npm install

# Install Expo CLI globally
npm install -g expo-cli

# Start Expo development server
npm start
```

Run on devices:

```bash
# Android
npm run android

# iOS (Mac only)
npm run ios

# Web
npm run web
```

---

## Database Configuration

### PostgreSQL Setup

#### Linux (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL shell:

```sql
CREATE DATABASE quantumvest;
CREATE USER quantumvest WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE quantumvest TO quantumvest;
\q
```

#### macOS (PostgreSQL via Homebrew)

```bash
# Install via Homebrew
brew install postgresql@14

# Start PostgreSQL
brew services start postgresql@14

# Create database
createdb quantumvest
```

#### Docker (PostgreSQL container)

```bash
# Run PostgreSQL container
docker run -d \
  --name quantumvest-db \
  -e POSTGRES_DB=quantumvest \
  -e POSTGRES_USER=quantumvest \
  -e POSTGRES_PASSWORD=your-password \
  -p 5432:5432 \
  postgres:14
```

### Redis Setup

#### Linux

```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS (Redis via Homebrew)

```bash
# Install via Homebrew
brew install redis

# Start Redis
brew services start redis
```

#### Docker (Redis container)

```bash
# Run Redis container
docker run -d \
  --name quantumvest-redis \
  -p 6379:6379 \
  redis:7-alpine
```

---

## Blockchain Setup

### Ethereum/BSC Node Access

#### Option 1: Use Public RPC (Free)

```bash
# Ethereum Mainnet
ETHEREUM_NODE_URL=https://eth.public-rpc.com

# BSC Mainnet
BSC_NODE_URL=https://bsc-dataseed.binance.org/
```

## Option 2: Infura (Recommended)

1. Sign up at [infura.io](https://infura.io/)
2. Create a new project
3. Copy your project ID

```bash
ETHEREUM_NODE_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
```

## Option 3: Run Local Node (Advanced)

```bash
# Install Geth (Ethereum)
sudo add-apt-repository -y ppa:ethereum/ethereum
sudo apt update
sudo apt install ethereum

# Start light node
geth --syncmode "light" --http --http.api "eth,net,web3"
```

### Smart Contract Deployment (Optional)

```bash
cd code/blockchain

# Install Truffle
npm install -g truffle

# Compile contracts
truffle compile

# Deploy to testnet
truffle migrate --network ropsten
```

---

## Verification

### Backend Health Check

```bash
# Test backend API
curl http://localhost:5000/api/v1/health

# Expected response:
# {"status":"healthy","timestamp":"2024-12-30T15:00:00Z"}
```

### Frontend Access

Open browser: `http://localhost:3000`

### Database Connection Test

```bash
# From backend directory
python -c "from app import create_app; app = create_app(); print('DB connected!')"
```

### Run Test Suite

```bash
# Backend tests
cd code/backend
pytest

# Frontend tests
cd web-frontend
npm test

# All tests
./scripts/run_all_tests.sh
```

---

## Installation by OS/Platform

### Complete Installation Table

| OS / Platform          | Recommended Install Command                                                                                                           | Notes                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Ubuntu 20.04/22.04** | `sudo apt update && sudo apt install python3.11 python3-pip nodejs npm postgresql redis-server && ./scripts/setup_quantumvest_env.sh` | Most tested platform             |
| **macOS**              | `brew install python@3.11 node postgresql redis && ./scripts/setup_quantumvest_env.sh`                                                | Requires Homebrew                |
| **Windows 10/11**      | Install Python, Node.js, PostgreSQL manually, then run setup script in Git Bash                                                       | WSL2 recommended                 |
| **Docker**             | `docker-compose up -d`                                                                                                                | Cross-platform, production-ready |
| **Kubernetes**         | `helm install quantumvest ./infrastructure/helm/quantumvest/`                                                                         | Requires cluster access          |
| **AWS**                | Use Terraform: `cd infrastructure/terraform && terraform apply`                                                                       | See Infrastructure Guide         |
| **Azure**              | Use ARM templates in `infrastructure/azure/`                                                                                          | See Infrastructure Guide         |
| **GCP**                | Use Terraform GCP module                                                                                                              | See Infrastructure Guide         |

---

## Troubleshooting Installation

### Common Issues

#### 1. Python Module Not Found

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

## 2. Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 PID
```

## 3. Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U quantumvest -d quantumvest -h localhost
```

## 4. npm Install Fails

```bash
# Clear npm cache
npm cache clean --force

# Use legacy peer deps
npm install --legacy-peer-deps
```

See [Troubleshooting Guide](TROUBLESHOOTING.md) for more issues.

---

## Next Steps

After successful installation:

1. **Configure APIs**: Add your API keys for market data providers
2. **Create Admin User**: Use the admin panel or CLI
3. **Explore Documentation**: Read the [Usage Guide](USAGE.md)
4. **Run Examples**: Try examples in [examples/](examples/portfolio-management.md)
5. **Start Developing**: Read [Developer Guide](CONTRIBUTING.md)

---
