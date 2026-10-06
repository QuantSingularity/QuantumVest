from typing import Any, Dict

import numpy as np
import pandas as pd


def blend_expected_returns(
    historical: pd.Series, forecast: pd.Series, forecast_weight: float
) -> pd.Series:
    w = float(np.clip(forecast_weight, 0.0, 1.0))
    aligned = forecast.reindex(historical.index)
    return (1 - w) * historical + w * aligned.fillna(historical)


def discrete_allocation(
    weights: Dict[str, float], prices: Dict[str, float], total_value: float
) -> Dict[str, Any]:
    if total_value <= 0:
        raise ValueError("total_value must be positive")
    symbols = [s for s, w in weights.items() if w > 0 and prices.get(s, 0) > 0]
    if not symbols:
        return {"allocation": {}, "leftover": float(total_value)}
    norm = sum(weights[s] for s in symbols)
    target = {s: weights[s] / norm * total_value for s in symbols}
    shares = {s: int(target[s] // prices[s]) for s in symbols}
    cash = total_value - sum(shares[s] * prices[s] for s in symbols)
    while True:
        candidates = [s for s in symbols if prices[s] <= cash + 1e-9]
        if not candidates:
            break
        pick = max(candidates, key=lambda s: target[s] - shares[s] * prices[s])
        shares[pick] += 1
        cash -= prices[pick]
    return {
        "allocation": {s: n for s, n in shares.items() if n > 0},
        "leftover": float(cash),
    }
