import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

if __package__ in (None, ""):
    sys.path.insert(
        0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )

import pandas as pd
from ai_models.data.loaders import default_model_dir, fetch_ohlcv, load_price_matrix
from ai_models.evaluation.backtest import walk_forward_portfolio
from ai_models.portfolio.allocation import discrete_allocation
from ai_models.portfolio.optimizer import (
    COVARIANCE_METHODS,
    OBJECTIVES,
    RETURN_METHODS,
    PortfolioOptimizer,
)

logger = logging.getLogger(__name__)


def load_prices(
    data_path: Optional[str], symbols: Optional[List[str]], period: str
) -> pd.DataFrame:
    if data_path:
        return load_price_matrix(data_path)
    if not symbols or len(symbols) < 2:
        raise ValueError("Provide --data-path or at least two --symbols")
    closes = {s: fetch_ohlcv(s, "stock", period)["close"] for s in symbols}
    return pd.DataFrame(closes).dropna()


def train_optimization_model(
    prices: pd.DataFrame,
    objective: str = "max_sharpe",
    min_weight: float = 0.0,
    max_weight: float = 1.0,
    return_method: str = "shrunk",
    covariance_method: str = "ledoit_wolf",
    risk_free_rate: float = 0.02,
    total_value: Optional[float] = None,
    evaluate: bool = False,
    target_return: Optional[float] = None,
    risk_aversion: float = 5.0,
) -> Dict[str, Any]:
    returns = prices.pct_change().dropna()
    optimizer = PortfolioOptimizer(risk_free_rate=risk_free_rate)
    result = optimizer.optimize(
        returns,
        objective,
        min_weight=min_weight,
        max_weight=max_weight,
        return_method=return_method,
        covariance_method=covariance_method,
        target_return=target_return,
        risk_aversion=risk_aversion,
    )
    if total_value:
        result["discrete_allocation"] = discrete_allocation(
            result["weights"], prices.iloc[-1].to_dict(), total_value
        )
    if evaluate:
        result["walk_forward"] = walk_forward_portfolio(
            returns,
            objective if objective != "target_return" else "min_variance",
            min_weight=min_weight,
            max_weight=max_weight,
            risk_free_rate=risk_free_rate,
            return_method=return_method,
            covariance_method=covariance_method,
        )
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Compute QuantumVest portfolio weights"
    )
    parser.add_argument("--data-path")
    parser.add_argument(
        "--symbols", type=lambda v: [s.strip() for s in v.split(",") if s.strip()]
    )
    parser.add_argument("--period", default="5y")
    parser.add_argument("--objective", choices=OBJECTIVES, default="max_sharpe")
    parser.add_argument("--min-weight", type=float, default=0.0)
    parser.add_argument("--max-weight", type=float, default=1.0)
    parser.add_argument("--return-method", choices=RETURN_METHODS, default="shrunk")
    parser.add_argument(
        "--covariance-method", choices=COVARIANCE_METHODS, default="ledoit_wolf"
    )
    parser.add_argument("--risk-free-rate", type=float, default=0.02)
    parser.add_argument("--target-return", type=float)
    parser.add_argument("--risk-aversion", type=float, default=5.0)
    parser.add_argument("--total-value", type=float)
    parser.add_argument("--evaluate", action="store_true")
    parser.add_argument("--output")
    return parser


def main(argv: Optional[list] = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    args = build_parser().parse_args(argv)
    prices = load_prices(args.data_path, args.symbols, args.period)
    result = train_optimization_model(
        prices,
        objective=args.objective,
        min_weight=args.min_weight,
        max_weight=args.max_weight,
        return_method=args.return_method,
        covariance_method=args.covariance_method,
        risk_free_rate=args.risk_free_rate,
        total_value=args.total_value,
        evaluate=args.evaluate,
        target_return=args.target_return,
        risk_aversion=args.risk_aversion,
    )
    output = args.output or os.path.join(
        default_model_dir(), "optimization_weights.json"
    )
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    with open(output, "w") as fh:
        json.dump(result, fh, indent=2)
    logger.info("Weights written to %s", output)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
