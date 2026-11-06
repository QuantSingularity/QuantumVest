# API Reference

Complete REST API documentation for QuantumVest platform with endpoints, parameters, request/response schemas, and examples.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [User Profile](#user-profile-endpoints)
  - [Portfolios](#portfolio-endpoints)
  - [Market Data](#market-data-endpoints)
  - [Predictions](#prediction-endpoints)
  - [Watchlists](#watchlist-endpoints)
  - [System](#system-endpoints)

---

## Overview

### Base URL

```text
Production: https://api.quantumvest.com/v1
Development: http://localhost:5000/api/v1
```

### Content Type

All requests and responses use JSON:

```text
Content-Type: application/json
```

### API Version

Current API version: `v1`

---

## Authentication

QuantumVest API uses JWT (JSON Web Token) for authentication.

### Authentication Flow

1. **Register** or **Login** to obtain access and refresh tokens
2. Include access token in `Authorization` header for authenticated requests
3. Refresh access token when expired using refresh token

### Token Format

```http
Authorization: Bearer <access_token>
```

### Token Lifetime

| Token Type    | Lifetime |
| ------------- | -------- |
| Access Token  | 1 hour   |
| Refresh Token | 30 days  |

---

## Rate Limiting

API requests are rate-limited per user tier:

| Tier       | Requests/Hour | Requests/Day |
| ---------- | ------------- | ------------ |
| Free       | 100           | 1,000        |
| Standard   | 1,000         | 10,000       |
| Premium    | 10,000        | 100,000      |
| Enterprise | Unlimited     | Unlimited    |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 985
X-RateLimit-Reset: 1704036000
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error description",
  "details": {
    "field": "Additional error context"
  }
}
```

### HTTP Status Codes

| Code | Meaning               | Description                       |
| ---- | --------------------- | --------------------------------- |
| 200  | OK                    | Request successful                |
| 201  | Created               | Resource created successfully     |
| 400  | Bad Request           | Invalid request parameters        |
| 401  | Unauthorized          | Authentication required or failed |
| 403  | Forbidden             | Insufficient permissions          |
| 404  | Not Found             | Resource not found                |
| 429  | Too Many Requests     | Rate limit exceeded               |
| 500  | Internal Server Error | Server error occurred             |

---

## Endpoints

### Authentication Endpoints

#### Register User

Create a new user account.

**Endpoint**: `POST /auth/register`

**Request Body**:

| Name       | Type   | Required | Description                   | Example              |
| ---------- | ------ | -------- | ----------------------------- | -------------------- |
| username   | string | Yes      | Unique username (3-80 chars)  | "johndoe"            |
| email      | string | Yes      | Valid email address           | "<john@example.com>" |
| password   | string | Yes      | Strong password (min 8 chars) | "SecurePass123!"     |
| first_name | string | Yes      | User's first name             | "John"               |
| last_name  | string | Yes      | User's last name              | "Doe"                |
| phone      | string | No       | Phone number                  | "+1234567890"        |

**Example Request**:

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Example Response** (201 Created):

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "client",
    "is_active": true,
    "is_verified": false,
    "created_at": "2024-12-30T15:30:00Z"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer"
}
```

---

#### Login

Authenticate user and obtain tokens.

**Endpoint**: `POST /auth/login`

**Request Body**:

| Name     | Type   | Required | Description                     | Example              |
| -------- | ------ | -------- | ------------------------------- | -------------------- |
| username | string | Yes\*    | Username or email               | "johndoe"            |
| email    | string | Yes\*    | Email (alternative to username) | "<john@example.com>" |
| password | string | Yes      | User password                   | "SecurePass123!"     |

\*Provide either username or email

**Example Request**:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "SecurePass123!"
  }'
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "client"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

#### Refresh Token

Obtain new access token using refresh token.

**Endpoint**: `POST /auth/refresh`

**Request Body**:

| Name          | Type   | Required | Description         | Example                      |
| ------------- | ------ | -------- | ------------------- | ---------------------------- |
| refresh_token | string | Yes      | Valid refresh token | "eyJ0eXAiOiJKV1QiLCJhbGc..." |

**Example Request**:

```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }'
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### User Profile Endpoints

#### Get Profile

Retrieve current user's profile.

**Endpoint**: `GET /auth/profile`

**Headers**: `Authorization: Bearer <access_token>`

**Example Request**:

```bash
curl -X GET http://localhost:5000/api/v1/auth/profile \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "client",
    "risk_tolerance": 0.65,
    "investment_experience": "intermediate",
    "kyc_status": "compliant",
    "aml_status": "compliant",
    "created_at": "2024-12-30T15:30:00Z"
  }
}
```

---

#### Update Profile

Update user profile information.

**Endpoint**: `PUT /auth/profile`

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

| Name                  | Type   | Required | Description              | Example       |
| --------------------- | ------ | -------- | ------------------------ | ------------- |
| first_name            | string | No       | First name               | "John"        |
| last_name             | string | No       | Last name                | "Doe"         |
| phone                 | string | No       | Phone number             | "+1234567890" |
| risk_tolerance        | float  | No       | Risk tolerance (0.0-1.0) | 0.75          |
| investment_experience | string | No       | Experience level         | "advanced"    |
| preferred_currency    | string | No       | Preferred currency code  | "USD"         |

**Example Request**:

```bash
curl -X PUT http://localhost:5000/api/v1/auth/profile \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "risk_tolerance": 0.75,
    "investment_experience": "advanced"
  }'
```

---

### Portfolio Endpoints

#### List Portfolios

Get all portfolios for current user.

**Endpoint**: `GET /portfolios`

**Headers**: `Authorization: Bearer <access_token>`

**Example Request**:

```bash
curl -X GET http://localhost:5000/api/v1/portfolios \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "portfolios": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Growth Portfolio",
      "description": "Long-term growth stocks",
      "currency": "USD",
      "total_value": 125430.5,
      "total_return": 15.75,
      "is_default": true,
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Crypto Portfolio",
      "description": "Cryptocurrency investments",
      "currency": "USD",
      "total_value": 45230.25,
      "total_return": -5.2,
      "is_default": false,
      "created_at": "2024-03-20T14:30:00Z"
    }
  ],
  "count": 2
}
```

---

#### Create Portfolio

Create a new portfolio.

**Endpoint**: `POST /portfolios`

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

| Name        | Type    | Required | Default | Description              | Example             |
| ----------- | ------- | -------- | ------- | ------------------------ | ------------------- |
| name        | string  | Yes      | -       | Portfolio name           | "Tech Portfolio"    |
| description | string  | No       | ""      | Portfolio description    | "Technology stocks" |
| currency    | string  | No       | "USD"   | Base currency            | "USD"               |
| is_default  | boolean | No       | false   | Set as default portfolio | true                |

**Example Request**:

```bash
curl -X POST http://localhost:5000/api/v1/portfolios \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Portfolio",
    "description": "Technology sector investments",
    "currency": "USD",
    "is_default": false
  }'
```

**Example Response** (201 Created):

```json
{
  "success": true,
  "portfolio": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "Tech Portfolio",
    "description": "Technology sector investments",
    "currency": "USD",
    "total_value": 0.0,
    "is_default": false,
    "created_at": "2024-12-30T15:45:00Z"
  }
}
```

---

#### Get Portfolio Details

Get detailed information about a specific portfolio.

**Endpoint**: `GET /portfolios/{portfolio_id}`

**Headers**: `Authorization: Bearer <access_token>`

**Path Parameters**:

| Name         | Type | Description          |
| ------------ | ---- | -------------------- |
| portfolio_id | UUID | Portfolio identifier |

**Example Request**:

```bash
curl -X GET http://localhost:5000/api/v1/portfolios/880e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "portfolio": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "name": "Tech Portfolio",
    "description": "Technology sector investments",
    "currency": "USD",
    "total_value": 52340.75,
    "total_cost_basis": 48000.0,
    "total_return": 4340.75,
    "total_return_percent": 9.04,
    "positions": [
      {
        "asset_symbol": "AAPL",
        "asset_name": "Apple Inc.",
        "quantity": 50,
        "average_price": 180.0,
        "current_price": 185.5,
        "total_value": 9275.0,
        "unrealized_gain": 275.0,
        "unrealized_gain_percent": 3.06
      },
      {
        "asset_symbol": "GOOGL",
        "asset_name": "Alphabet Inc.",
        "quantity": 75,
        "average_price": 140.0,
        "current_price": 142.3,
        "total_value": 10672.5,
        "unrealized_gain": 172.5,
        "unrealized_gain_percent": 1.64
      }
    ],
    "metrics": {
      "sharpe_ratio": 1.45,
      "volatility": 0.185,
      "beta": 1.12,
      "var_95": 2850.5
    }
  }
}
```

---

### Market Data Endpoints

#### Get Stock Data

Retrieve real-time stock market data.

**Endpoint**: `GET /data/stocks/{symbol}`

**Headers**: `Authorization: Bearer <access_token>`

**Path Parameters**:

| Name   | Type   | Description         |
| ------ | ------ | ------------------- |
| symbol | string | Stock ticker symbol |

**Query Parameters**:

| Name               | Type    | Required | Default | Description                        | Example |
| ------------------ | ------- | -------- | ------- | ---------------------------------- | ------- |
| include_historical | boolean | No       | false   | Include historical data            | true    |
| period             | string  | No       | "1d"    | Historical period (1d, 1w, 1m, 1y) | "1m"    |

**Example Request**:

```bash
curl -X GET "http://localhost:5000/api/v1/data/stocks/AAPL?include_historical=false" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "asset": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "type": "stock",
    "exchange": "NASDAQ"
  },
  "data": {
    "price": 185.5,
    "change": 2.35,
    "change_percent": 1.28,
    "volume": 52340890,
    "market_cap": 2890000000000,
    "pe_ratio": 28.5,
    "day_high": 186.2,
    "day_low": 183.4,
    "open": 184.1,
    "previous_close": 183.15,
    "timestamp": "2024-12-30T20:00:00Z"
  }
}
```

---

#### Get Crypto Data

Retrieve cryptocurrency market data.

**Endpoint**: `GET /data/crypto/{symbol}`

**Headers**: `Authorization: Bearer <access_token>`

**Path Parameters**:

| Name   | Type   | Description                    |
| ------ | ------ | ------------------------------ |
| symbol | string | Crypto symbol (BTC, ETH, etc.) |

**Example Request**:

```bash
curl -X GET http://localhost:5000/api/v1/data/crypto/BTC \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "asset": {
    "symbol": "BTC",
    "name": "Bitcoin",
    "type": "crypto"
  },
  "data": {
    "price": 42580.75,
    "change_24h": 1250.3,
    "change_percent_24h": 3.03,
    "volume_24h": 28340000000,
    "market_cap": 834000000000,
    "circulating_supply": 19580000,
    "high_24h": 43100.0,
    "low_24h": 41200.5,
    "timestamp": "2024-12-30T20:05:00Z"
  }
}
```

---

### Prediction Endpoints

#### Get Stock Prediction

Get AI-powered price prediction for a stock.

**Endpoint**: `GET /predictions/stocks/{symbol}`

**Headers**: `Authorization: Bearer <access_token>`

**Path Parameters**:

| Name   | Type   | Description         |
| ------ | ------ | ------------------- |
| symbol | string | Stock ticker symbol |

**Query Parameters**:

| Name             | Type    | Required | Default | Description               | Example          |
| ---------------- | ------- | -------- | ------- | ------------------------- | ---------------- |
| timeframe        | string  | No       | "1w"    | Prediction timeframe      | "1d", "1w", "1m" |
| include_analysis | boolean | No       | false   | Include detailed analysis | true             |

**Example Request**:

```bash
curl -X GET "http://localhost:5000/api/v1/predictions/stocks/AAPL?timeframe=1w" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "asset": {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "type": "stock"
  },
  "prediction": {
    "current_price": 185.5,
    "predicted_price": 192.45,
    "predicted_change": 6.95,
    "predicted_change_percent": 3.75,
    "direction": "up",
    "confidence_score": 0.82,
    "confidence_interval": {
      "lower": 188.3,
      "upper": 196.6
    },
    "timeframe": "1w",
    "generated_at": "2024-12-30T20:10:00Z",
    "valid_until": "2025-01-06T20:10:00Z"
  },
  "factors": {
    "technical_score": 0.78,
    "sentiment_score": 0.85,
    "fundamental_score": 0.8,
    "key_drivers": [
      "Strong earnings momentum",
      "Positive market sentiment",
      "Technical breakout pattern"
    ]
  },
  "historical_accuracy": {
    "1d": 0.84,
    "1w": 0.78,
    "1m": 0.72
  }
}
```

---

### Watchlist Endpoints

#### Create Watchlist

Create a new watchlist for monitoring assets.

**Endpoint**: `POST /watchlists`

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:

| Name        | Type   | Required | Description           | Example             |
| ----------- | ------ | -------- | --------------------- | ------------------- |
| name        | string | Yes      | Watchlist name        | "Tech Stocks"       |
| description | string | No       | Watchlist description | "Technology sector" |

**Example Request**:

```bash
curl -X POST http://localhost:5000/api/v1/watchlists \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Stocks",
    "description": "Technology sector watchlist"
  }'
```

**Example Response** (201 Created):

```json
{
  "success": true,
  "watchlist": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "name": "Tech Stocks",
    "description": "Technology sector watchlist",
    "asset_count": 0,
    "created_at": "2024-12-30T20:15:00Z"
  }
}
```

---

### System Endpoints

#### Health Check

Check API health status.

**Endpoint**: `GET /health`

**No Authentication Required.**

**Example Request**:

```bash
curl -X GET http://localhost:5000/api/v1/health
```

**Example Response** (200 OK):

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-12-30T20:20:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai_models": "loaded"
  }
}
```

---

#### Model Status

Check AI model status.

**Endpoint**: `GET /models/status`

**Headers**: `Authorization: Bearer <access_token>`

**Example Request**:

```bash
curl -X GET http://localhost:5000/api/v1/models/status \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Example Response** (200 OK):

```json
{
  "success": true,
  "models": {
    "stock_predictor": {
      "status": "ready",
      "version": "2.1.0",
      "last_trained": "2024-12-25T10:00:00Z",
      "accuracy": 0.78
    },
    "crypto_predictor": {
      "status": "ready",
      "version": "2.0.5",
      "last_trained": "2024-12-26T14:30:00Z",
      "accuracy": 0.74
    },
    "sentiment_analyzer": {
      "status": "ready",
      "version": "1.5.2",
      "last_trained": "2024-12-28T09:00:00Z"
    }
  }
}
```

---

## SDK Examples

### Python SDK Usage

```python
import requests

class QuantumVestAPI:
    def __init__(self, base_url, access_token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {access_token}'}

    def get_portfolio(self, portfolio_id):
        response = requests.get(
            f'{self.base_url}/portfolios/{portfolio_id}',
            headers=self.headers
        )
        return response.json()

    def get_prediction(self, asset_type, symbol, timeframe='1w'):
        response = requests.get(
            f'{self.base_url}/predictions/{asset_type}/{symbol}',
            headers=self.headers,
            params={'timeframe': timeframe}
        )
        return response.json()

# Usage
api = QuantumVestAPI('http://localhost:5000/api/v1', 'your-token')
portfolio = api.get_portfolio('portfolio-id')
prediction = api.get_prediction('stocks', 'AAPL', '1w')
```

---

## Webhooks

QuantumVest supports webhooks for real-time event notifications.

### Configuring Webhooks

```bash
curl -X POST http://localhost:5000/api/v1/webhooks \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["price_alert", "portfolio_update", "prediction_ready"],
    "secret": "your-webhook-secret"
  }'
```

### Webhook Event Format

```json
{
  "event_type": "price_alert",
  "timestamp": "2024-12-30T20:25:00Z",
  "data": {
    "asset_symbol": "AAPL",
    "current_price": 185.5,
    "alert_price": 185.0,
    "alert_type": "above"
  },
  "signature": "sha256=abcdef123456..."
}
```

---

## Pagination

List endpoints support pagination using cursor-based pagination:

```bash
curl -X GET "http://localhost:5000/api/v1/portfolios/transactions?limit=50&cursor=eyJpZCI6MTIzfQ==" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

**Response**:

```jsonc
{
    "success": true,
    "data": [...],
    "pagination": {
        "next_cursor": "eyJpZCI6MTczfQ==",
        "has_more": true,
        "total_count": 250
    }
}
```

---

For more information, see:

- [Usage Guide](USAGE.md) for practical examples
- [CLI Reference](CLI.md) for command-line tools
- [Examples](examples/portfolio-management.md) for working code samples
