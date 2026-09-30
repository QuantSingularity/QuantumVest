# Configuration Guide

Complete configuration reference for QuantumVest including environment variables, database setup, API keys, and service configuration.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [API Keys and External Services](#api-keys-and-external-services)
- [Security Configuration](#security-configuration)
- [Application Settings](#application-settings)
- [Cache and Queue Configuration](#cache-and-queue-configuration)
- [Logging Configuration](#logging-configuration)
- [Frontend Configuration](#frontend-configuration)

---

## Environment Variables

### Backend Environment (.env)

Create `.env` file in `code/backend/` directory:

```bash
# Copy example file
cp code/backend/.env.example code/backend/.env
```

### Core Configuration

| Option     | Type    | Default     | Description                               | Where to set (env/file) |
| ---------- | ------- | ----------- | ----------------------------------------- | ----------------------- |
| FLASK_APP  | string  | app.py      | Flask application entry point             | Environment / .env      |
| FLASK_ENV  | string  | development | Environment mode (development/production) | Environment / .env      |
| SECRET_KEY | string  | -           | Flask secret key (min 32 chars)           | .env (required)         |
| DEBUG      | boolean | False       | Enable debug mode                         | .env                    |

**Example**:

```bash
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-super-secret-key-min-32-characters-long
DEBUG=True
```

---

### Database Configuration

| Option                         | Type    | Default | Description                                    | Where to set (env/file) |
| ------------------------------ | ------- | ------- | ---------------------------------------------- | ----------------------- |
| DATABASE_URL                   | string  | -       | PostgreSQL connection URL                      | .env (required)         |
| SQLALCHEMY_DATABASE_URI        | string  | -       | SQLAlchemy database URI (same as DATABASE_URL) | .env (required)         |
| SQLALCHEMY_TRACK_MODIFICATIONS | boolean | False   | Track modifications                            | .env                    |
| DB_POOL_SIZE                   | integer | 10      | Connection pool size                           | .env                    |
| DB_MAX_OVERFLOW                | integer | 20      | Max overflow connections                       | .env                    |
| DB_POOL_TIMEOUT                | integer | 30      | Pool timeout (seconds)                         | .env                    |

**Example**:

```bash
DATABASE_URL=postgresql://quantumvest:password@localhost:5432/quantumvest
SQLALCHEMY_DATABASE_URI=postgresql://quantumvest:password@localhost:5432/quantumvest
SQLALCHEMY_TRACK_MODIFICATIONS=False
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```

**Connection String Format**:

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

---

### Redis Configuration

| Option         | Type    | Default                  | Description                  | Where to set (env/file) |
| -------------- | ------- | ------------------------ | ---------------------------- | ----------------------- |
| REDIS_URL      | string  | redis://localhost:6379/0 | Redis connection URL         | .env                    |
| REDIS_HOST     | string  | localhost                | Redis host                   | .env                    |
| REDIS_PORT     | integer | 6379                     | Redis port                   | .env                    |
| REDIS_DB       | integer | 0                        | Redis database number        | .env                    |
| REDIS_PASSWORD | string  | -                        | Redis password (if required) | .env                    |

**Example**:

```bash
REDIS_URL=redis://localhost:6379/0
# Or with password
REDIS_URL=redis://:password@localhost:6379/0
```

---

## API Keys and External Services

### Market Data Providers

| Option                | Type   | Default | Description                          | Where to set (env/file) |
| --------------------- | ------ | ------- | ------------------------------------ | ----------------------- |
| ALPHA_VANTAGE_API_KEY | string | -       | Alpha Vantage API key for stock data | .env (required)         |
| FINNHUB_API_KEY       | string | -       | Finnhub API key for market data      | .env (optional)         |
| COINGECKO_API_KEY     | string | -       | CoinGecko API key for crypto data    | .env (optional)         |
| IEX_CLOUD_API_KEY     | string | -       | IEX Cloud API key                    | .env (optional)         |
| POLYGON_API_KEY       | string | -       | Polygon.io API key                   | .env (optional)         |

**Example**:

```bash
ALPHA_VANTAGE_API_KEY=YOUR_ALPHA_VANTAGE_KEY
FINNHUB_API_KEY=YOUR_FINNHUB_KEY
COINGECKO_API_KEY=YOUR_COINGECKO_KEY
```

**Where to get API keys**:

- Alpha Vantage: https://www.alphavantage.co/support/#api-key
- Finnhub: https://finnhub.io/register
- CoinGecko: https://www.coingecko.com/en/api

---

### Blockchain Configuration

| Option            | Type   | Default | Description                  | Where to set (env/file) |
| ----------------- | ------ | ------- | ---------------------------- | ----------------------- |
| ETHEREUM_NODE_URL | string | -       | Ethereum node RPC URL        | .env (optional)         |
| BSC_NODE_URL      | string | -       | Binance Smart Chain node URL | .env (optional)         |
| WEB3_PROVIDER_URI | string | -       | Web3 provider URI            | .env (optional)         |
| INFURA_PROJECT_ID | string | -       | Infura project ID            | .env (optional)         |
| ALCHEMY_API_KEY   | string | -       | Alchemy API key              | .env (optional)         |

**Example**:

```bash
ETHEREUM_NODE_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BSC_NODE_URL=https://bsc-dataseed.binance.org/
INFURA_PROJECT_ID=YOUR_INFURA_PROJECT_ID
```

---

## Security Configuration

### Authentication

| Option                    | Type    | Default | Description                      | Where to set (env/file) |
| ------------------------- | ------- | ------- | -------------------------------- | ----------------------- |
| JWT_SECRET_KEY            | string  | -       | JWT signing secret key           | .env (required)         |
| JWT_ACCESS_TOKEN_EXPIRES  | integer | 3600    | Access token lifetime (seconds)  | .env                    |
| JWT_REFRESH_TOKEN_EXPIRES | integer | 2592000 | Refresh token lifetime (30 days) | .env                    |
| JWT_ALGORITHM             | string  | HS256   | JWT signing algorithm            | .env                    |
| PASSWORD_MIN_LENGTH       | integer | 8       | Minimum password length          | .env                    |

**Example**:

```bash
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
JWT_ALGORITHM=HS256
```

---

### CORS Configuration

| Option                 | Type    | Default | Description                            | Where to set (env/file) |
| ---------------------- | ------- | ------- | -------------------------------------- | ----------------------- |
| CORS_ORIGINS           | string  | \*      | Allowed CORS origins (comma-separated) | .env                    |
| CORS_ALLOW_CREDENTIALS | boolean | True    | Allow credentials in CORS              | .env                    |
| CORS_MAX_AGE           | integer | 3600    | CORS preflight cache time              | .env                    |

**Example**:

```bash
# Development
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# Production
CORS_ORIGINS=https://quantumvest.com,https://app.quantumvest.com
```

---

### Rate Limiting

| Option                 | Type    | Default    | Description                 | Where to set (env/file) |
| ---------------------- | ------- | ---------- | --------------------------- | ----------------------- |
| RATE_LIMIT_ENABLED     | boolean | True       | Enable rate limiting        | .env                    |
| RATE_LIMIT_STORAGE_URL | string  | -          | Redis URL for rate limiting | .env                    |
| DEFAULT_RATE_LIMIT     | string  | "100/hour" | Default rate limit          | .env                    |

**Example**:

```bash
RATE_LIMIT_ENABLED=True
RATE_LIMIT_STORAGE_URL=redis://localhost:6379/1
DEFAULT_RATE_LIMIT=1000/hour
```

---

## Application Settings

### Server Configuration

| Option       | Type    | Default | Description                         | Where to set (env/file) |
| ------------ | ------- | ------- | ----------------------------------- | ----------------------- |
| HOST         | string  | 0.0.0.0 | Server host                         | .env                    |
| PORT         | integer | 5000    | Server port                         | .env                    |
| WORKERS      | integer | 4       | Number of worker processes          | .env                    |
| WORKER_CLASS | string  | sync    | Worker class (sync/gevent/eventlet) | .env                    |
| TIMEOUT      | integer | 30      | Worker timeout (seconds)            | .env                    |

**Example**:

```bash
HOST=0.0.0.0
PORT=5000
WORKERS=4
WORKER_CLASS=gevent
TIMEOUT=120
```

---

### AI Model Configuration

| Option                          | Type    | Default | Description                        | Where to set (env/file) |
| ------------------------------- | ------- | ------- | ---------------------------------- | ----------------------- |
| MODEL_PATH                      | string  | models/ | Path to trained models             | .env                    |
| ENABLE_AI_PREDICTIONS           | boolean | True    | Enable AI predictions              | .env                    |
| PREDICTION_CONFIDENCE_THRESHOLD | float   | 0.7     | Minimum confidence for predictions | .env                    |
| MODEL_CACHE_TTL                 | integer | 3600    | Model cache TTL (seconds)          | .env                    |

**Example**:

```bash
MODEL_PATH=/app/models/
ENABLE_AI_PREDICTIONS=True
PREDICTION_CONFIDENCE_THRESHOLD=0.75
MODEL_CACHE_TTL=3600
```

---

## Cache and Queue Configuration

### Caching

| Option                | Type    | Default | Description                     | Where to set (env/file) |
| --------------------- | ------- | ------- | ------------------------------- | ----------------------- |
| CACHE_TYPE            | string  | redis   | Cache backend type              | .env                    |
| CACHE_DEFAULT_TIMEOUT | integer | 300     | Default cache timeout (seconds) | .env                    |
| CACHE_KEY_PREFIX      | string  | qv:     | Cache key prefix                | .env                    |

**Example**:

```bash
CACHE_TYPE=redis
CACHE_REDIS_URL=redis://localhost:6379/2
CACHE_DEFAULT_TIMEOUT=600
CACHE_KEY_PREFIX=quantumvest:
```

---

### Celery Configuration

| Option                 | Type   | Default | Description               | Where to set (env/file) |
| ---------------------- | ------ | ------- | ------------------------- | ----------------------- |
| CELERY_BROKER_URL      | string | -       | Celery message broker URL | .env                    |
| CELERY_RESULT_BACKEND  | string | -       | Celery result backend URL | .env                    |
| CELERY_TASK_SERIALIZER | string | json    | Task serializer           | .env                    |
| CELERY_ACCEPT_CONTENT  | string | json    | Accepted content types    | .env                    |

**Example**:

```bash
CELERY_BROKER_URL=redis://localhost:6379/3
CELERY_RESULT_BACKEND=redis://localhost:6379/4
CELERY_TASK_SERIALIZER=json
CELERY_ACCEPT_CONTENT=json
```

---

## Logging Configuration

### Log Settings

| Option           | Type    | Default  | Description                              | Where to set (env/file) |
| ---------------- | ------- | -------- | ---------------------------------------- | ----------------------- |
| LOG_LEVEL        | string  | INFO     | Logging level (DEBUG/INFO/WARNING/ERROR) | .env                    |
| LOG_FORMAT       | string  | json     | Log format (json/text)                   | .env                    |
| LOG_FILE         | string  | -        | Log file path                            | .env                    |
| LOG_MAX_BYTES    | integer | 10485760 | Max log file size (10MB)                 | .env                    |
| LOG_BACKUP_COUNT | integer | 5        | Number of backup log files               | .env                    |

**Example**:

```bash
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=/var/log/quantumvest/app.log
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5
```

---

### External Logging Services

| Option             | Type    | Default     | Description               | Where to set (env/file) |
| ------------------ | ------- | ----------- | ------------------------- | ----------------------- |
| SENTRY_DSN         | string  | -           | Sentry error tracking DSN | .env (optional)         |
| SENTRY_ENVIRONMENT | string  | development | Sentry environment        | .env                    |
| ENABLE_SENTRY      | boolean | False       | Enable Sentry integration | .env                    |

**Example**:

```bash
SENTRY_DSN=https://YOUR_KEY@sentry.io/PROJECT_ID
SENTRY_ENVIRONMENT=production
ENABLE_SENTRY=True
```

---

## Frontend Configuration

### Web Frontend (.env)

Create `.env` file in `web-frontend/` directory:

```bash
cp web-frontend/.env.example web-frontend/.env
```

### Frontend Environment Variables

| Option                     | Type    | Default     | Description             | Where to set (env/file) |
| -------------------------- | ------- | ----------- | ----------------------- | ----------------------- |
| REACT_APP_API_URL          | string  | -           | Backend API base URL    | .env (required)         |
| REACT_APP_WS_URL           | string  | -           | WebSocket server URL    | .env (required)         |
| REACT_APP_ENVIRONMENT      | string  | development | Environment name        | .env                    |
| REACT_APP_ENABLE_ANALYTICS | boolean | false       | Enable analytics        | .env                    |
| REACT_APP_SENTRY_DSN       | string  | -           | Sentry DSN for frontend | .env (optional)         |

**Example**:

```bash
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_WS_URL=ws://localhost:5000/ws
REACT_APP_ENVIRONMENT=development
REACT_APP_ENABLE_ANALYTICS=false
```

**Production Example**:

```bash
REACT_APP_API_URL=https://api.quantumvest.com/v1
REACT_APP_WS_URL=wss://api.quantumvest.com/ws
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_SENTRY_DSN=https://YOUR_KEY@sentry.io/PROJECT_ID
```

---

### Mobile Frontend (.env)

Create `.env` file in `mobile-frontend/` directory:

```bash
cp mobile-frontend/.env.example mobile-frontend/.env
```

| Option      | Type   | Default     | Description          | Where to set (env/file) |
| ----------- | ------ | ----------- | -------------------- | ----------------------- |
| API_URL     | string | -           | Backend API base URL | .env (required)         |
| WS_URL      | string | -           | WebSocket server URL | .env (required)         |
| ENVIRONMENT | string | development | Environment name     | .env                    |

**Example**:

```bash
API_URL=http://localhost:5000/api/v1
WS_URL=ws://localhost:5000/ws
ENVIRONMENT=development
```

---

## Configuration Files

### Python Configuration (config.py)

The `code/backend/config.py` file contains configuration classes:

```python
import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Redis Configuration
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
```

---

## Environment-Specific Configuration

### Development

```bash
# .env.development
FLASK_ENV=development
DEBUG=True
LOG_LEVEL=DEBUG
SQLALCHEMY_ECHO=True
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Staging

```bash
# .env.staging
FLASK_ENV=production
DEBUG=False
LOG_LEVEL=INFO
SQLALCHEMY_ECHO=False
CORS_ORIGINS=https://staging.quantumvest.com
```

### Production

```bash
# .env.production
FLASK_ENV=production
DEBUG=False
LOG_LEVEL=WARNING
SQLALCHEMY_ECHO=False
CORS_ORIGINS=https://quantumvest.com,https://app.quantumvest.com
SENTRY_DSN=https://YOUR_KEY@sentry.io/PROJECT_ID
ENABLE_SENTRY=True
```

---

## Docker Configuration

### Docker Compose (.env)

For Docker Compose deployment, create `.env` in project root:

```bash
# Database
POSTGRES_USER=quantumvest
POSTGRES_PASSWORD=secure-password
POSTGRES_DB=quantumvest
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Application
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
FLASK_ENV=production

# API Keys
ALPHA_VANTAGE_API_KEY=your-api-key
```

---

## Configuration Validation

### Check Configuration

Create a script to validate configuration:

```bash
cd code/backend
python -c "
from config import get_config
import os

config = get_config()
print('✅ Configuration loaded successfully')
print(f'Environment: {os.environ.get(\"FLASK_ENV\", \"development\")}')
print(f'Database: {config.SQLALCHEMY_DATABASE_URI[:20]}...')
print(f'Redis: {config.REDIS_URL}')
print(f'Debug: {config.DEBUG}')
"
```

---

## Security Best Practices

### Configuration Security

1. **Never commit secrets**

   ```bash
   # Add to .gitignore
   .env
   .env.*
   !.env.example
   ```

2. **Use strong secrets**

   ```bash
   # Generate secure secret key
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **Environment-specific configs**
   - Keep separate `.env` files for each environment
   - Use secrets management tools (AWS Secrets Manager, HashiCorp Vault)

4. **Minimal permissions**
   - Grant only necessary database permissions
   - Use read-only API keys where possible

---

## Troubleshooting

### Common Configuration Issues

**1. Missing Environment Variables**

```bash
# Check if variable is set
echo $DATABASE_URL

# Set temporarily
export DATABASE_URL=postgresql://user:pass@localhost/db
```

**2. Database Connection Failed**

```bash
# Test connection
psql -U quantumvest -d quantumvest -h localhost

# Check .env file
cat .env | grep DATABASE_URL
```

**3. Redis Connection Failed**

```bash
# Test Redis
redis-cli ping

# Check Redis URL
echo $REDIS_URL
```

**4. API Keys Not Working**

```bash
# Verify API key is set
echo $ALPHA_VANTAGE_API_KEY

# Test API key
curl "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=$ALPHA_VANTAGE_API_KEY"
```

---

## Configuration Template

### Complete .env Template

```bash
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-super-secret-key-at-least-32-characters-long
DEBUG=True

# Database Configuration
DATABASE_URL=postgresql://quantumvest:password@localhost:5432/quantumvest
SQLALCHEMY_DATABASE_URI=postgresql://quantumvest:password@localhost:5432/quantumvest
SQLALCHEMY_TRACK_MODIFICATIONS=False

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-at-least-32-characters-long
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Market Data API Keys
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
FINNHUB_API_KEY=your-finnhub-api-key
COINGECKO_API_KEY=your-coingecko-api-key

# Blockchain Configuration (Optional)
ETHEREUM_NODE_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BSC_NODE_URL=https://bsc-dataseed.binance.org/

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:8080

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_ENABLED=True
DEFAULT_RATE_LIMIT=1000/hour

# AI Model Configuration
ENABLE_AI_PREDICTIONS=True
PREDICTION_CONFIDENCE_THRESHOLD=0.7

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/3
CELERY_RESULT_BACKEND=redis://localhost:6379/4

# External Services (Optional)
SENTRY_DSN=https://YOUR_KEY@sentry.io/PROJECT_ID
ENABLE_SENTRY=False
```

---

For more information:

- [Installation Guide](INSTALLATION.md) - Setup instructions
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [Security Guide](CONTRIBUTING.md#security) - Security best practices
