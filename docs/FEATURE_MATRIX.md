# Feature Matrix

Comprehensive catalog of QuantumVest features with module mapping, CLI/API availability, and version information.

## Table of Contents

- [AI & Machine Learning Features](#ai--machine-learning-features)
- [Market Data Features](#market-data-features)
- [Portfolio Management Features](#portfolio-management-features)
- [Risk Management Features](#risk-management-features)
- [Blockchain Features](#blockchain-features)
- [Authentication & Security Features](#authentication--security-features)
- [Real-Time Features](#real-time-features)
- [Analytics & Reporting Features](#analytics--reporting-features)
- [Integration Features](#integration-features)

---

## AI & Machine Learning Features

| Feature                       | Short description                                           | Module / File                           | CLI flag / API                                       | Example (path)                                                       | Notes                          |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| **LSTM Price Prediction**     | Long Short-Term Memory neural network for price forecasting | `data_pipeline/lstm_model.py`           | API: `/predictions/stocks/{symbol}`                  | [examples/ai-prediction.md](examples/ai-prediction.md)               | Supports 1d, 1w, 1m timeframes |
| **Sentiment Analysis**        | NLP-based market sentiment from news and social media       | `ai_models/advanced_ai_models.py`       | API: `/predictions/{symbol}/sentiment`               | -                                                                    | Requires news API keys         |
| **Pattern Recognition**       | Technical chart pattern identification                      | `ai_models/advanced_ai_models.py`       | API: `/predictions/patterns/{symbol}`                | -                                                                    | Detects 20+ patterns           |
| **Anomaly Detection**         | Unusual market behavior detection                           | `data_pipeline/feature_engineering.py`  | API: `/market/anomalies`                             | -                                                                    | Real-time monitoring           |
| **Model Training**            | Train custom prediction models                              | `ai_models/train_prediction_model.py`   | CLI: `train_prediction_model.py --symbol AAPL`       | [examples/model-training.md](examples/portfolio-management.md)       | Requires historical data       |
| **Model Evaluation**          | Evaluate model performance and accuracy                     | `data_pipeline/model_evaluator.py`      | CLI: `python train_optimization_model.py --evaluate` | -                                                                    | Generates metrics reports      |
| **Feature Engineering**       | Automated feature extraction from raw data                  | `data_pipeline/feature_engineering.py`  | Library only                                         | -                                                                    | 100+ technical indicators      |
| **Portfolio Optimization AI** | AI-powered portfolio rebalancing                            | `ai_models/train_optimization_model.py` | API: `/portfolios/{id}/optimize`                     | [examples/portfolio-management.md](examples/portfolio-management.md) | Uses ML for optimization       |

---

## Market Data Features

| Feature                  | Short description                                                 | Module / File                                 | CLI flag / API                                                    | Example (path)                                              | Notes                    |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| **Stock Data Fetching**  | Real-time and historical stock market data                        | `data_pipeline/stock_api.py`                  | API: `/data/stocks/{symbol}` CLI: `data_fetcher.py --symbol AAPL` | [examples/market-data.md](examples/portfolio-management.md) | Supports major exchanges |
| **Crypto Data Fetching** | Real-time cryptocurrency market data                              | `data_pipeline/crypto_api.py`                 | API: `/data/crypto/{symbol}`                                      | [examples/crypto-data.md](examples/portfolio-management.md) | 1000+ cryptocurrencies   |
| **Asset Search**         | Search across all asset types                                     | `api_routes.py`                               | API: `/assets/search?q=apple`                                     | -                                                           | Fuzzy matching enabled   |
| **Historical Data**      | Historical price and volume data                                  | `data_pipeline/stock_api.py`, `crypto_api.py` | API: `/data/{type}/{symbol}/history`                              | -                                                           | Up to 10 years history   |
| **Multi-Asset Support**  | Stocks, crypto, ETFs, bonds, commodities, forex, options, futures | `models.py` (AssetType enum)                  | API: All `/data/*` endpoints                                      | -                                                           | 8 asset types            |
| **Data Storage**         | Persistent storage of market data                                 | `data_pipeline/data_storage.py`               | Background service                                                | -                                                           | Time-series optimized    |
| **Data Pipeline**        | Automated data collection and processing                          | `data_pipeline/data_fetcher.py`               | CLI: `data_fetcher.py`                                            | -                                                           | Runs on schedule         |

---

## Portfolio Management Features

| Feature                    | Short description                        | Module / File                                          | CLI flag / API                            | Example (path)                                                       | Notes                    |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------- | ------------------------ |
| **Portfolio Creation**     | Create and manage multiple portfolios    | `portfolio_service.py`                                 | API: `POST /portfolios`                   | [examples/portfolio-management.md](examples/portfolio-management.md) | Unlimited portfolios     |
| **Position Tracking**      | Track individual asset positions         | `models.py` (Position model)                           | API: `/portfolios/{id}/positions`         | [examples/portfolio-management.md](examples/portfolio-management.md) | Real-time valuation      |
| **Transaction Management** | Record buy/sell/dividend transactions    | `models.py` (Transaction model)                        | API: `POST /portfolios/{id}/transactions` | -                                                                    | Full transaction history |
| **Performance Analytics**  | Portfolio performance metrics            | `portfolio_service.py`                                 | API: `/portfolios/{id}/analytics`         | [examples/portfolio-management.md](examples/portfolio-management.md) | 20+ metrics              |
| **Multi-Currency Support** | Support for multiple base currencies     | `models.py` (Portfolio.currency)                       | API: `/portfolios` (currency param)       | -                                                                    | 50+ currencies           |
| **Cost Basis Tracking**    | Track purchase cost and unrealized gains | `portfolio_service.py`                                 | API: `/portfolios/{id}`                   | -                                                                    | FIFO, LIFO, Average      |
| **Dividend Tracking**      | Track dividend income                    | `models.py` (Transaction.DIVIDEND)                     | API: `/portfolios/{id}/dividends`         | -                                                                    | Automatic recording      |
| **Portfolio Optimization** | Modern Portfolio Theory optimization     | `financial_services.py` (PortfolioOptimizationService) | API: `POST /portfolios/{id}/optimize`     | [examples/portfolio-management.md](examples/portfolio-management.md) | Risk-return optimization |

---

## Risk Management Features

| Feature                       | Short description                                     | Module / File                                         | CLI flag / API                           | Example (path)                                         | Notes                    |
| ----------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ | ------------------------ |
| **Value at Risk (VaR)**       | Calculate portfolio VaR at multiple confidence levels | `risk_management.py` (RiskManagementService)          | API: `/portfolios/{id}/risk`             | [examples/risk-analysis.md](examples/risk-analysis.md) | 95%, 99% confidence      |
| **Expected Shortfall (CVaR)** | Conditional Value at Risk calculation                 | `risk_management.py`                                  | API: `/portfolios/{id}/risk`             | [examples/risk-analysis.md](examples/risk-analysis.md) | Tail risk measure        |
| **Sharpe Ratio**              | Risk-adjusted return calculation                      | `financial_services.py` (PerformanceAnalyticsService) | API: `/portfolios/{id}/metrics`          | -                                                      | Industry standard        |
| **Sortino Ratio**             | Downside risk-adjusted return                         | `financial_services.py`                               | API: `/portfolios/{id}/metrics`          | -                                                      | Focus on downside        |
| **Beta Calculation**          | Market correlation coefficient                        | `risk_management.py`                                  | API: `/portfolios/{id}/risk`             | -                                                      | vs. market index         |
| **Volatility Analysis**       | Historical and implied volatility                     | `risk_management.py`                                  | API: `/portfolios/{id}/risk`             | [examples/risk-analysis.md](examples/risk-analysis.md) | Standard deviation       |
| **Stress Testing**            | Portfolio stress under scenarios                      | `risk_management.py`                                  | API: `POST /portfolios/{id}/stress-test` | [examples/risk-analysis.md](examples/risk-analysis.md) | Multiple scenarios       |
| **Monte Carlo Simulation**    | Probability-based outcome projections                 | `financial_services.py`                               | API: `/portfolios/{id}/simulate`         | -                                                      | 10,000 simulations       |
| **Correlation Analysis**      | Cross-asset correlation matrix                        | `risk_management.py`                                  | API: `/portfolios/{id}/correlations`     | -                                                      | Diversification insights |
| **Exposure Tracking**         | Sector, geography, asset type exposure                | `financial_services.py`                               | API: `/portfolios/{id}/exposure`         | -                                                      | Risk concentration       |

---

## Blockchain Features

| Feature                        | Short description                                     | Module / File                | CLI flag / API                         | Example (path)                                             | Notes                   |
| ------------------------------ | ----------------------------------------------------- | ---------------------------- | -------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| **On-Chain Data Analysis**     | Analyze blockchain transaction patterns               | `blockchain_service.py`      | API: `/blockchain/metrics/{chain}`     | [examples/blockchain.md](examples/portfolio-management.md) | ETH, BSC supported      |
| **Whale Movement Tracking**    | Monitor large holder activities                       | `blockchain_service.py`      | API: `/blockchain/whales/{asset}`      | [examples/blockchain.md](examples/portfolio-management.md) | Configurable threshold  |
| **Smart Money Flow**           | Institutional investor behavior analysis              | `blockchain_service.py`      | API: `/blockchain/smart-money/{asset}` | -                                                          | Top 100 wallets         |
| **Network Health Metrics**     | Blockchain fundamentals (active addresses, tx volume) | `blockchain_service.py`      | API: `/blockchain/health/{chain}`      | -                                                          | Real-time metrics       |
| **DeFi Protocol Analytics**    | Yield, TVL, risk metrics for DeFi                     | `blockchain_service.py`      | API: `/blockchain/defi/{protocol}`     | -                                                          | 50+ protocols           |
| **Smart Contract Interaction** | Read blockchain smart contracts                       | `blockchain/contracts/*.sol` | Library only                           | -                                                          | Data collection only    |
| **Web3 Integration**           | Web3 wallet connection support                        | `web-frontend/src/services/` | Frontend only                          | -                                                          | MetaMask, WalletConnect |

---

## Authentication & Security Features

| Feature                       | Short description                                   | Module / File                                        | CLI flag / API                      | Example (path)                                                 | Notes                                                      |
| ----------------------------- | --------------------------------------------------- | ---------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| **JWT Authentication**        | JSON Web Token-based authentication                 | `auth.py` (AuthService)                              | API: `/auth/login`, `/auth/refresh` | [examples/authentication.md](examples/portfolio-management.md) | Access + refresh tokens                                    |
| **User Registration**         | New user account creation                           | `auth.py`                                            | API: `POST /auth/register`          | [examples/authentication.md](examples/portfolio-management.md) | Email verification                                         |
| **Password Hashing**          | Secure password storage with bcrypt                 | `models.py` (User.set_password)                      | Library only                        | -                                                              | bcrypt + salt                                              |
| **Role-Based Access Control** | User roles and permissions                          | `models.py` (UserRole enum), `auth.py`               | API: All authenticated endpoints    | -                                                              | 5 roles: admin, portfolio_manager, analyst, client, viewer |
| **Rate Limiting**             | API request rate limiting                           | `auth.py` (@rate_limit decorator)                    | All API endpoints                   | -                                                              | Per-user tier limits                                       |
| **Two-Factor Authentication** | 2FA support (database ready)                        | `models.py` (User.two_factor_enabled)                | Not implemented yet                 | -                                                              | Future feature                                             |
| **Account Locking**           | Lock account after failed login attempts            | `models.py` (User.account_locked_until)              | API: `/auth/login`                  | -                                                              | 5 attempts = 30min lock                                    |
| **Audit Logging**             | Track all user actions                              | `models.py` (AuditLog), `security.py` (AuditService) | Background service                  | -                                                              | Compliance requirement                                     |
| **KYC/AML Status**            | Know Your Customer / Anti-Money Laundering tracking | `models.py` (User.kyc_status, aml_status)            | API: `/auth/profile`                | -                                                              | Regulatory compliance                                      |
| **Encryption Service**        | Data encryption/decryption                          | `security.py` (EncryptionService)                    | Library only                        | -                                                              | AES-256                                                    |
| **Threat Detection**          | Suspicious activity detection                       | `security.py` (ThreatDetectionService)               | Background service                  | -                                                              | ML-based anomalies                                         |

---

## Real-Time Features

| Feature                  | Short description                      | Module / File                                               | CLI flag / API                  | Example (path)                                            | Notes                 |
| ------------------------ | -------------------------------------- | ----------------------------------------------------------- | ------------------------------- | --------------------------------------------------------- | --------------------- |
| **WebSocket Streaming**  | Real-time data streaming to clients    | `websocket_service.py`                                      | WS: `/ws`                       | [examples/websocket.md](examples/portfolio-management.md) | Live price updates    |
| **Price Alerts**         | Automated price alert notifications    | `models.py` (Alert), `financial_services.py` (AlertService) | API: `/alerts`                  | -                                                         | Email/SMS/push        |
| **Portfolio Updates**    | Real-time portfolio value updates      | `websocket_service.py`                                      | WS: Channel 'portfolio_updates' | -                                                         | Live P&L              |
| **Market Notifications** | Significant market event notifications | `financial_services.py` (AlertService)                      | API: `/alerts`                  | -                                                         | Configurable triggers |
| **Live Dashboard**       | Real-time dashboard data feed          | Frontend + WebSocket                                        | Frontend only                   | -                                                         | Auto-refresh          |

---

## Analytics & Reporting Features

| Feature                  | Short description                       | Module / File                                         | CLI flag / API                      | Example (path) | Notes                 |
| ------------------------ | --------------------------------------- | ----------------------------------------------------- | ----------------------------------- | -------------- | --------------------- |
| **Performance Reports**  | Comprehensive performance analytics     | `financial_services.py` (PerformanceAnalyticsService) | API: `/portfolios/{id}/reports`     | -              | PDF/Excel export      |
| **Tax Reporting**        | Capital gains/loss reports              | `financial_services.py`                               | API: `/portfolios/{id}/tax-report`  | -              | US tax year support   |
| **Benchmark Comparison** | Compare portfolio vs. benchmarks        | `financial_services.py`                               | API: `/portfolios/{id}/benchmark`   | -              | S&P500, NASDAQ, etc.  |
| **Factor Analysis**      | Multi-factor investment analysis        | `services/quant_analysis.py`                          | API: `/portfolios/{id}/factors`     | -              | Fama-French factors   |
| **Attribution Analysis** | Performance attribution by asset/sector | `financial_services.py`                               | API: `/portfolios/{id}/attribution` | -              | Contribution analysis |
| **Custom Reports**       | User-defined report templates           | `financial_services.py`                               | API: `/reports/custom`              | -              | Template engine       |

---

## Integration Features

| Feature                | Short description                        | Module / File           | CLI flag / API                 | Example (path)   | Notes                          |
| ---------------------- | ---------------------------------------- | ----------------------- | ------------------------------ | ---------------- | ------------------------------ |
| **REST API**           | Comprehensive RESTful API                | `api_routes.py`         | API: All `/api/v1/*` endpoints | [API.md](API.md) | OpenAPI/Swagger docs           |
| **Webhooks**           | Event-driven webhooks                    | `api_routes.py`         | API: `/webhooks`               | -                | Custom event subscriptions     |
| **Data Export**        | Export data in multiple formats          | `financial_services.py` | API: `/export/{format}`        | -                | CSV, JSON, Excel               |
| **Third-Party APIs**   | Integration with external data providers | `data_pipeline/*.py`    | Configuration                  | -                | Alpha Vantage, CoinGecko, etc. |
| **Celery Task Queue**  | Asynchronous background tasks            | Background service      | Configuration                  | -                | Data fetching, model training  |
| **Mobile App Support** | React Native mobile application          | `mobile-frontend/`      | Mobile app                     | -                | iOS and Android                |

---

## Feature Availability by Version

| Feature Category     | Free Tier       | Standard Tier    | Premium Tier          | Enterprise       |
| -------------------- | --------------- | ---------------- | --------------------- | ---------------- |
| Basic Predictions    | ✅ Limited      | ✅ Full          | ✅ Full               | ✅ Full          |
| Advanced AI Models   | ❌              | ✅               | ✅                    | ✅               |
| Portfolio Management | ✅ 3 portfolios | ✅ 10 portfolios | ✅ Unlimited          | ✅ Unlimited     |
| Risk Management      | ✅ Basic        | ✅ Full          | ✅ Full + Simulations | ✅ Full + Custom |
| Blockchain Analytics | ❌              | ✅               | ✅                    | ✅               |
| Real-Time Data       | ❌ 15min delay  | ✅ Real-time     | ✅ Real-time          | ✅ Real-time     |
| API Rate Limit       | 100/hour        | 1,000/hour       | 10,000/hour           | Unlimited        |
| Historical Data      | 1 year          | 5 years          | 10 years              | Unlimited        |
| Custom Reports       | ❌              | ✅               | ✅                    | ✅               |
| Webhooks             | ❌              | ❌               | ✅                    | ✅               |
| Priority Support     | ❌              | ✅               | ✅                    | ✅ Dedicated     |

---

## Feature Roadmap

### Planned Features (Future Versions)

| Feature                       | Target Version | Status      | Priority |
| ----------------------------- | -------------- | ----------- | -------- |
| Options Trading Support       | v1.1           | Planned     | High     |
| Futures Contract Analysis     | v1.1           | Planned     | Medium   |
| Advanced Backtesting Engine   | v1.2           | Planned     | High     |
| Social Trading / Copy Trading | v1.3           | Planned     | Medium   |
| Robo-Advisor                  | v1.2           | In Progress | High     |
| AI Portfolio Manager          | v1.3           | Planned     | High     |
| Mobile Trading Integration    | v1.2           | Planned     | Medium   |
| Voice Command Interface       | v2.0           | Planned     | Low      |
| AR/VR Dashboard               | v2.0           | Research    | Low      |

---

## Feature Dependencies

### External Dependencies

| Feature             | Required Service  | Configuration                  |
| ------------------- | ----------------- | ------------------------------ |
| Stock Data          | Alpha Vantage API | `ALPHA_VANTAGE_API_KEY`        |
| Crypto Data         | CoinGecko API     | `COINGECKO_API_KEY` (optional) |
| Blockchain Data     | Ethereum/BSC Node | `ETHEREUM_NODE_URL`            |
| Email Notifications | SMTP Server       | Email config in `.env`         |
| SMS Notifications   | Twilio            | `TWILIO_*` config              |
| Cloud Storage       | AWS S3 / MinIO    | `S3_*` config                  |

---

## Feature Testing Status

| Feature Category     | Unit Tests | Integration Tests | E2E Tests  | Coverage |
| -------------------- | ---------- | ----------------- | ---------- | -------- |
| Authentication       | ✅         | ✅                | ✅         | 95%      |
| Portfolio Management | ✅         | ✅                | ✅         | 90%      |
| Market Data          | ✅         | ✅                | ⚠️ Partial | 85%      |
| AI Predictions       | ✅         | ✅                | ❌         | 80%      |
| Risk Management      | ✅         | ✅                | ❌         | 85%      |
| Blockchain           | ✅         | ⚠️ Partial        | ❌         | 75%      |
| WebSocket            | ✅         | ⚠️ Partial        | ❌         | 70%      |
| API Endpoints        | ✅         | ✅                | ✅         | 88%      |

---

## Platform Support

| Platform             | Web | Mobile (iOS) | Mobile (Android) | API | CLI        |
| -------------------- | --- | ------------ | ---------------- | --- | ---------- |
| Authentication       | ✅  | ✅           | ✅               | ✅  | ❌         |
| Portfolio Management | ✅  | ✅           | ✅               | ✅  | ⚠️ Limited |
| Market Data          | ✅  | ✅           | ✅               | ✅  | ✅         |
| AI Predictions       | ✅  | ✅           | ✅               | ✅  | ❌         |
| Risk Analysis        | ✅  | ⚠️ Limited   | ⚠️ Limited       | ✅  | ❌         |
| Blockchain           | ✅  | ❌           | ❌               | ✅  | ❌         |
| Admin Features       | ✅  | ❌           | ❌               | ✅  | ✅         |

---

## Feature Documentation

For detailed documentation on each feature:

- **AI Features**: See [code/ai_models/README.md](../code/ai_models/README.md)
- **API Features**: See [API.md](API.md)
- **CLI Features**: See [CLI.md](CLI.md)
- **Blockchain Features**: See [code/blockchain/README.md](../code/blockchain/README.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)

---

_Feature matrix last updated: December 2024 | Version 1.0.0._
