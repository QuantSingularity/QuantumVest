from typing import Any, Dict

import numpy as np
import pandas as pd

TRADING_DAYS = 252


def score_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return {}
    err = y_pred - y_true
    rmse = float(np.sqrt(np.mean(err**2)))
    baseline_rmse = float(np.sqrt(np.mean(y_true**2)))
    nonzero = y_true != 0
    directional = (
        float(np.mean(np.sign(y_pred[nonzero]) == np.sign(y_true[nonzero])))
        if nonzero.any()
        else None
    )
    if len(y_true) > 2 and np.std(y_pred) > 0 and np.std(y_true) > 0:
        ic = float(np.corrcoef(y_pred, y_true)[0, 1])
    else:
        ic = None
    price_err = np.abs(np.exp(y_pred) - np.exp(y_true)) / np.exp(y_true)
    naive_err = np.abs(1.0 - np.exp(y_true)) / np.exp(y_true)
    return {
        "samples": int(len(y_true)),
        "rmse": rmse,
        "mae": float(np.mean(np.abs(err))),
        "baseline_rmse": baseline_rmse,
        "skill_vs_naive": (
            float(1 - rmse / baseline_rmse) if baseline_rmse > 0 else None
        ),
        "directional_accuracy": directional,
        "information_coefficient": ic,
        "price_mape_pct": float(np.mean(price_err) * 100),
        "naive_price_mape_pct": float(np.mean(naive_err) * 100),
    }


def performance_metrics(
    returns: pd.Series,
    risk_free_rate: float = 0.02,
    periods_per_year: int = TRADING_DAYS,
) -> Dict[str, float]:
    r = returns.dropna().to_numpy(dtype=float)
    if r.size < 2:
        return {}
    wealth = np.cumprod(1.0 + r)
    peak = np.maximum.accumulate(wealth)
    vol = float(np.std(r, ddof=1) * np.sqrt(periods_per_year))
    ann = float(wealth[-1] ** (periods_per_year / r.size) - 1.0)
    return {
        "total_return": float(wealth[-1] - 1.0),
        "annualized_return": ann,
        "annualized_volatility": vol,
        "sharpe_ratio": float((ann - risk_free_rate) / vol) if vol > 0 else 0.0,
        "max_drawdown": float(np.min(wealth / peak - 1.0)),
    }
