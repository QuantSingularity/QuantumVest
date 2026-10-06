import threading

import pytest
from ai_models.exceptions import DataError, InvalidSymbolError, PredictionError
from ai_models.serving.engine import PredictionEngine
from ai_models.serving.registry import (
    ModelStore,
    normalize_asset_type,
    normalize_symbol,
)
from ai_models.tests.helpers import make_ohlcv


@pytest.mark.parametrize(
    "bad", ["", "../etc", "A/B", "A B", "..", "A..B", "X" * 30, None]
)
def test_bad_symbols_rejected(bad):
    with pytest.raises(InvalidSymbolError):
        normalize_symbol(bad)


@pytest.mark.parametrize("good", ["aapl", "BTC-USD", "BRK.B", "x1"])
def test_good_symbols_normalised(good):
    assert normalize_symbol(good) == good.upper()


def test_bad_asset_type_rejected():
    with pytest.raises(ValueError):
        normalize_asset_type("bond")


def make_engine(tmp_path, frames=None, calls=None):
    frames = frames if frames is not None else {}

    def provider(symbol, asset_type, refresh):
        if calls is not None:
            calls.append((symbol, refresh))
        if symbol not in frames:
            raise DataError("no data")
        return frames[symbol]

    return PredictionEngine(
        ModelStore(str(tmp_path)), provider, default_model="xgboost"
    )


def test_predict_trains_once_then_reuses(tmp_path):
    engine = make_engine(tmp_path, {"AAPL": make_ohlcv(400)})
    first = engine.predict("aapl", "stock", steps=3)
    assert first["success"] and len(first["forecast"]) == 3
    assert engine.store.exists("stock", "AAPL", "xgboost")
    trained_at = first["model"]["trained_at"]
    second = engine.predict("AAPL", "stock", steps=3)
    assert second["model"]["trained_at"] == trained_at


def test_no_autotrain_without_model(tmp_path):
    engine = make_engine(tmp_path, {"AAPL": make_ohlcv(400)})
    with pytest.raises(PredictionError) as exc:
        engine.predict("AAPL", auto_train=False)
    assert exc.value.code == "model_unavailable"


def test_missing_data_reported(tmp_path):
    with pytest.raises(PredictionError) as exc:
        make_engine(tmp_path).predict("NOPE")
    assert exc.value.code == "no_data"


def test_short_history_reported(tmp_path):
    engine = make_engine(tmp_path, {"AAPL": make_ohlcv(100)})
    with pytest.raises(PredictionError) as exc:
        engine.predict("AAPL")
    assert exc.value.code == "insufficient_data"


def test_step_bounds_enforced(tmp_path):
    engine = make_engine(tmp_path, {"AAPL": make_ohlcv(400)})
    with pytest.raises(PredictionError) as exc:
        engine.predict("AAPL", steps=100)
    assert exc.value.code == "invalid_request"


def test_deep_models_not_trained_online(tmp_path):
    engine = make_engine(tmp_path, {"AAPL": make_ohlcv(400)})
    with pytest.raises(PredictionError) as exc:
        engine.predict("AAPL", model_type="lstm")
    assert exc.value.code == "training_not_allowed"


def test_crypto_forecast_includes_weekends(tmp_path):
    import pandas as pd

    frame = make_ohlcv(400, freq="D")
    engine = make_engine(tmp_path, {"BTC": frame})
    result = engine.predict("BTC", "crypto", steps=10)
    days = {pd.Timestamp(r["date"]).dayofweek for r in result["forecast"]}
    assert days & {5, 6}


def test_list_models_filters(tmp_path):
    engine = make_engine(
        tmp_path, {"AAPL": make_ohlcv(400), "MSFT": make_ohlcv(400, seed=2)}
    )
    engine.predict("AAPL")
    engine.predict("MSFT")
    assert {m["symbol"] for m in engine.models()} == {"AAPL", "MSFT"}
    assert [m["symbol"] for m in engine.models(symbol="AAPL")] == ["AAPL"]


def test_concurrent_requests_train_once(tmp_path):
    calls = []
    engine = make_engine(tmp_path, {"AAPL": make_ohlcv(400)}, calls)
    results = []

    def worker():
        results.append(engine.predict("AAPL", steps=2)["model"]["trained_at"])

    threads = [threading.Thread(target=worker) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(set(results)) == 1


def test_forecast_returns_series_marks_unskilled_models(tmp_path):
    engine = make_engine(tmp_path, {"AAPL": make_ohlcv(400)})
    out = engine.annualized_forecast_returns(
        {"AAPL": "stock", "NOPE": "stock"}, horizon=5
    )
    assert out["NOPE"] != out["NOPE"]
