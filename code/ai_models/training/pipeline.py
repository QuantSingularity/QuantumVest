import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

if __package__ in (None, ""):
    sys.path.insert(
        0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )

import pandas as pd

from ai_models.data.loaders import default_model_dir, fetch_ohlcv, load_ohlcv_csv
from ai_models.data.preprocessing import (
    build_return_matrix,
    chronological_split,
    clean_market_data,
)
from ai_models.evaluation.backtest import evaluate_predictor, walk_forward_portfolio
from ai_models.models.constants import ENSEMBLE, MODEL_TYPES
from ai_models.models.predictor import TimeSeriesPredictor
from ai_models.portfolio.optimizer import PortfolioOptimizer
from ai_models.risk.assessment import RiskAssessmentModel
from ai_models.serving.registry import (
    ModelStore,
    normalize_asset_type,
    normalize_symbol,
)

logger = logging.getLogger(__name__)

DEFAULT_SYMBOLS = {"AAPL": "stock", "MSFT": "stock", "GOOGL": "stock", "BTC": "crypto"}


class ModelTrainer:
    def __init__(self, store: ModelStore, epochs: int = 60) -> None:
        self.store = store
        self.epochs = epochs

    def train_prediction_models(
        self,
        data: Dict[str, pd.DataFrame],
        asset_types: Dict[str, str],
        model_types: List[str],
    ) -> Dict[str, Any]:
        results: Dict[str, Any] = {}
        for symbol, frame in data.items():
            asset_type = asset_types.get(symbol, "stock")
            calendar = "D" if asset_type == "crypto" else "B"
            train, test = chronological_split(frame, 0.8)
            per_model: Dict[str, Any] = {}
            for model_type in model_types:
                try:
                    probe = TimeSeriesPredictor(model_type, calendar=calendar)
                    probe.fit(train, epochs=self.epochs)
                    holdout = evaluate_predictor(probe, frame, test.index[0])
                    final = TimeSeriesPredictor(model_type, calendar=calendar)
                    info = final.fit(frame, epochs=self.epochs)
                    path = self.store.save(final, asset_type, symbol)
                    per_model[model_type] = {
                        "path": path,
                        "validation_metrics": info["metrics"],
                        "holdout_metrics": holdout,
                    }
                except Exception as exc:
                    logger.error("Training %s for %s failed: %s", model_type, symbol, exc)
                    per_model[model_type] = {"error": str(exc)}
            results[symbol] = per_model
        return results

    def evaluate_portfolio(self, returns: pd.DataFrame) -> Dict[str, Any]:
        optimizer = PortfolioOptimizer()
        output: Dict[str, Any] = {"assets": list(returns.columns)}
        for objective in ("max_sharpe", "min_variance", "risk_parity"):
            try:
                output[objective] = optimizer.optimize(returns, objective, max_weight=0.5)
            except ValueError as exc:
                output[objective] = {"error": str(exc)}
        try:
            output["walk_forward"] = walk_forward_portfolio(
                returns, "min_variance", max_weight=0.5
            )
        except ValueError as exc:
            output["walk_forward"] = {"error": str(exc)}
        return output

    def risk_report(self, returns: pd.DataFrame) -> Dict[str, Any]:
        model = RiskAssessmentModel()
        weights = {c: 1.0 / returns.shape[1] for c in returns.columns}
        return {
            "assets": {c: model.risk_summary(returns[c]) for c in returns.columns},
            "equal_weight_portfolio": model.risk_summary(
                model.portfolio_returns(returns, weights)
            ),
            "stress_test": model.stress_test(weights, returns),
            "risk_contributions": model.risk_contributions(returns, weights),
        }


def load_universe(
    symbols: Dict[str, str], data_dir: Optional[str], period: str
) -> Dict[str, pd.DataFrame]:
    frames: Dict[str, pd.DataFrame] = {}
    for symbol, asset_type in symbols.items():
        try:
            if data_dir:
                frame = load_ohlcv_csv(os.path.join(data_dir, f"{symbol.lower()}.csv"))
            else:
                frame = fetch_ohlcv(symbol, asset_type, period)
            frames[symbol] = clean_market_data(frame)
        except Exception as exc:
            logger.error("Skipping %s: %s", symbol, exc)
    return frames


def parse_symbols(values: Optional[List[str]]) -> Dict[str, str]:
    if not values:
        return dict(DEFAULT_SYMBOLS)
    parsed: Dict[str, str] = {}
    for item in values:
        symbol, _, kind = item.partition(":")
        parsed[normalize_symbol(symbol)] = normalize_asset_type(kind or "stock")
    return parsed


def main(argv: Optional[List[str]] = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    parser = argparse.ArgumentParser(description="QuantumVest end-to-end training pipeline")
    parser.add_argument("--symbols", nargs="*")
    parser.add_argument("--data-dir")
    parser.add_argument("--period", default="5y")
    parser.add_argument("--model-types", nargs="*", choices=MODEL_TYPES, default=[ENSEMBLE])
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--output-dir")
    args = parser.parse_args(argv)

    symbols = parse_symbols(args.symbols)
    frames = load_universe(symbols, args.data_dir, args.period)
    if not frames:
        logger.error("No market data available")
        return 1

    store = ModelStore(args.output_dir or default_model_dir())
    trainer = ModelTrainer(store, args.epochs)
    report: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symbols": symbols,
        "prediction": trainer.train_prediction_models(frames, symbols, args.model_types),
    }
    if len(frames) >= 2:
        returns = build_return_matrix(frames)
        report["portfolio"] = trainer.evaluate_portfolio(returns)
        report["risk"] = trainer.risk_report(returns)

    out = os.path.join(
        store.base_dir, f"training_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(out, "w") as fh:
        json.dump(report, fh, indent=2, default=str)
    logger.info("Report written to %s", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
