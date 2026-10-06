from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from ai_models.data.features import next_return_target, normalize_ohlcv
from ai_models.evaluation.metrics import performance_metrics, score_predictions
from ai_models.exceptions import OptimizationError
from ai_models.models.predictor import TimeSeriesPredictor
from ai_models.portfolio.optimizer import PortfolioOptimizer


def walk_forward_portfolio(
    returns: pd.DataFrame,
    objective: str = "max_sharpe",
    lookback: int = 252,
    rebalance: int = 21,
    min_weight: float = 0.0,
    max_weight: float = 1.0,
    risk_free_rate: float = 0.02,
    **optimizer_kwargs: Any,
) -> Dict[str, Any]:
    if len(returns) <= lookback + rebalance:
        raise OptimizationError("Not enough history for a walk-forward backtest")
    optimizer = PortfolioOptimizer(risk_free_rate=risk_free_rate)
    n = returns.shape[1]
    equal = np.full(n, 1.0 / n)
    optimized_parts = []
    equal_parts = []
    failures = 0
    rebalances = 0
    for start in range(lookback, len(returns) - 1, rebalance):
        window = returns.iloc[start - lookback : start]
        forward = returns.iloc[start : start + rebalance]
        try:
            result = optimizer.optimize(
                window,
                objective,
                min_weight=min_weight,
                max_weight=max_weight,
                **optimizer_kwargs,
            )
            weights = np.array([result["weights"][c] for c in returns.columns])
        except OptimizationError:
            weights = equal
            failures += 1
        optimized_parts.append(forward @ weights)
        equal_parts.append(forward @ equal)
        rebalances += 1
    return {
        "objective": objective,
        "rebalances": rebalances,
        "solver_failures": failures,
        "optimized": performance_metrics(pd.concat(optimized_parts), risk_free_rate),
        "equal_weight": performance_metrics(pd.concat(equal_parts), risk_free_rate),
    }


def evaluate_predictor(
    predictor: TimeSeriesPredictor,
    data: pd.DataFrame,
    start: Optional[pd.Timestamp] = None,
) -> Dict[str, Any]:
    frame = normalize_ohlcv(data)
    predicted = predictor.predict_series(frame)
    actual = next_return_target(frame).dropna()
    joined = pd.concat([predicted, actual], axis=1, join="inner").dropna()
    if start is not None:
        joined = joined[joined.index >= start]
    if joined.empty:
        return {}
    return score_predictions(
        joined["target"].to_numpy(), joined["predicted_return"].to_numpy()
    )
