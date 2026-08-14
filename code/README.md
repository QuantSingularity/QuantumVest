# QuantumVest — AI-Powered Investment Analytics Platform

A comprehensive investment analytics platform with AI-driven predictions, portfolio optimization, real-time data, and blockchain integration.

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env and set strong passwords for SECRET_KEY, JWT_SECRET_KEY, DB_PASSWORD, REDIS_PASSWORD

# Start services (PostgreSQL + Redis + Backend)
docker compose up -d

# Optional: also bring up the local blockchain (ganache + contract
# migration) so the /api/v1/blockchain/* endpoints have something to
# talk to. See blockchain/README.md for what gets deployed.
docker compose --profile blockchain up -d

# View logs
docker compose logs -f backend
```

The API will be available at `http://localhost:5000/api/v1`

### Option 2: Local Development (SQLite, no Redis required)

```bash
cd backend
cp .env.example .env
./setup.sh          # creates venv and installs deps
source venv/bin/activate
python app.py
```

---

## API Endpoints

| Method | Endpoint                                     | Description                                            |
| ------ | -------------------------------------------- | ------------------------------------------------------ |
| POST   | `/api/v1/auth/register`                      | Register new user                                      |
| POST   | `/api/v1/auth/login`                         | Login                                                  |
| POST   | `/api/v1/auth/logout`                        | Logout                                                 |
| POST   | `/api/v1/auth/refresh`                       | Refresh access token                                   |
| GET    | `/api/v1/auth/profile`                       | Get user profile                                       |
| PUT    | `/api/v1/auth/profile`                       | Update profile                                         |
| POST   | `/api/v1/auth/change-password`               | Change password                                        |
| GET    | `/api/v1/portfolios`                         | List portfolios                                        |
| POST   | `/api/v1/portfolios`                         | Create portfolio                                       |
| GET    | `/api/v1/portfolios/<id>`                    | Portfolio details + holdings                           |
| DELETE | `/api/v1/portfolios/<id>`                    | Delete portfolio                                       |
| POST   | `/api/v1/portfolios/<id>/transactions`       | Add transaction                                        |
| GET    | `/api/v1/portfolios/<id>/transactions`       | List transactions                                      |
| GET    | `/api/v1/portfolios/<id>/performance`        | Performance metrics                                    |
| POST   | `/api/v1/portfolios/<id>/optimize`           | Optimize allocation (Premium)                          |
| GET    | `/api/v1/assets`                             | List all assets                                        |
| GET    | `/api/v1/assets/search?q=AAPL`               | Search assets                                          |
| GET    | `/api/v1/data/stocks/<symbol>`               | Historical stock data                                  |
| GET    | `/api/v1/data/crypto/<symbol>`               | Historical crypto data                                 |
| GET    | `/api/v1/predictions/stocks/<symbol>`        | LSTM stock prediction                                  |
| GET    | `/api/v1/predictions/crypto/<symbol>`        | LSTM crypto prediction                                 |
| GET    | `/api/v1/watchlists`                         | List watchlists                                        |
| POST   | `/api/v1/watchlists`                         | Create watchlist                                       |
| POST   | `/api/v1/watchlists/<id>/items`              | Add asset to watchlist                                 |
| GET    | `/api/v1/health`                             | Health check                                           |
| GET    | `/api/v1/models/status`                      | AI model status                                        |
| GET    | `/api/v1/blockchain/status`                  | Web3 connection + contract status                      |
| GET    | `/api/v1/blockchain/trend`                   | On-chain price trend (+ moving average via `?window=`) |
| GET    | `/api/v1/blockchain/market-data/<ticker>`    | On-chain market data history                           |
| POST   | `/api/v1/blockchain/market-data`             | Record a market data point on-chain (Admin)            |
| GET    | `/api/v1/blockchain/token/balance/<address>` | QVT token balance for a wallet                         |
| GET    | `/api/v1/blockchain/oracle/<asset_address>`  | On-chain oracle price for an asset                     |

### Authentication

All endpoints except `/health`, `/auth/register`, and `/auth/login` require a Bearer token:

```
Authorization: Bearer <access_token>
```

---

## Docker Compose Services

| Service              | Description                                                                     | Port |
| -------------------- | ------------------------------------------------------------------------------- | ---- |
| `backend`            | Flask API server                                                                | 5000 |
| `db`                 | PostgreSQL 15                                                                   | 5432 |
| `redis`              | Redis 7 (cache + broker)                                                        | 6379 |
| `web-frontend`       | Built React/Vite app served via nginx                                           | 3000 |
| `ganache`            | Local dev blockchain (optional, `--profile blockchain`)                         | 8545 |
| `blockchain-migrate` | Deploys the contracts to `ganache` and exits (optional, `--profile blockchain`) | —    |

```bash
# Start the core stack
docker compose up -d

# Also bring up the local blockchain
docker compose --profile blockchain up -d
```

Contract addresses are picked up automatically by the backend from
`blockchain-migrate`'s build output (a shared Docker volume) - no manual
address configuration needed for local use. See `.env.example` if you want
to point the backend at a real (testnet/mainnet) deployment instead.

---

## Architecture

```
quantumvest/
├── backend/
│   ├── app.py                  # Flask app factory
│   ├── config.py               # Environment configs
│   ├── models.py               # SQLAlchemy ORM models
│   ├── auth.py                 # JWT auth + decorators
│   ├── api_routes.py           # REST API blueprint
│   ├── portfolio_service.py    # Portfolio management
│   ├── financial_services.py   # Risk & compliance
│   ├── security.py             # Encryption & audit
│   ├── websocket_service.py    # Real-time WebSocket
│   ├── app/services/blockchain.py  # Web3 gateway to ../blockchain
│   └── data_pipeline/
│       ├── stock_api.py        # Yahoo Finance fetcher
│       ├── crypto_api.py       # CoinGecko fetcher
│       ├── lstm_model.py       # LSTM time-series model
│       ├── prediction_service.py
│       ├── feature_engineering.py
│       └── data_storage.py
├── ai_models/
│   ├── advanced_ai_models.py
│   └── training_scripts/
├── blockchain/                 # Truffle project - see blockchain/README.md
│   ├── contracts/
│   │   ├── DataTracking.sol    # On-chain market data log
│   │   ├── TrendAnalysis.sol   # Chainlink price feed reader
│   │   ├── QuantumVestToken.sol
│   │   ├── PortfolioManager.sol
│   │   ├── QuantumVestStaking.sol
│   │   ├── QuantumVestGovernance.sol
│   │   └── QuantumVestOracle.sol
│   └── migrations/
├── Dockerfile
├── docker-compose.yml
└── docker-compose.dev.yml
```

> Note: this tree predates the backend's later restructuring into an
> `app/` package (see `backend/app/` for the actual current layout -
> `app/services/`, `app/api/v1/routes.py`, `app/models/`, etc.). The
> blockchain-related entries above are current.

## Environment Variables

See `backend/.env.example` for full reference. Key variables:

| Variable                   | Required | Description                                                                                                         |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `SECRET_KEY`               | Yes      | Flask secret (32+ chars)                                                                                            |
| `JWT_SECRET_KEY`           | Yes      | JWT signing key                                                                                                     |
| `DATABASE_URL`             | Yes      | SQLite or PostgreSQL URL                                                                                            |
| `REDIS_URL`                | No       | Falls back to SimpleCache                                                                                           |
| `FLASK_ENV`                | No       | `development`/`production`/`docker`                                                                                 |
| `WEB3_PROVIDER_URI`        | No       | Blockchain RPC endpoint. Falls back to disconnected (blockchain features disabled) if unreachable                   |
| `BLOCKCHAIN_ARTIFACTS_DIR` | No       | Truffle build output dir used to resolve deployed contract addresses. Defaults to `../blockchain/build/contracts`   |
| `BLOCKCHAIN_PRIVATE_KEY`   | No       | Signing key for on-chain writes (DataTracking contract owner). Leave unset to keep blockchain integration read-only |
