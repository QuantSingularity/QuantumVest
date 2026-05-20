# QuantumVest

![CI/CD Status](https://img.shields.io/github/actions/workflow/status/quantsingularity/QuantumVest/cicd.yml?branch=main&label=CI/CD&logo=github)
[![Test Coverage](https://img.shields.io/badge/coverage-80%25-yellow)](https://github.com/quantsingularity/QuantumVest/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## AI-Powered Predictive Investment Analytics Platform

QuantumVest is an advanced predictive investment analytics platform that leverages artificial intelligence, blockchain technology, and quantitative finance models to provide retail investors with actionable insights for smarter investment decisions.

<div align="center">
  <img src="docs/images/QuantumVest_dashboard.bmp" alt="QuantumVest Dashboard" width="80%">
</div>

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation and Setup](#installation-and-setup)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

QuantumVest democratizes access to sophisticated investment analytics by providing retail investors with AI-driven predictions and insights previously available only to institutional investors. By combining machine learning algorithms with blockchain data transparency and quantitative finance models, the platform offers comprehensive market analysis, risk assessment, and investment recommendations across various asset classes.

## Project Structure

The project is organized into several main components:

```
QuantumVest/
├── code/                   # Core backend logic, services, and shared utilities
├── docs/                   # Project documentation
├── infrastructure/         # DevOps, deployment, and infra-related code
├── mobile-frontend/        # Mobile application
├── web-frontend/           # Web dashboard
├── scripts/                # Automation, setup, and utility scripts
├── LICENSE                 # License information
└── README.md               # Project overview and instructions
```

## Key Features

### AI-Powered Market Predictions

- **Trend Forecasting**: Advanced time series models for predicting market movements
- **Sentiment Analysis**: NLP processing of news and social media for market sentiment
- **Pattern Recognition**: Identification of chart patterns and trading signals
- **Anomaly Detection**: Early warning system for unusual market behavior
- **Correlation Analysis**: Cross-asset correlation insights for diversification

### Blockchain-Enhanced Analytics

- **On-Chain Data Analysis**: Insights from blockchain transaction patterns
- **Whale Movement Tracking**: Monitoring of large holder activities
- **Smart Money Flow**: Analysis of institutional investor behavior
- **Network Health Metrics**: Blockchain fundamentals assessment
- **DeFi Protocol Analytics**: Yield, TVL, and risk metrics for DeFi investments

### Quantitative Investment Strategies

- **Portfolio Optimization**: Modern Portfolio Theory implementation
- **Risk-Adjusted Returns**: Sharpe, Sortino, and Calmar ratio calculations
- **Monte Carlo Simulations**: Probability-based outcome projections
- **Factor Analysis**: Multi-factor models for investment selection
- **Algorithmic Strategy Backtesting**: Historical performance validation

### Personalized Investment Experience

- **Risk Profiling**: Customized risk tolerance assessment
- **Goal-Based Planning**: Investment recommendations aligned with financial goals
- **Performance Dashboard**: Real-time portfolio tracking and analysis
- **Scenario Testing**: "What-if" analysis for different market conditions
- **Automated Alerts**: Notifications for significant market events or opportunities

## Technology Stack

### Frontend

- **Framework**: React.js with TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS, Styled Components
- **Data Visualization**: D3.js, Recharts, TradingView
- **Web3 Integration**: ethers.js, web3.js

### Backend

- **API Framework**: FastAPI, Flask
- **Data Processing**: Pandas, NumPy, SciPy
- **Task Queue**: Celery, Redis
- **Authentication**: JWT, OAuth2
- **API Documentation**: Swagger, ReDoc

### AI/ML

- **Frameworks**: TensorFlow, PyTorch, scikit-learn
- **Time Series Models**: ARIMA, LSTM, Prophet
- **NLP**: BERT, Transformers, spaCy
- **Feature Engineering**: Feature-tools, tsfresh
- **Model Serving**: MLflow, TensorFlow Serving

### Blockchain

- **Networks**: Ethereum, Binance Smart Chain
- **Data Indexing**: The Graph, Dune Analytics
- **Smart Contracts**: Solidity (for data collection)
- **Web3 Libraries**: web3.py, ethers.js
- **Oracles**: Chainlink (for market data)

### Data Storage

- **Relational DB**: PostgreSQL
- **Time Series DB**: InfluxDB, TimescaleDB
- **Caching**: Redis
- **Object Storage**: AWS S3, MinIO
- **Data Warehouse**: Snowflake, BigQuery

### DevOps

- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana
- **Infrastructure as Code**: Terraform

## Architecture

QuantumVest follows a modular microservices architecture with the following components:

```
QuantumVest/
├── Frontend Layer
│   ├── User Interface
│   ├── Data Visualization
│   ├── Authentication
│   └── Web3 Integration
├── Backend Services
│   ├── API Gateway
│   ├── User Service
│   ├── Analytics Service
│   ├── Notification Service
│   └── Authentication Service
├── AI Engine
│   ├── Prediction Models
│   ├── Sentiment Analysis
│   ├── Pattern Recognition
│   └── Risk Assessment
├── Blockchain Layer
│   ├── On-Chain Data Collector
│   ├── Whale Tracker
│   ├── Smart Money Analyzer
│   └── Network Health Monitor
├── Quantitative Engine
│   ├── Portfolio Optimizer
│   ├── Risk Calculator
│   ├── Strategy Backtester
│   └── Monte Carlo Simulator
└── Data Layer
    ├── Market Data
    ├── User Data
    ├── Model Training Data
    └── Blockchain Data
```

## Installation and Setup

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- Docker and Docker Compose
- PostgreSQL
- Redis

### Quick Start with Setup Script

```bash
# Clone the repository
git clone https://github.com/quantsingularity/QuantumVest.git
cd QuantumVest

# Run the setup script
./setup_quantumvest_env.sh

# Start the application
./run_quantumvest.sh
```

### Manual Setup

1. Clone the repository:

```bash
git clone https://github.com/quantsingularity/QuantumVest.git
cd QuantumVest
```

2. Install frontend dependencies:

```bash
cd code/frontend
npm install
```

3. Install backend dependencies:

```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Install blockchain dependencies:

```bash
cd ../blockchain
npm install
```

5. Set up environment variables:
   - Create `.env` files in both frontend and backend directories based on the provided `.env.example` files

6. Start the services:

```bash
# Start database and Redis
docker-compose up -d

# Start backend
cd ../backend
uvicorn main:app --reload

# Start frontend
cd ../frontend
npm start
```

## Testing

The project maintains comprehensive test coverage across all components to ensure reliability and accuracy.

### Test Coverage

| Component              | Coverage | Status |
| ---------------------- | -------- | ------ |
| Frontend Components    | 78%      | ✅     |
| Backend Services       | 85%      | ✅     |
| AI Models              | 82%      | ✅     |
| Blockchain Integration | 75%      | ✅     |
| Quantitative Engine    | 83%      | ✅     |
| Data Processing        | 79%      | ✅     |
| Overall                | 80%      | ✅     |

### Unit Tests

- Frontend component tests with Jest and React Testing Library
- Backend API and service tests with pytest
- AI model validation tests
- Blockchain integration tests

### Integration Tests

- End-to-end API tests
- Data pipeline tests
- Cross-service workflow tests
- User journey tests

### Performance Tests

- Load testing for API endpoints
- Model inference performance tests
- Database query optimization tests
- Real-time data processing tests

### Running Tests

```bash
# Run frontend tests
cd code/frontend
npm test

# Run backend tests
cd ../backend
pytest

# Run AI model tests
cd ../ai_models
python -m unittest discover

# Run all tests
./run_all_tests.sh
```

## CI/CD Pipeline

QuantumVest uses GitHub Actions for continuous integration and deployment:

| Stage                | Control Area                    | Institutional-Grade Detail                                                              |
| :------------------- | :------------------------------ | :-------------------------------------------------------------------------------------- |
| **Formatting Check** | Change Triggers                 | Enforced on all `push` and `pull_request` events to `main` and `develop`                |
|                      | Manual Oversight                | On-demand execution via controlled `workflow_dispatch`                                  |
|                      | Source Integrity                | Full repository checkout with complete Git history for auditability                     |
|                      | Python Runtime Standardization  | Python 3.10 with deterministic dependency caching                                       |
|                      | Backend Code Hygiene            | `autoflake` to detect unused imports/variables using non-mutating diff-based validation |
|                      | Backend Style Compliance        | `black --check` to enforce institutional formatting standards                           |
|                      | Non-Intrusive Validation        | Temporary workspace comparison to prevent unauthorized source modification              |
|                      | Node.js Runtime Control         | Node.js 18 with locked dependency installation via `npm ci`                             |
|                      | Web Frontend Formatting Control | Prettier checks for web-facing assets                                                   |
|                      | Mobile Frontend Formatting      | Prettier enforcement for mobile application codebases                                   |
|                      | Documentation Governance        | Repository-wide Markdown formatting enforcement                                         |
|                      | Infrastructure Configuration    | Prettier validation for YAML/YML infrastructure definitions                             |
|                      | Compliance Gate                 | Any formatting deviation fails the pipeline and blocks merge                            |

## Documentation

| Document                    | Path                 | Description                                                    |
| :-------------------------- | :------------------- | :------------------------------------------------------------- |
| **README**                  | `README.md`          | High-level overview, project scope, and repository entry point |
| **Installation Guide**      | `INSTALLATION.md`    | Step-by-step installation and environment setup                |
| **API Reference**           | `API.md`             | Detailed documentation for all API endpoints                   |
| **CLI Reference**           | `CLI.md`             | Command-line interface usage, commands, and examples           |
| **User Guide**              | `USAGE.md`           | Comprehensive end-user guide, workflows, and examples          |
| **Architecture Overview**   | `ARCHITECTURE.md`    | System architecture, components, and design rationale          |
| **Configuration Guide**     | `CONFIGURATION.md`   | Configuration options, environment variables, and tuning       |
| **Feature Matrix**          | `FEATURE_MATRIX.md`  | Feature coverage, capabilities, and roadmap alignment          |
| **Contributing Guidelines** | `CONTRIBUTING.md`    | Contribution workflow, coding standards, and PR requirements   |
| **Troubleshooting**         | `TROUBLESHOOTING.md` | Common issues, diagnostics, and remediation steps              |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
