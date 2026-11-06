# Portfolio Management Example

This example demonstrates comprehensive portfolio management operations using QuantumVest.

## Prerequisites

- QuantumVest backend running
- Valid access token
- Python 3.8+ with requests library

## Complete Example

```python
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = 'http://localhost:5000/api/v1'
ACCESS_TOKEN = 'your-access-token-here'

headers = {
    'Authorization': f'Bearer {ACCESS_TOKEN}',
    'Content-Type': 'application/json'
}

#Step 1: Create a Portfolio
print("=== Creating Portfolio ===")
portfolio_response = requests.post(
    f'{BASE_URL}/portfolios',
    headers=headers,
    json={
        'name': 'Tech Growth Portfolio',
        'description': 'Long-term technology sector investments',
        'currency': 'USD',
        'is_default': True
    }
)
portfolio = portfolio_response.json()['portfolio']
portfolio_id = portfolio['id']
print(f"Created portfolio: {portfolio['name']} (ID: {portfolio_id})")

# Step 2: Add Positions
print("\n=== Adding Positions ===")
positions = [
    {'symbol': 'AAPL', 'quantity': 10, 'purchase_price': 180.00},
    {'symbol': 'GOOGL', 'quantity': 5, 'purchase_price': 140.00},
    {'symbol': 'MSFT', 'quantity': 8, 'purchase_price': 350.00},
]

for pos in positions:
    response = requests.post(
        f'{BASE_URL}/portfolios/{portfolio_id}/positions',
        headers=headers,
        json=pos
    )
    print(f"Added {pos['quantity']} shares of {pos['symbol']}")

# Step 3: Get Portfolio Analytics
print("\n=== Portfolio Analytics ===")
analytics_response = requests.get(
    f'{BASE_URL}/portfolios/{portfolio_id}/analytics',
    headers=headers
)
analytics = analytics_response.json()

print(f"Total Value: ${analytics['total_value']:.2f}")
print(f"Total Return: {analytics['total_return_percent']:.2f}%")
print(f"Sharpe Ratio: {analytics['sharpe_ratio']:.2f}")

# Step 4: Risk Analysis
print("\n=== Risk Analysis ===")
risk_response = requests.get(
    f'{BASE_URL}/portfolios/{portfolio_id}/risk',
    headers=headers
)
risk = risk_response.json()

print(f"Value at Risk (95%): ${risk['var_95']:.2f}")
print(f"Volatility: {risk['volatility']:.2%}")
print(f"Beta: {risk['beta']:.2f}")

# Step 5: Portfolio Optimization
print("\n=== Optimizing Portfolio ===")
optimize_response = requests.post(
    f'{BASE_URL}/portfolios/{portfolio_id}/optimize',
    headers=headers,
    json={
        'objective': 'sharpe',
        'target_return': 0.12
    }
)
optimization = optimize_response.json()

print("Recommended allocation:")
for asset, weight in optimization['recommended_weights'].items():
    print(f"  {asset}: {weight:.2%}")

print("\n✅ Portfolio management example completed!")
```

## Expected Output

```text
=== Creating Portfolio ===
Created portfolio: Tech Growth Portfolio (ID: 123e4567-e89b-12d3-a456-426614174000)

=== Adding Positions ===
Added 10 shares of AAPL
Added 5 shares of GOOGL
Added 8 shares of MSFT

=== Portfolio Analytics ===
Total Value: $5,950.00
Total Return: 8.54%
Sharpe Ratio: 1.45

=== Risk Analysis ===
Value at Risk (95%): $425.50
Volatility: 18.20%
Beta: 1.08

=== Optimizing Portfolio ===
Recommended allocation:
  AAPL: 35.00%
  GOOGL: 30.00%
  MSFT: 35.00%

✅ Portfolio management example completed!
```

## See Also

- [API Reference](../API.md)
- [Usage Guide](../USAGE.md)
- [Risk Analysis Example](risk-analysis.md)
