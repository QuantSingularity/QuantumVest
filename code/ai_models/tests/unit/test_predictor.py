import numpy as np
import pytest

from ai_models.evaluation.metrics import score_predictions
from ai_models.exceptions import DataError, NotTrainedError
from ai_models.models.predictor import TimeSeriesPredictor


def test_fit_produces_honest_metrics(ohlcv):
    predictor = TimeSeriesPredictor("xgboost")
    info = predictor.fit(ohlcv)
    assert predictor.is_trained
    assert info["metrics"]["samples"] > 0
    assert 0.0 <= info["metrics"]["directional_accuracy"] <= 1.0
    assert info["metrics"]["baseline_rmse"] > 0


def test_ensemble_weights_sum_to_one(ohlcv):
    predictor = TimeSeriesPredictor("ensemble")
    predictor.fit(ohlcv)
    assert predictor.weights
    assert sum(predictor.weights.values()) == pytest.approx(1.0)


def test_forecast_shape_and_bands(ohlcv):
    predictor = TimeSeriesPredictor("lightgbm")
    predictor.fit(ohlcv)
    rows = predictor.forecast(ohlcv, 5)
    assert [r["step"] for r in rows] == [1, 2, 3, 4, 5]
    for row in rows:
        assert row["lower"] < row["predicted_price"] < row["upper"]
    widths = [r["upper"] - r["lower"] for r in rows]
    assert widths == sorted(widths)
    dates = [r["date"] for r in rows]
    assert dates == sorted(set(dates))


def test_business_calendar_skips_weekends(ohlcv):
    predictor = TimeSeriesPredictor("random_forest", calendar="B")
    predictor.fit(ohlcv)
    import pandas as pd

    for row in predictor.forecast(ohlcv, 10):
        assert pd.Timestamp(row["date"]).dayofweek < 5


def test_forecast_is_deterministic(ohlcv):
    a = TimeSeriesPredictor("xgboost")
    a.fit(ohlcv)
    b = TimeSeriesPredictor("xgboost")
    b.fit(ohlcv)
    assert a.forecast(ohlcv, 3) == b.forecast(ohlcv, 3)


def test_save_load_roundtrip(tmp_path, ohlcv):
    predictor = TimeSeriesPredictor("ensemble")
    predictor.fit(ohlcv)
    predictor.save(str(tmp_path / "model"))
    loaded = TimeSeriesPredictor.load(str(tmp_path / "model"))
    assert loaded.forecast(ohlcv, 3) == predictor.forecast(ohlcv, 3)


def test_untrained_raises(ohlcv):
    with pytest.raises(NotTrainedError):
        TimeSeriesPredictor("xgboost").forecast(ohlcv, 3)


def test_insufficient_data_rejected(ohlcv):
    with pytest.raises(DataError):
        TimeSeriesPredictor("xgboost").fit(ohlcv.head(80))


def test_invalid_model_type_rejected():
    with pytest.raises(ValueError):
        TimeSeriesPredictor("nonsense")


def test_step_bounds(ohlcv):
    predictor = TimeSeriesPredictor("xgboost")
    predictor.fit(ohlcv)
    with pytest.raises(ValueError):
        predictor.forecast(ohlcv, 0)
    with pytest.raises(ValueError):
        predictor.forecast(ohlcv, 500)


def test_score_predictions_perfect_and_zero():
    y = np.array([0.01, -0.02, 0.03, -0.01])
    perfect = score_predictions(y, y)
    assert perfect["rmse"] == 0
    assert perfect["directional_accuracy"] == 1.0
    zero = score_predictions(y, np.zeros_like(y))
    assert zero["skill_vs_naive"] == pytest.approx(0.0)


def test_lstm_trains_and_roundtrips(tmp_path, ohlcv):
    pytest.importorskip("tensorflow")
    predictor = TimeSeriesPredictor("lstm", sequence_length=20)
    predictor.fit(ohlcv, epochs=2)
    predictor.save(str(tmp_path / "lstm"))
    loaded = TimeSeriesPredictor.load(str(tmp_path / "lstm"))
    assert loaded.forecast(ohlcv, 2) == pytest.approx(predictor.forecast(ohlcv, 2))
