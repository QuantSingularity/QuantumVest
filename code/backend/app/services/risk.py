"""
Risk management: VaR (historical/parametric/Monte Carlo), portfolio metrics,
stress testing, concentration risk.
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class RiskManagementService:
    """Portfolio risk assessment - operates on numpy return arrays."""

    @staticmethod
    def calculate_var(
        returns: np.ndarray,
        alpha: float = 0.05,
        time_horizon: int = 1,
        method: str = "historical",
    ) -> float:
        """Return VaR (negative number = potential loss).

        Args:
            returns: 1-D array of period returns.
            alpha: Tail probability (0.05 = 95 % confidence).
            time_horizon: Scaling horizon in periods.
            method: 'historical' | 'parametric' | 'monte_carlo'.
        """
        if method == "historical":
            return float(np.percentile(returns * np.sqrt(time_horizon), alpha * 100))
        if method == "parametric":
            mu = np.mean(returns) * time_horizon
            sigma = np.std(returns) * np.sqrt(time_horizon)
            return float(mu + stats.norm.ppf(alpha) * sigma)
        if method == "monte_carlo":
            mu, sigma = np.mean(returns), np.std(returns)
            rng = np.random.default_rng(42)
            sim = rng.normal(mu, sigma, (10_000, time_horizon)).sum(axis=1)
            return float(np.percentile(sim, alpha * 100))
        raise ValueError(f"Unknown VaR method: {method!r}")

    @staticmethod
    def calculate_cvar(returns: np.ndarray, alpha: float = 0.05) -> float:
        """Expected Shortfall (CVaR)."""
        var = np.percentile(returns, alpha * 100)
        tail = returns[returns <= var]
        return float(np.mean(tail)) if len(tail) > 0 else float(var)

    @staticmethod
    def calculate_metrics(
        returns: np.ndarray,
        benchmark_returns: Optional[np.ndarray] = None,
        risk_free_rate: float = 0.02,
    ) -> Dict[str, float]:
        """Annualised risk/return metrics for a return series."""
        ann_ret = float(np.mean(returns) * 252)
        ann_vol = float(np.std(returns) * np.sqrt(252))
        excess = returns - risk_free_rate / 252
        sharpe = (
            float(np.mean(excess) / np.std(returns) * np.sqrt(252))
            if np.std(returns) > 0
            else 0.0
        )
        down = returns[returns < 0]
        down_dev = float(np.std(down) * np.sqrt(252)) if len(down) > 0 else 0.0
        sortino = float(ann_ret / down_dev) if down_dev > 0 else float("inf")
        cum = np.cumprod(1 + returns)
        peak = np.maximum.accumulate(cum)
        dd = (cum - peak) / np.where(peak != 0, peak, 1)
        max_dd = float(np.min(dd))

        result: Dict[str, float] = {
            "annualized_return": ann_ret,
            "volatility": ann_vol,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "max_drawdown": max_dd,
            "skewness": float(stats.skew(returns)),
            "kurtosis": float(stats.kurtosis(returns)),
            "var_95": RiskManagementService.calculate_var(returns, 0.05),
            "cvar_95": RiskManagementService.calculate_cvar(returns, 0.05),
        }

        if benchmark_returns is not None and len(benchmark_returns) == len(returns):
            bench_var = np.var(benchmark_returns)
            cov = np.cov(returns, benchmark_returns)[0, 1]
            beta = float(cov / bench_var) if bench_var > 0 else 0.0
            bench_ann = float(np.mean(benchmark_returns) * 252)
            alpha_capm = ann_ret - (
                risk_free_rate + beta * (bench_ann - risk_free_rate)
            )
            corr = float(np.corrcoef(returns, benchmark_returns)[0, 1])
            active = returns - benchmark_returns
            te = float(np.std(active) * np.sqrt(252))
            ir = float(np.mean(active) * 252 / te) if te > 0 else 0.0
            result.update(
                {
                    "beta": beta,
                    "alpha": alpha_capm,
                    "correlation_with_benchmark": corr,
                    "information_ratio": ir,
                    "tracking_error": te,
                }
            )

        return result

    @staticmethod
    def stress_test(
        current_value: float,
        weights: Dict[str, float],
        scenarios: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Apply named shock scenarios to a portfolio.

        Args:
            current_value: Current portfolio market value.
            weights: Dict mapping asset symbol to portfolio weight.
            scenarios: List of dicts with keys 'name', 'asset_shocks' (dict),
                       and optional 'market_shock' (scalar fallback shock).
        """
        results = []
        for scenario in scenarios:
            name = scenario.get("name", "Unnamed")
            asset_shocks = scenario.get("asset_shocks", {})
            market_shock = scenario.get("market_shock", 0.0)

            stressed = 0.0
            for symbol, weight in weights.items():
                shock = asset_shocks.get(symbol, market_shock)
                stressed += current_value * weight * (1 + shock)

            impact = stressed - current_value
            results.append(
                {
                    "scenario_name": name,
                    "current_value": current_value,
                    "stressed_value": stressed,
                    "absolute_impact": impact,
                    "percentage_impact": (
                        impact / current_value * 100 if current_value else 0
                    ),
                }
            )
        return results

    @staticmethod
    def concentration_risk(weights: List[float]) -> Dict[str, Any]:
        """Herfindahl-Hirschman Index and related concentration metrics."""
        if not weights or sum(weights) == 0:
            return {"error": "Empty or zero-sum weights"}
        w = np.array(weights) / sum(weights)
        hhi = float(np.sum(w**2))
        eff_n = 1 / hhi if hhi > 0 else 0
        sorted_w = sorted(w, reverse=True)
        top5 = float(sum(sorted_w[:5]))
        level = "High" if hhi > 0.25 else ("Medium" if hhi > 0.15 else "Low")
        return {
            "herfindahl_index": hhi,
            "effective_number_of_holdings": eff_n,
            "top_5_concentration": top5,
            "largest_holding_weight": float(max(w)),
            "concentration_level": level,
            "total_holdings": len(weights),
        }
