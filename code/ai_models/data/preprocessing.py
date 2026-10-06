import logging
from typing import Dict, Tuple

import numpy as np
import pandas as pd

from ai_models.data.features import FEATURE_COLUMNS, normalize_ohlcv, supervised_frame

logger = logging.getLogger(__name__)

MAX_DAILY_MOVE = 0.5


def clean_market_data(df: pd.DataFrame) -> pd.DataFrame:
    frame = normalize_ohlcv(df)
    jump = frame["close"].pct_change().abs()
    removed = int((jump > MAX_DAILY_MOVE).sum())
    if removed:
        logger.warning(
            "Dropping %d rows with daily moves above %.0f%%",
            removed,
            MAX_DAILY_MOVE * 100,
        )
        frame = frame[~(jump > MAX_DAILY_MOVE)]
    return frame


def build_supervised_dataset(
    df: pd.DataFrame,
) -> Tuple[np.ndarray, np.ndarray, pd.DatetimeIndex]:
    dataset = supervised_frame(normalize_ohlcv(df))
    return (
        dataset[FEATURE_COLUMNS].to_numpy(dtype=float),
        dataset["target"].to_numpy(dtype=float),
        dataset.index,
    )


def build_return_matrix(frames: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    closes = {name: normalize_ohlcv(frame)["close"] for name, frame in frames.items()}
    prices = pd.DataFrame(closes).dropna()
    return prices.pct_change().dropna()


def chronological_split(
    df: pd.DataFrame, train_fraction: float = 0.8
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    if not 0.1 <= train_fraction <= 0.95:
        raise ValueError("train_fraction must be between 0.1 and 0.95")
    cut = int(len(df) * train_fraction)
    return df.iloc[:cut], df.iloc[cut:]
