# Usage Guide

Learn how to use QuantumVest through practical examples covering common workflows, CLI operations, and library API usage.

## Table of Contents

- [Quick Start Workflow](#quick-start-workflow)
- [Command-Line Usage](#command-line-usage)
- [Python Library API](#python-library-api)
- [REST API Usage](#rest-api-usage)
- [WebSocket Real-Time Data](#websocket-real-time-data)
- [Common Workflows](#common-workflows)

---

## Quick Start Workflow

### 1. User Registration and Authentication

**Via Web Interface**:

1. Navigate to `http://localhost:3000/register`
2. Fill in registration form
3. Verify email (if configured)
4. Log in at `http://localhost:3000/login`

**Via API**:

```python
import requests

# Register new user
response = requests.post('http://localhost:5000/api/v1/auth/register', json={
    'username': 'johndoe',
    'email': 'john@example.com',
    'password': 'SecurePass123!',
    'first_name': 'John',
    'last_name': 'Doe'
})

print(response.json())
# {'success': True, 'user': {...}, 'token': 'eyJ0eXAiOiJKV1QiLCJhbGc...'}

# Login
response = requests.post('http://localhost:5000/api/v1/auth/login', json={
    'username': 'johndoe',
    'password': 'SecurePass123!'
})

auth_data = response.json()
access_token = auth_data['access_token']
```

### 2. Create and Manage Portfolio

```python
# Create portfolio
headers = {'Authorization': f'Bearer {access_token}'}

response = requests.post(
    'http://localhost:5000/api/v1/portfolios',
    headers=headers,
    json={
        'name': 'My Growth Portfolio',
        'description': 'Long-term growth strategy',
        'currency': 'USD',
        'is_default': True
    }
)

portfolio_id = response.json()['portfolio']['id']

# Add positions to portfolio
requests.post(
    f'http://localhost:5000/api/v1/portfolios/{portfolio_id}/positions',
    headers=headers,
    json={
        'asset_symbol': 'AAPL',
        'quantity': 10,
        'purchase_price': 185.50,
        'purchase_date': '2024-12-01'
    }
)
```

### 3. Get AI Predictions

```python
# Get stock prediction
response = requests.get(
    'http://localhost:5000/api/v1/predictions/stock/AAPL',
    headers=headers,
    params={'timeframe': '1w'}
)

prediction = response.json()
print(f"Current: ${prediction['current_price']:.2f}")
print(f"Predicted: ${prediction['predicted_price']:.2f}")
print(f"Confidence: {prediction['confidence_score']:.2%}")
```

---

## Command-Line Usage

### Backend CLI Operations

The backend provides CLI commands for administration and data operations.

#### Database Management

```bash
# Activate virtual environment
cd code/backend
source venv/bin/activate

# Initialize database
python migrate_db.py

# Create admin user
python -c "from app import create_app; from models import db, User, UserRole; \
app = create_app(); \
with app.app_context(): \
    user = User(username='admin', email='admin@example.com', \
                first_name='Admin', last_name='User', role=UserRole.ADMIN); \
    user.set_password('AdminPass123!'); \
    db.session.add(user); \
    db.session.commit(); \
    print('Admin user created')"
```

#### Data Pipeline Operations

```bash
# Fetch historical market data
python -c "from data_pipeline.data_fetcher import DataFetcher; \
fetcher = DataFetcher(); \
fetcher.fetch_stock_data('AAPL', days=365)"

# Train prediction model
python ai_models/train_prediction_model.py --asset AAPL --days 1000

# Run model evaluation
python ai_models/train_optimization_model.py --evaluate
```

#### Model Training

```bash
# Train LSTM model for stock prediction
cd code/ai_models
python train_prediction_model.py --asset_type stock --symbol AAPL --epochs 100

# Train optimization model
python train_optimization_model.py --data_path ../resources/datasets/

# Preprocess training data
cd training_scripts
python data_preprocessing.py --input raw_data.csv --output processed_data.csv
```

### Script Utilities

QuantumVest includes several utility scripts for common tasks.

```bash
# Run all tests
./scripts/run_all_tests.sh

# Run backend tests only
./scripts/run_backend_tests.sh

# Lint all code
./scripts/lint-all.sh

# Build frontend for production
./scripts/build_frontend.sh

# Deploy to environment
./scripts/deploy.sh staging

# Development workflow helper
./scripts/dev_workflow.sh
```

---

## Python Library API

### Using QuantumVest as a Python Library

You can import QuantumVest modules directly in your Python code.

#### Stock Data Fetching

```python
from code.backend.data_pipeline.stock_api import StockDataFetcher

# Initialize fetcher
fetcher = StockDataFetcher()

# Get current stock data
data = fetcher.get_stock_data('AAPL')
print(f"Symbol: {data['symbol']}")
print(f"Price: ${data['price']:.2f}")
print(f"Change: {data['change_percent']:.2f}%")

# Get historical data
history = fetcher.get_historical_data('AAPL', period='1y')
print(history.head())  # Returns pandas DataFrame
```

#### Cryptocurrency Data

```python
from code.backend.data_pipeline.crypto_api import CryptoDataFetcher

fetcher = CryptoDataFetcher()

# Get crypto data
btc_data = fetcher.get_crypto_data('BTC')
print(f"Bitcoin: ${btc_data['price']:.2f}")
print(f"24h Volume: ${btc_data['volume_24h']:,.0f}")

# Get multiple cryptos
cryptos = fetcher.get_multiple_cryptos(['BTC', 'ETH', 'XRP'])
```

#### AI Predictions

```python
from code.backend.data_pipeline.prediction_service import PredictionService

predictor = PredictionService()

# Get stock prediction
prediction = predictor.predict_stock('AAPL', timeframe='7d')
print(f"Predicted price: ${prediction['predicted_price']:.2f}")
print(f"Confidence interval: ${prediction['confidence_interval']['lower']:.2f} - ${prediction['confidence_interval']['upper']:.2f}")
print(f"Direction: {prediction['direction']}")

# Get crypto prediction
crypto_pred = predictor.predict_crypto('BTC', timeframe='1d')
```

#### Portfolio Management

```python
from code.backend.portfolio_service import PortfolioService

service = PortfolioService()

# Create portfolio
result = service.create_portfolio(
    user_id='user-uuid-here',
    name='Tech Portfolio',
    description='Technology stocks',
    currency='USD'
)

portfolio_id = result['portfolio']['id']

# Add position
service.add_position(
    portfolio_id=portfolio_id,
    asset_symbol='GOOGL',
    quantity=5,
    purchase_price=142.30
)

# Get portfolio analytics
analytics = service.get_portfolio_analytics(portfolio_id)
print(f"Total Value: ${analytics['total_value']:.2f}")
print(f"Total Return: {analytics['total_return']:.2f}%")
print(f"Sharpe Ratio: {analytics['sharpe_ratio']:.2f}")
```

#### Risk Management

```python
from code.backend.risk_management import RiskManagementService

risk_service = RiskManagementService()

# Calculate portfolio risk
risk_metrics = risk_service.calculate_portfolio_risk(portfolio_id)
print(f"Value at Risk (95%): ${risk_metrics['var_95']:.2f}")
print(f"Expected Shortfall: ${risk_metrics['expected_shortfall']:.2f}")
print(f"Beta: {risk_metrics['beta']:.2f}")
print(f"Volatility: {risk_metrics['volatility']:.2%}")

# Stress test
stress_results = risk_service.stress_test_portfolio(
    portfolio_id,
    scenarios=['market_crash', 'interest_rate_shock', 'inflation_surge']
)
```

#### Blockchain Services

```python
from code.backend.blockchain_service import BlockchainService

blockchain = BlockchainService()

# Get on-chain data
eth_data = blockchain.get_blockchain_metrics('ethereum')
print(f"Active Addresses: {eth_data['active_addresses']:,}")
print(f"Transaction Volume: ${eth_data['transaction_volume']:,.0f}")

# Track whale movements
whale_data = blockchain.track_whale_movements('ETH', threshold=1000)
print(f"Large transactions: {len(whale_data)}")
```

---

## REST API Usage

### Authentication

All API requests require authentication via JWT tokens.

```python
import requests

# Base URL
BASE_URL = 'http://localhost:5000/api/v1'

# Login to get token
response = requests.post(f'{BASE_URL}/auth/login', json={
    'username': 'johndoe',
    'password': 'SecurePass123!'
})

tokens = response.json()
access_token = tokens['access_token']
refresh_token = tokens['refresh_token']

# Use token in headers
headers = {'Authorization': f'Bearer {access_token}'}

# Refresh token when expired
response = requests.post(f'{BASE_URL}/auth/refresh', json={
    'refresh_token': refresh_token
})
new_access_token = response.json()['access_token']
```

### Market Data Endpoints

```python
# Get asset list
response = requests.get(f'{BASE_URL}/assets', headers=headers)
assets = response.json()['assets']

# Get specific asset details
response = requests.get(f'{BASE_URL}/assets/AAPL', headers=headers)
asset = response.json()['asset']

# Get real-time price
response = requests.get(f'{BASE_URL}/market/price/AAPL', headers=headers)
price_data = response.json()
```

### Portfolio Endpoints

```python
# List portfolios
response = requests.get(f'{BASE_URL}/portfolios', headers=headers)
portfolios = response.json()['portfolios']

# Get portfolio details
response = requests.get(f'{BASE_URL}/portfolios/{portfolio_id}', headers=headers)
portfolio = response.json()['portfolio']

# Update portfolio
response = requests.put(
    f'{BASE_URL}/portfolios/{portfolio_id}',
    headers=headers,
    json={'name': 'Updated Portfolio Name'}
)

# Delete portfolio
response = requests.delete(f'{BASE_URL}/portfolios/{portfolio_id}', headers=headers)
```

### Prediction Endpoints

```python
# Get prediction
response = requests.get(
    f'{BASE_URL}/predictions/stock/AAPL',
    headers=headers,
    params={'timeframe': '1w', 'include_analysis': True}
)
prediction = response.json()

# Get multiple predictions
response = requests.post(
    f'{BASE_URL}/predictions/batch',
    headers=headers,
    json={'assets': ['AAPL', 'GOOGL', 'MSFT'], 'timeframe': '1d'}
)
predictions = response.json()['predictions']
```

### Watchlist Management

```python
# Create watchlist
response = requests.post(
    f'{BASE_URL}/watchlists',
    headers=headers,
    json={'name': 'Tech Stocks', 'description': 'Technology sector'}
)
watchlist_id = response.json()['watchlist']['id']

# Add assets to watchlist
response = requests.post(
    f'{BASE_URL}/watchlists/{watchlist_id}/assets',
    headers=headers,
    json={'asset_symbols': ['AAPL', 'GOOGL', 'MSFT', 'AMZN']}
)

# Get watchlist with real-time data
response = requests.get(f'{BASE_URL}/watchlists/{watchlist_id}', headers=headers)
watchlist = response.json()['watchlist']
```

---

## WebSocket Real-Time Data

### Connecting to WebSocket

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data}")

def on_open(ws):
    # Subscribe to real-time updates
    ws.send(json.dumps({
        'action': 'subscribe',
        'channels': ['prices', 'portfolio_updates'],
        'assets': ['AAPL', 'BTC']
    }))

# Connect to WebSocket
ws = websocket.WebSocketApp(
    f'ws://localhost:5000/ws?token={access_token}',
    on_message=on_message,
    on_open=on_open
)

ws.run_forever()
```

### WebSocket with JavaScript

```javascript
// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:5000/ws?token=${accessToken}`);

ws.onopen = () => {
  // Subscribe to channels
  ws.send(
    JSON.stringify({
      action: "subscribe",
      channels: ["prices", "predictions"],
      assets: ["AAPL", "ETH"],
    }),
  );
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Real-time update:", data);

  if (data.type === "price_update") {
    updatePriceDisplay(data.asset, data.price);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

---

## Common Workflows

### Workflow 1: Daily Portfolio Analysis

```python
import requests
from datetime import datetime

BASE_URL = 'http://localhost:5000/api/v1'
headers = {'Authorization': f'Bearer {access_token}'}

# 1. Get all portfolios
portfolios_response = requests.get(f'{BASE_URL}/portfolios', headers=headers)
portfolios = portfolios_response.json()['portfolios']

for portfolio in portfolios:
    portfolio_id = portfolio['id']

    # 2. Get portfolio analytics
    analytics_response = requests.get(
        f'{BASE_URL}/portfolios/{portfolio_id}/analytics',
        headers=headers
    )
    analytics = analytics_response.json()

    print(f"\n=== {portfolio['name']} ===")
    print(f"Total Value: ${analytics['total_value']:.2f}")
    print(f"Daily Change: {analytics['daily_change_percent']:.2f}%")
    print(f"Total Return: {analytics['total_return_percent']:.2f}%")

    # 3. Get risk metrics
    risk_response = requests.get(
        f'{BASE_URL}/portfolios/{portfolio_id}/risk',
        headers=headers
    )
    risk = risk_response.json()

    print(f"VaR (95%): ${risk['var_95']:.2f}")
    print(f"Sharpe Ratio: {risk['sharpe_ratio']:.2f}")

    # 4. Check for alerts
    alerts_response = requests.get(
        f'{BASE_URL}/portfolios/{portfolio_id}/alerts',
        headers=headers,
        params={'status': 'active'}
    )
    alerts = alerts_response.json()['alerts']

    if alerts:
        print(f"\nAlerts: {len(alerts)}")
        for alert in alerts:
            print(f"  - {alert['message']}")
```

### Workflow 2: Automated Trading Signals

```python
from code.backend.data_pipeline.prediction_service import PredictionService
from code.backend.portfolio_service import PortfolioService

predictor = PredictionService()
portfolio_service = PortfolioService()

# Assets to monitor
watchlist = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']

for symbol in watchlist:
    # Get prediction
    prediction = predictor.predict_stock(symbol, timeframe='1d')

    # Generate signal
    if prediction['confidence_score'] > 0.8:
        if prediction['direction'] == 'up' and prediction['predicted_return'] > 0.02:
            print(f"BUY SIGNAL: {symbol}")
            print(f"  Expected return: {prediction['predicted_return']:.2%}")
            print(f"  Confidence: {prediction['confidence_score']:.2%}")

        elif prediction['direction'] == 'down' and prediction['predicted_return'] < -0.02:
            print(f"SELL SIGNAL: {symbol}")
            print(f"  Expected decline: {prediction['predicted_return']:.2%}")
            print(f"  Confidence: {prediction['confidence_score']:.2%}")
```

### Workflow 3: Risk Monitoring

```python
from code.backend.risk_management import RiskManagementService

risk_service = RiskManagementService()

# Get portfolio risk
risk_metrics = risk_service.calculate_portfolio_risk(portfolio_id)

# Check risk thresholds
RISK_THRESHOLDS = {
    'var_95': 10000,  # Maximum VaR
    'volatility': 0.25,  # Maximum 25% volatility
    'beta': 1.5  # Maximum beta
}

warnings = []

if risk_metrics['var_95'] > RISK_THRESHOLDS['var_95']:
    warnings.append(f"VaR exceeded: ${risk_metrics['var_95']:.2f}")

if risk_metrics['volatility'] > RISK_THRESHOLDS['volatility']:
    warnings.append(f"High volatility: {risk_metrics['volatility']:.2%}")

if risk_metrics['beta'] > RISK_THRESHOLDS['beta']:
    warnings.append(f"High beta: {risk_metrics['beta']:.2f}")

if warnings:
    print("⚠️ RISK WARNINGS:")
    for warning in warnings:
        print(f"  - {warning}")

    # Get rebalancing recommendations
    rebalance = risk_service.get_rebalancing_recommendations(
        portfolio_id,
        target_risk='moderate'
    )
    print("\nRebalancing suggestions:")
    for suggestion in rebalance['suggestions']:
        print(f"  - {suggestion}")
```

### Workflow 4: Backtesting Strategy

```python
from code.backend.data_pipeline.stock_api import StockDataFetcher
import pandas as pd

fetcher = StockDataFetcher()

# Get historical data
historical_data = fetcher.get_historical_data('AAPL', period='2y')

# Simple moving average strategy
historical_data['SMA_50'] = historical_data['Close'].rolling(window=50).mean()
historical_data['SMA_200'] = historical_data['Close'].rolling(window=200).mean()

# Generate signals
historical_data['Signal'] = 0
historical_data.loc[historical_data['SMA_50'] > historical_data['SMA_200'], 'Signal'] = 1
historical_data.loc[historical_data['SMA_50'] < historical_data['SMA_200'], 'Signal'] = -1

# Calculate returns
historical_data['Returns'] = historical_data['Close'].pct_change()
historical_data['Strategy_Returns'] = historical_data['Signal'].shift(1) * historical_data['Returns']

# Performance metrics
cumulative_return = (1 + historical_data['Strategy_Returns']).prod() - 1
sharpe_ratio = historical_data['Strategy_Returns'].mean() / historical_data['Strategy_Returns'].std() * (252 ** 0.5)

print(f"Cumulative Return: {cumulative_return:.2%}")
print(f"Sharpe Ratio: {sharpe_ratio:.2f}")
```

---

## Next Steps

- **API Reference**: See [API.md](API.md) for complete API documentation
- **CLI Reference**: See [CLI.md](CLI.md) for all CLI commands
- **Examples**: Explore [examples/](examples/portfolio-management.md) for more use cases
- **Troubleshooting**: Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues

---

_For more advanced usage patterns, see the [Developer Guide](CONTRIBUTING.md)_
