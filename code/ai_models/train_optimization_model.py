import logging
from typing import Dict

import joblib
import numpy as np
import pandas as pd
from pypfopt import EfficientFrontier, expected_returns, risk_models
from pypfopt.discrete_allocation import DiscreteAllocation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

DATA_PATH = "../../../../resources/datasets/historical_trends.csv"
MODEL_PATH = "../../optimization_model.pkl"


def train_optimization_model(
    data_path: str = DATA_PATH, model_path: str = MODEL_PATH
) -> None:
    logger.info(
        f"Starting portfolio optimization model training with data from: {data_path}"
    )

    try:
        df = pd.read_csv(data_path, index_col=0, parse_dates=True)

        df = df.select_dtypes(include=[np.number])
        df.dropna(axis=1, how="all", inplace=True)
        df.dropna(inplace=True)

        if df.empty or df.shape[1] < 2:
            logger.error(
                "Insufficient or improperly formatted data for optimization. Need at least two assets."
            )
            return

        logger.info(f"Data loaded successfully. Assets: {list(df.columns)}")

        mu = expected_returns.ema_historical_return(df, span=500)
        S = risk_models.CovarianceShrinkage(df).ledoit_wolf()

        ef = EfficientFrontier(mu, S)
        ef.add_constraint(lambda w: w >= 0)

        ef.max_sharpe()

        cleaned_weights = ef.clean_weights(cutoff=1e-4, verbose=True)

        logger.info("Optimization complete. Portfolio performance:")
        ef.portfolio_performance(verbose=True)

        joblib.dump(cleaned_weights, model_path)
        logger.info(f"Optimal portfolio weights saved to {model_path}")

    except FileNotFoundError:
        logger.error(f"Error: Data file not found at {data_path}. Cannot train model.")
    except Exception as e:
        logger.error(f"An unexpected error occurred during optimization: {e}")


def allocate_portfolio(
    weights: Dict[str, float], latest_prices: pd.Series, total_portfolio_value: float
) -> Dict[str, int]:
    logger.info("Calculating discrete share allocation...")

    da = DiscreteAllocation(
        weights, latest_prices, total_portfolio_value=total_portfolio_value
    )

    allocation, leftover = da.lp_portfolio()

    logger.info(f"Discrete allocation: {allocation}")
    logger.info(f"Funds remaining: ${leftover:.2f}")

    return allocation


if __name__ == "__main__":
    logger.info(
        "Script executed. To run a full training, ensure data is available at the specified path."
    )
