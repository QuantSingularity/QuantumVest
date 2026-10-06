import json
import os

import pandas as pd
import pytest

from ai_models.data.preprocessing import (
    build_return_matrix,
    build_supervised_dataset,
    chronological_split,
    clean_market_data,
)
from ai_models.exceptions import AIModelsError, DataError, PredictionError
from ai_models.serving.registry import ModelStore
from ai_models.tests.helpers import make_ohlcv
from ai_models.training import optimization, pipeline, prediction


@pytest.fixture
def csv_dir(tmp_path):
    for i, name in enumerate(("aapl", "msft", "btc")):
        make_ohlcv(450, seed=i).to_csv(tmp_path / f"{name}.csv", index=False)
    return tmp_path


def test_exceptions_share_a_base():
    assert issubclass(DataError, AIModelsError)
    assert issubclass(PredictionError, AIModelsError)
    assert PredictionError("x", "code").code == "code"


def test_chronological_split_preserves_order(ohlcv):
    train, test = chronological_split(ohlcv, 0.75)
    assert len(train) + len(test) == len(ohlcv)
    assert train["timestamp"].max() < test["timestamp"].min()
    with pytest.raises(ValueError):
        chronological_split(ohlcv, 0.99)


def test_clean_market_data_drops_extreme_jumps(ohlcv):
    df = ohlcv.copy()
    df.loc[50, "close"] = df.loc[49, "close"] * 3
    assert len(clean_market_data(df)) < len(ohlcv)


def test_supervised_dataset_aligned(ohlcv):
    X, y, index = build_supervised_dataset(ohlcv)
    assert len(X) == len(y) == len(index)


def test_return_matrix_aligns_assets(ohlcv):
    other = make_ohlcv(500, seed=5)
    matrix = build_return_matrix({"A": ohlcv, "B": other})
    assert list(matrix.columns) == ["A", "B"]
    assert not matrix.isna().any().any()


def test_prediction_cli_saves_loadable_model(csv_dir, tmp_path):
    out = tmp_path / "models"
    code = prediction.main(
        [
            "--symbol", "AAPL",
            "--data-path", str(csv_dir / "aapl.csv"),
            "--model-type", "xgboost",
            "--output-dir", str(out),
        ]
    )
    assert code == 0
    assert ModelStore(str(out)).load("stock", "AAPL", "xgboost") is not None


def test_optimization_cli_writes_weights(csv_dir, tmp_path):
    prices = pd.concat(
        [make_ohlcv(450, seed=i).set_index("timestamp")["close"].rename(n) for i, n in enumerate(("A", "B", "C"))],
        axis=1,
    )
    path = tmp_path / "prices.csv"
    prices.to_csv(path)
    out = tmp_path / "weights.json"
    code = optimization.main(
        ["--data-path", str(path), "--objective", "min_variance", "--output", str(out), "--evaluate"]
    )
    assert code == 0
    result = json.loads(out.read_text())
    assert sum(result["weights"].values()) == pytest.approx(1.0)
    assert "walk_forward" in result


def test_pipeline_end_to_end(csv_dir, tmp_path):
    out = tmp_path / "models"
    code = pipeline.main(
        [
            "--symbols", "AAPL", "MSFT", "BTC:crypto",
            "--data-dir", str(csv_dir),
            "--model-types", "xgboost",
            "--output-dir", str(out),
        ]
    )
    assert code == 0
    reports = [f for f in os.listdir(out) if f.startswith("training_report_")]
    assert len(reports) == 1
    report = json.loads((out / reports[0]).read_text())
    assert set(report["prediction"]) == {"AAPL", "MSFT", "BTC"}
    assert "portfolio" in report and "risk" in report
    assert len(ModelStore(str(out)).list_models()) == 3
