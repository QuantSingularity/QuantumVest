import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, Optional

if __package__ in (None, ""):
    sys.path.insert(
        0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )

from ai_models.data.loaders import default_model_dir, fetch_ohlcv, load_ohlcv_csv
from ai_models.models.constants import ENSEMBLE, MODEL_TYPES
from ai_models.models.predictor import TimeSeriesPredictor
from ai_models.serving.registry import (
    ModelStore,
    normalize_asset_type,
    normalize_symbol,
)

logger = logging.getLogger(__name__)


def train_prediction_model(
    symbol: str,
    asset_type: str = "stock",
    model_type: str = ENSEMBLE,
    data_path: Optional[str] = None,
    period: str = "5y",
    days: Optional[int] = None,
    epochs: int = 60,
    output_dir: Optional[str] = None,
) -> Dict[str, Any]:
    symbol = normalize_symbol(symbol)
    asset_type = normalize_asset_type(asset_type)
    frame = (
        load_ohlcv_csv(data_path)
        if data_path
        else fetch_ohlcv(symbol, asset_type, period)
    )
    if days:
        frame = frame.tail(int(days))
    logger.info("Training %s on %d rows for %s", model_type, len(frame), symbol)
    predictor = TimeSeriesPredictor(
        model_type, calendar="D" if asset_type == "crypto" else "B"
    )
    info = predictor.fit(frame, epochs=epochs)
    store = ModelStore(output_dir or default_model_dir())
    path = store.save(predictor, asset_type, symbol)
    logger.info("Model saved to %s", path)
    return {"symbol": symbol, "asset_type": asset_type, "path": path, **info}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train a QuantumVest forecasting model")
    parser.add_argument("--symbol", "--asset", dest="symbol", required=True)
    parser.add_argument("--asset-type", choices=("stock", "crypto"), default="stock")
    parser.add_argument("--model-type", choices=MODEL_TYPES, default=ENSEMBLE)
    parser.add_argument("--data-path")
    parser.add_argument("--period", default="5y")
    parser.add_argument("--days", type=int)
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--output-dir")
    return parser


def main(argv: Optional[list] = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    args = build_parser().parse_args(argv)
    result = train_prediction_model(
        symbol=args.symbol,
        asset_type=args.asset_type,
        model_type=args.model_type,
        data_path=args.data_path,
        period=args.period,
        days=args.days,
        epochs=args.epochs,
        output_dir=args.output_dir,
    )
    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
