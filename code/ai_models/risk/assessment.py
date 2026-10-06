from typing import Any, Dict, Mapping, Optional, Sequence, Union

import numpy as np
import pandas as pd
from scipy import stats

TRADING_DAYS = 252
VAR_METHODS = ("historical", "parametric", "cornish_fisher", "bootstrap")

DEFAULT_SCENARIOS: Dict[str, Dict[str, Any]] = {
    "market_crash": {"default_shock": -0.30, "volatility_multiplier": 3.0},
    "moderate_correction": {"default_shock": -0.10, "volatility_multiplier": 1.5},
    "volatility_spike": {"default_shock": 0.0, "volatility_multiplier": 2.5},
    "rate_shock": {"default_shock": -0.08, "volatility_multiplier": 1.8},
}


class RiskAssessmentModel:
    def __init__(self, seed: int = 42, periods_per_year: int = TRADING_DAYS) -> None:
        self.seed = int(seed)
        self.periods_per_year = int(periods_per_year)

    @staticmethod
    def _array(returns: Union[np.ndarray, pd.Series, Sequence[float]]) -> np.ndarray:
        arr = np.asarray(returns, dtype=float).reshape(-1)
        arr = arr[np.isfinite(arr)]
        if arr.size < 2:
            raise ValueError("At least two valid return observations are required")
        return arr

    def value_at_risk(
        self,
        returns: Union[np.ndarray, pd.Series, Sequence[float]],
        alpha: float = 0.05,
        method: str = "historical",
        horizon: int = 1,
    ) -> float:
        if not 0 < alpha < 0.5:
            raise ValueError("alpha must be between 0 and 0.5")
        if horizon < 1:
            raise ValueError("horizon must be at least 1")
        r = self._array(returns)
        scale = np.sqrt(horizon)
        mu, sigma = float(np.mean(r)), float(np.std(r, ddof=1))
        if method == "historical":
            return float(np.percentile(r, alpha * 100) * scale)
        if method == "parametric":
            return float(mu * horizon + stats.norm.ppf(alpha) * sigma * scale)
        if method == "cornish_fisher":
            z = stats.norm.ppf(alpha)
            s = float(stats.skew(r))
            k = float(stats.kurtosis(r))
            z_cf = (
                z
                + (z**2 - 1) * s / 6
                + (z**3 - 3 * z) * k / 24
                - (2 * z**3 - 5 * z) * s**2 / 36
            )
            return float(mu * horizon + z_cf * sigma * scale)
        if method == "bootstrap":
            rng = np.random.default_rng(self.seed)
            sims = rng.choice(r, size=(10_000, horizon)).sum(axis=1)
            return float(np.percentile(sims, alpha * 100))
        raise ValueError(f"Unknown VaR method: {method!r}")

    def expected_shortfall(
        self,
        returns: Union[np.ndarray, pd.Series, Sequence[float]],
        alpha: float = 0.05,
        method: str = "historical",
    ) -> float:
        r = self._array(returns)
        if method == "parametric":
            mu, sigma = float(np.mean(r)), float(np.std(r, ddof=1))
            z = stats.norm.ppf(alpha)
            return float(mu - sigma * stats.norm.pdf(z) / alpha)
        if method != "historical":
            raise ValueError(f"Unknown expected shortfall method: {method!r}")
        cutoff = np.percentile(r, alpha * 100)
        tail = r[r <= cutoff]
        return float(np.mean(tail)) if tail.size else float(cutoff)

    @staticmethod
    def max_drawdown(returns: Union[np.ndarray, pd.Series, Sequence[float]]) -> float:
        r = np.asarray(returns, dtype=float).reshape(-1)
        wealth = np.cumprod(1.0 + r)
        peak = np.maximum.accumulate(wealth)
        return float(np.min(wealth / peak - 1.0))

    def risk_summary(
        self, returns: Union[np.ndarray, pd.Series, Sequence[float]]
    ) -> Dict[str, float]:
        r = self._array(returns)
        return {
            "observations": int(r.size),
            "annualized_return": float(np.mean(r) * self.periods_per_year),
            "annualized_volatility": float(
                np.std(r, ddof=1) * np.sqrt(self.periods_per_year)
            ),
            "var_95": self.value_at_risk(r, 0.05),
            "var_99": self.value_at_risk(r, 0.01),
            "var_95_cornish_fisher": self.value_at_risk(r, 0.05, "cornish_fisher"),
            "expected_shortfall_95": self.expected_shortfall(r, 0.05),
            "expected_shortfall_99": self.expected_shortfall(r, 0.01),
            "max_drawdown": self.max_drawdown(r),
            "skewness": float(stats.skew(r)),
            "excess_kurtosis": float(stats.kurtosis(r)),
            "worst_day": float(np.min(r)),
            "best_day": float(np.max(r)),
        }

    @staticmethod
    def _weights(
        weights: Union[Mapping[str, float], Sequence[float], np.ndarray],
        columns: Sequence[str],
    ) -> pd.Series:
        if isinstance(weights, Mapping):
            w = pd.Series({c: float(weights.get(c, 0.0)) for c in columns})
        else:
            arr = np.asarray(weights, dtype=float).reshape(-1)
            if arr.size != len(columns):
                raise ValueError("weights length must match the number of assets")
            w = pd.Series(arr, index=list(columns))
        if not np.isfinite(w.to_numpy()).all():
            raise ValueError("weights must be finite")
        return w

    def portfolio_returns(
        self,
        returns: pd.DataFrame,
        weights: Union[Mapping[str, float], Sequence[float], np.ndarray],
    ) -> pd.Series:
        w = self._weights(weights, list(returns.columns))
        return (returns * w).sum(axis=1)

    def risk_contributions(
        self,
        returns: pd.DataFrame,
        weights: Union[Mapping[str, float], Sequence[float], np.ndarray],
    ) -> Dict[str, float]:
        w = self._weights(weights, list(returns.columns)).to_numpy()
        cov = returns.cov().to_numpy() * self.periods_per_year
        total = float(w @ cov @ w)
        if total <= 0:
            return {c: 0.0 for c in returns.columns}
        contrib = w * (cov @ w) / total
        return {str(c): float(v) for c, v in zip(returns.columns, contrib)}

    def stress_test(
        self,
        weights: Union[Mapping[str, float], Sequence[float], np.ndarray],
        returns: pd.DataFrame,
        scenarios: Optional[Mapping[str, Mapping[str, Any]]] = None,
    ) -> Dict[str, Dict[str, float]]:
        scenarios = scenarios or DEFAULT_SCENARIOS
        w = self._weights(weights, list(returns.columns))
        base = (returns * w).sum(axis=1).to_numpy()
        base_mu = float(np.mean(base))
        results: Dict[str, Dict[str, float]] = {}
        for name, scenario in scenarios.items():
            shocks = scenario.get("shocks", {}) or {}
            default = float(scenario.get("default_shock", 0.0))
            multiplier = float(scenario.get("volatility_multiplier", 1.0))
            if multiplier <= 0:
                raise ValueError("volatility_multiplier must be positive")
            instant = float(
                sum(w[c] * float(shocks.get(c, default)) for c in returns.columns)
            )
            stressed = base_mu + (base - base_mu) * multiplier
            results[str(name)] = {
                "portfolio_shock": instant,
                "stressed_volatility": float(
                    np.std(stressed, ddof=1) * np.sqrt(self.periods_per_year)
                ),
                "stressed_var_95": self.value_at_risk(stressed, 0.05),
                "stressed_expected_shortfall_95": self.expected_shortfall(
                    stressed, 0.05
                ),
            }
        return results
