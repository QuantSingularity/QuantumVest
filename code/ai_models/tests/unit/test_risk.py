import numpy as np
import pytest

from ai_models.risk import RiskAssessmentModel


@pytest.fixture
def model():
    return RiskAssessmentModel()


@pytest.mark.parametrize("method", ["historical", "parametric", "cornish_fisher", "bootstrap"])
def test_var_is_negative_loss(model, returns, method):
    assert model.value_at_risk(returns["A"], 0.05, method) < 0


def test_var_99_worse_than_95(model, returns):
    r = returns["B"]
    assert model.value_at_risk(r, 0.01) < model.value_at_risk(r, 0.05)


def test_expected_shortfall_worse_than_var(model, returns):
    r = returns["B"]
    assert model.expected_shortfall(r, 0.05) <= model.value_at_risk(r, 0.05)


def test_horizon_scales_var(model, returns):
    r = returns["A"]
    assert model.value_at_risk(r, 0.05, "parametric", 10) < model.value_at_risk(r, 0.05)


def test_invalid_inputs_rejected(model):
    with pytest.raises(ValueError):
        model.value_at_risk([0.01], 0.05)
    with pytest.raises(ValueError):
        model.value_at_risk([0.01, 0.02, -0.01], 0.9)
    with pytest.raises(ValueError):
        model.value_at_risk([0.01, 0.02, -0.01], 0.05, "unknown")


def test_nan_values_ignored(model):
    r = np.array([0.01, np.nan, -0.02, 0.005, np.inf, -0.01])
    assert np.isfinite(model.value_at_risk(r, 0.25))


def test_max_drawdown_known_value(model):
    assert model.max_drawdown([0.1, -0.5, 0.2]) == pytest.approx(-0.5)


def test_risk_contributions_sum_to_one(model, returns):
    weights = {c: 0.25 for c in returns.columns}
    contrib = model.risk_contributions(returns, weights)
    assert sum(contrib.values()) == pytest.approx(1.0)


def test_stress_test_applies_shocks(model, returns):
    weights = {c: 0.25 for c in returns.columns}
    result = model.stress_test(
        weights,
        returns,
        {"crash": {"default_shock": -0.2, "shocks": {"A": -0.4}, "volatility_multiplier": 2.0}},
    )
    assert result["crash"]["portfolio_shock"] == pytest.approx(-0.25 * 0.4 - 0.75 * 0.2)
    base = model.value_at_risk(model.portfolio_returns(returns, weights), 0.05)
    assert result["crash"]["stressed_var_95"] < base


def test_weights_length_mismatch_rejected(model, returns):
    with pytest.raises(ValueError):
        model.portfolio_returns(returns, [0.5, 0.5])
