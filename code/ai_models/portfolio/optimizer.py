import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.covariance import LedoitWolf

from ai_models.exceptions import OptimizationError

logger = logging.getLogger(__name__)

TRADING_DAYS = 252
MIN_OBSERVATIONS = 30
OBJECTIVES = (
    "max_sharpe",
    "min_variance",
    "max_return",
    "mean_variance",
    "risk_parity",
    "target_return",
)
RETURN_METHODS = ("shrunk", "mean_historical", "exponential_weighted", "capm")
COVARIANCE_METHODS = ("ledoit_wolf", "sample", "exponential_weighted")


def risk_tolerance_to_aversion(risk_tolerance: float) -> float:
    rt = float(np.clip(risk_tolerance, 0.0, 1.0))
    return 1.0 + 19.0 * (1.0 - rt)


class PortfolioOptimizer:
    def __init__(
        self, risk_free_rate: float = 0.02, periods_per_year: int = TRADING_DAYS
    ) -> None:
        self.risk_free_rate = float(risk_free_rate)
        self.periods_per_year = int(periods_per_year)
        self.expected_returns_: Optional[pd.Series] = None
        self.covariance_: Optional[pd.DataFrame] = None

    def _clean(self, returns: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(returns, pd.DataFrame):
            returns = pd.DataFrame(returns)
        df = returns.apply(pd.to_numeric, errors="coerce")
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.dropna(axis=1, how="all").dropna(axis=0, how="any")
        if df.shape[1] < 2:
            raise OptimizationError("At least two assets with return history are required")
        if df.shape[0] < MIN_OBSERVATIONS:
            raise OptimizationError(
                f"At least {MIN_OBSERVATIONS} overlapping observations are required"
            )
        return df

    def estimate_expected_returns(
        self, returns: pd.DataFrame, method: str = "shrunk"
    ) -> pd.Series:
        ppy = self.periods_per_year
        if method == "mean_historical":
            return returns.mean() * ppy
        if method == "exponential_weighted":
            span = min(126, len(returns))
            return returns.ewm(span=span).mean().iloc[-1] * ppy
        if method == "capm":
            market = returns.mean(axis=1)
            market_var = float(market.var())
            market_return = float(market.mean() * ppy)
            betas = {}
            for col in returns.columns:
                cov = float(np.cov(returns[col], market)[0, 1])
                betas[col] = cov / market_var if market_var > 0 else 1.0
            return pd.Series(
                {
                    c: self.risk_free_rate + b * (market_return - self.risk_free_rate)
                    for c, b in betas.items()
                }
            )
        if method == "shrunk":
            mu = returns.mean() * ppy
            n = len(mu)
            grand = float(mu.mean())
            years = len(returns) / ppy
            sampling_var = float((returns.var() * ppy).mean() / years)
            spread = float(((mu - grand) ** 2).sum())
            if n >= 3 and spread > 0:
                delta = float(np.clip((n - 2) * sampling_var / spread, 0.0, 1.0))
            else:
                delta = 0.5
            return grand * delta + mu * (1 - delta)
        raise OptimizationError(f"Unknown expected return method: {method}")

    def estimate_covariance(
        self, returns: pd.DataFrame, method: str = "ledoit_wolf"
    ) -> pd.DataFrame:
        ppy = self.periods_per_year
        if method == "sample":
            cov = returns.cov().to_numpy() * ppy
        elif method == "ledoit_wolf":
            cov = LedoitWolf().fit(returns.to_numpy()).covariance_ * ppy
        elif method == "exponential_weighted":
            t = len(returns)
            w = 0.5 ** ((t - 1 - np.arange(t)) / 63.0)
            w /= w.sum()
            values = returns.to_numpy()
            centered = values - (w[:, None] * values).sum(axis=0)
            cov = (centered * w[:, None]).T @ centered * ppy
        else:
            raise OptimizationError(f"Unknown covariance method: {method}")
        cov = (cov + cov.T) / 2
        cov = cov + np.eye(len(cov)) * 1e-10
        return pd.DataFrame(cov, index=returns.columns, columns=returns.columns)

    def portfolio_stats(
        self, weights: np.ndarray, mu: np.ndarray, cov: np.ndarray
    ) -> Dict[str, float]:
        ret = float(weights @ mu)
        vol = float(np.sqrt(max(weights @ cov @ weights, 0.0)))
        sharpe = (ret - self.risk_free_rate) / vol if vol > 0 else 0.0
        return {"expected_return": ret, "volatility": vol, "sharpe_ratio": sharpe}

    def _starts(self, n: int, lo: float, hi: float, mu: np.ndarray) -> List[np.ndarray]:
        rng = np.random.default_rng(42)
        starts = [np.full(n, 1.0 / n)]
        best = np.full(n, lo)
        remaining = 1.0 - lo * n
        for i in np.argsort(mu)[::-1]:
            add = min(hi - lo, remaining)
            best[i] += add
            remaining -= add
            if remaining <= 1e-12:
                break
        starts.append(best)
        for _ in range(2):
            raw = rng.dirichlet(np.ones(n))
            w = lo + raw * (1.0 - lo * n)
            starts.append(np.clip(w, lo, hi))
        return starts

    def _solve(self, fun, n, lo, hi, extra, mu):
        constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}] + extra
        bounds = [(lo, hi)] * n
        best = None
        for x0 in self._starts(n, lo, hi, mu):
            try:
                res = minimize(
                    fun,
                    x0,
                    method="SLSQP",
                    bounds=bounds,
                    constraints=constraints,
                    options={"maxiter": 500, "ftol": 1e-12},
                )
            except (ValueError, FloatingPointError):
                continue
            if not res.success or not np.all(np.isfinite(res.x)):
                continue
            if abs(np.sum(res.x) - 1.0) > 1e-6:
                continue
            if best is None or res.fun < best.fun:
                best = res
        if best is None:
            raise OptimizationError("Optimizer failed to converge")
        w = np.clip(best.x, lo, hi)
        w = np.where(w < 1e-6, 0.0, w)
        return w / w.sum()

    def optimize(
        self,
        returns: pd.DataFrame,
        objective: str = "max_sharpe",
        expected_returns: Optional[pd.Series] = None,
        covariance: Optional[pd.DataFrame] = None,
        min_weight: float = 0.0,
        max_weight: float = 1.0,
        target_return: Optional[float] = None,
        risk_aversion: float = 5.0,
        return_method: str = "shrunk",
        covariance_method: str = "ledoit_wolf",
    ) -> Dict[str, Any]:
        if objective not in OBJECTIVES:
            raise OptimizationError(f"Unknown objective: {objective}")
        df = self._clean(returns)
        mu_s = (
            self.estimate_expected_returns(df, return_method)
            if expected_returns is None
            else pd.Series(expected_returns).reindex(df.columns)
        )
        if mu_s.isna().any():
            raise OptimizationError("Expected returns missing for some assets")
        cov_df = (
            self.estimate_covariance(df, covariance_method)
            if covariance is None
            else covariance.reindex(index=df.columns, columns=df.columns)
        )
        mu = mu_s.to_numpy(dtype=float)
        cov = cov_df.to_numpy(dtype=float)
        n = len(mu)
        self.expected_returns_ = mu_s
        self.covariance_ = cov_df

        lo, hi = float(min_weight), float(max_weight)
        if lo < 0 or hi > 1 or lo > hi:
            raise OptimizationError("Weight bounds must satisfy 0 <= min <= max <= 1")
        if n * lo > 1 + 1e-9 or n * hi < 1 - 1e-9:
            raise OptimizationError("Weight bounds are infeasible for the number of assets")

        def variance(w):
            return float(w @ cov @ w)

        note = None
        effective = objective
        extra: List[Dict[str, Any]] = []

        if objective == "min_variance":
            fun = variance
        elif objective == "max_return":
            def fun(w):
                return -float(w @ mu)
        elif objective == "mean_variance":
            lam = float(risk_aversion)

            def fun(w):
                return -(float(w @ mu) - 0.5 * lam * variance(w))
        elif objective == "risk_parity":
            def fun(w):
                marginal = cov @ w
                contrib = w * marginal
                total = float(w @ marginal)
                return float(np.sum((contrib - total / n) ** 2)) * 1e4
        elif objective == "target_return":
            if target_return is None:
                raise OptimizationError("target_return is required for this objective")
            ceiling = self.portfolio_stats(
                self._solve(lambda w: -float(w @ mu), n, lo, hi, [], mu), mu, cov
            )["expected_return"]
            if target_return > ceiling + 1e-9:
                raise OptimizationError(
                    f"Target return {target_return:.4f} exceeds the maximum "
                    f"achievable {ceiling:.4f} under the given constraints"
                )
            fun = variance
            extra = [{"type": "ineq", "fun": lambda w: float(w @ mu) - target_return}]
        else:
            if float(np.max(mu)) <= self.risk_free_rate:
                effective = "min_variance"
                note = "No asset exceeds the risk-free rate; minimum variance used"
                fun = variance
            else:
                def fun(w):
                    vol = np.sqrt(max(variance(w), 1e-18))
                    return -(float(w @ mu) - self.risk_free_rate) / vol

        weights = self._solve(fun, n, lo, hi, extra, mu)
        stats = self.portfolio_stats(weights, mu, cov)
        result: Dict[str, Any] = {
            "success": True,
            "objective": objective,
            "effective_objective": effective,
            "weights": {
                str(sym): float(w) for sym, w in zip(df.columns, weights)
            },
            "risk_free_rate": self.risk_free_rate,
            "effective_number_of_assets": float(1.0 / np.sum(weights**2)),
            "observations": int(len(df)),
            "return_method": return_method if expected_returns is None else "provided",
            "covariance_method": covariance_method,
        }
        result.update(stats)
        if note:
            result["note"] = note
        return result

    def efficient_frontier(
        self,
        returns: pd.DataFrame,
        points: int = 20,
        min_weight: float = 0.0,
        max_weight: float = 1.0,
        expected_returns: Optional[pd.Series] = None,
        return_method: str = "shrunk",
        covariance_method: str = "ledoit_wolf",
    ) -> List[Dict[str, Any]]:
        common = dict(
            min_weight=min_weight,
            max_weight=max_weight,
            expected_returns=expected_returns,
            return_method=return_method,
            covariance_method=covariance_method,
        )
        low = self.optimize(returns, "min_variance", **common)
        high = self.optimize(returns, "max_return", **common)
        targets = np.linspace(low["expected_return"], high["expected_return"], points)
        frontier = []
        for target in targets:
            try:
                res = self.optimize(
                    returns, "target_return", target_return=float(target), **common
                )
            except OptimizationError:
                continue
            frontier.append(
                {
                    "expected_return": res["expected_return"],
                    "volatility": res["volatility"],
                    "sharpe_ratio": res["sharpe_ratio"],
                    "weights": res["weights"],
                }
            )
        return frontier
