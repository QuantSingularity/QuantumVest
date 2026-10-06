import numpy as np
import pandas as pd
import pytest
from ai_models.evaluation.backtest import walk_forward_portfolio
from ai_models.exceptions import OptimizationError
from ai_models.portfolio import (
    PortfolioOptimizer,
    blend_expected_returns,
    discrete_allocation,
    risk_tolerance_to_aversion,
)


@pytest.mark.parametrize(
    "objective",
    ["max_sharpe", "min_variance", "max_return", "mean_variance", "risk_parity"],
)
def test_weights_valid_for_every_objective(returns, objective):
    result = PortfolioOptimizer().optimize(returns, objective, max_weight=0.6)
    w = np.array(list(result["weights"].values()))
    assert w.sum() == pytest.approx(1.0)
    assert (w >= -1e-9).all()
    assert (w <= 0.6 + 1e-6).all()


def test_min_variance_has_lowest_volatility(returns):
    opt = PortfolioOptimizer()
    mv = opt.optimize(returns, "min_variance")
    for other in ("max_sharpe", "max_return", "mean_variance"):
        assert mv["volatility"] <= opt.optimize(returns, other)["volatility"] + 1e-9


def test_max_sharpe_beats_equal_weight(returns):
    opt = PortfolioOptimizer()
    best = opt.optimize(returns, "max_sharpe")
    mu = opt.expected_returns_.to_numpy()
    cov = opt.covariance_.to_numpy()
    equal = opt.portfolio_stats(np.full(4, 0.25), mu, cov)
    assert best["sharpe_ratio"] >= equal["sharpe_ratio"] - 1e-9


def test_target_return_respected(returns):
    opt = PortfolioOptimizer()
    low = opt.optimize(returns, "min_variance")["expected_return"]
    high = opt.optimize(returns, "max_return")["expected_return"]
    target = (low + high) / 2
    result = opt.optimize(returns, "target_return", target_return=target)
    assert result["expected_return"] >= target - 1e-6


def test_unreachable_target_rejected(returns):
    with pytest.raises(OptimizationError):
        PortfolioOptimizer().optimize(returns, "target_return", target_return=5.0)


def test_infeasible_bounds_rejected(returns):
    with pytest.raises(OptimizationError):
        PortfolioOptimizer().optimize(returns, max_weight=0.2)


def test_requires_two_assets_and_history(returns):
    opt = PortfolioOptimizer()
    with pytest.raises(OptimizationError):
        opt.optimize(returns[["A"]])
    with pytest.raises(OptimizationError):
        opt.optimize(returns.head(10))


def test_unknown_objective_rejected(returns):
    with pytest.raises(OptimizationError):
        PortfolioOptimizer().optimize(returns, "magic")


def test_all_negative_returns_fall_back_to_min_variance():
    rng = np.random.default_rng(3)
    df = pd.DataFrame(rng.normal(-0.002, 0.01, (200, 3)), columns=list("XYZ"))
    result = PortfolioOptimizer().optimize(df, "max_sharpe")
    assert result["effective_objective"] == "min_variance"
    assert "note" in result


def test_risk_parity_equalises_contributions(returns):
    result = PortfolioOptimizer().optimize(returns, "risk_parity")
    w = np.array(list(result["weights"].values()))
    cov = PortfolioOptimizer().estimate_covariance(returns).to_numpy()
    contrib = w * (cov @ w)
    contrib /= contrib.sum()
    assert np.max(np.abs(contrib - 0.25)) < 0.02


def test_frontier_volatility_increases_with_return(returns):
    frontier = PortfolioOptimizer().efficient_frontier(returns, 8)
    assert len(frontier) >= 4
    vols = [p["volatility"] for p in frontier]
    assert vols == sorted(vols)


def test_higher_risk_tolerance_lowers_aversion():
    assert risk_tolerance_to_aversion(1.0) < risk_tolerance_to_aversion(0.0)


def test_shrunk_returns_pull_toward_mean(returns):
    opt = PortfolioOptimizer()
    raw = opt.estimate_expected_returns(returns, "mean_historical")
    shrunk = opt.estimate_expected_returns(returns, "shrunk")
    assert shrunk.std() <= raw.std() + 1e-12


def test_blend_uses_forecast_where_available():
    hist = pd.Series({"A": 0.1, "B": 0.2})
    fc = pd.Series({"A": 0.3, "B": np.nan})
    out = blend_expected_returns(hist, fc, 0.5)
    assert out["A"] == pytest.approx(0.2)
    assert out["B"] == pytest.approx(0.2)


def test_discrete_allocation_never_exceeds_budget():
    result = discrete_allocation({"A": 0.5, "B": 0.5}, {"A": 33.3, "B": 120.0}, 10000)
    spent = sum(
        n * p
        for n, p in (
            (result["allocation"]["A"], 33.3),
            (result["allocation"]["B"], 120.0),
        )
    )
    assert spent + result["leftover"] == pytest.approx(10000)
    assert result["leftover"] >= 0


def test_walk_forward_returns_both_series(returns):
    result = walk_forward_portfolio(returns, "min_variance", lookback=120, rebalance=21)
    assert result["rebalances"] > 0
    assert "sharpe_ratio" in result["optimized"]
    assert "sharpe_ratio" in result["equal_weight"]
