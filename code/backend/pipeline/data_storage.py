"""
Local filesystem cache for OHLCV DataFrames (CSV).
"""

import logging
import os
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


class DataStorage:
    """Read/write OHLCV DataFrames from/to local CSV files."""

    def __init__(self, data_dir: str = "resources/data") -> None:
        self.data_dir = data_dir
        self._stock_dir = os.path.join(data_dir, "stocks")
        self._crypto_dir = os.path.join(data_dir, "crypto")
        for d in (self._stock_dir, self._crypto_dir):
            os.makedirs(d, exist_ok=True)

    # ------------------------------------------------------------------
    # Stocks
    # ------------------------------------------------------------------

    def save_stock_data(self, df: pd.DataFrame, symbol: str) -> str:
        if df is None or df.empty:
            logger.warning("Empty DataFrame for %s - not saved.", symbol)
            return ""
        path = os.path.join(self._stock_dir, f"{symbol.lower()}.csv")
        try:
            df.to_csv(path, index=False)
            logger.info("Saved stock data: %s → %s", symbol, path)
            return path
        except Exception as exc:
            logger.error("Error saving stock %s: %s", symbol, exc)
            return ""

    def load_stock_data(self, symbol: str) -> Optional[pd.DataFrame]:
        path = os.path.join(self._stock_dir, f"{symbol.lower()}.csv")
        if not os.path.exists(path):
            return None
        try:
            df = pd.read_csv(path)
            if "timestamp" in df.columns:
                df["timestamp"] = pd.to_datetime(df["timestamp"])
            return df
        except Exception as exc:
            logger.error("Error loading stock %s: %s", symbol, exc)
            return None

    # ------------------------------------------------------------------
    # Crypto
    # ------------------------------------------------------------------

    def save_crypto_data(self, df: pd.DataFrame, symbol: str) -> str:
        if df is None or df.empty:
            logger.warning("Empty DataFrame for %s - not saved.", symbol)
            return ""
        path = os.path.join(self._crypto_dir, f"{symbol.lower()}.csv")
        try:
            df.to_csv(path, index=False)
            logger.info("Saved crypto data: %s → %s", symbol, path)
            return path
        except Exception as exc:
            logger.error("Error saving crypto %s: %s", symbol, exc)
            return ""

    def load_crypto_data(self, symbol: str) -> Optional[pd.DataFrame]:
        path = os.path.join(self._crypto_dir, f"{symbol.lower()}.csv")
        if not os.path.exists(path):
            return None
        try:
            df = pd.read_csv(path)
            if "timestamp" in df.columns:
                df["timestamp"] = pd.to_datetime(df["timestamp"])
            return df
        except Exception as exc:
            logger.error("Error loading crypto %s: %s", symbol, exc)
            return None
