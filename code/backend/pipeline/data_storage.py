import logging
import os
import time
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

_KINDS = ("stocks", "crypto")


class DataStorage:
    def __init__(self, data_dir: str = "resources/data") -> None:
        self.data_dir = data_dir
        self._stock_dir = os.path.join(data_dir, "stocks")
        self._crypto_dir = os.path.join(data_dir, "crypto")
        for d in (self._stock_dir, self._crypto_dir):
            os.makedirs(d, exist_ok=True)

    def _path(self, directory: str, symbol: str) -> str:
        name = os.path.basename(str(symbol).lower())
        if not name or name in (".", "..") or name != str(symbol).lower():
            raise ValueError(f"Invalid symbol: {symbol!r}")
        return os.path.join(directory, f"{name}.csv")

    def _save(self, directory: str, df: pd.DataFrame, symbol: str, label: str) -> str:
        if df is None or df.empty:
            logger.warning("Empty DataFrame for %s, not saved.", symbol)
            return ""
        path = self._path(directory, symbol)
        tmp = f"{path}.{os.getpid()}.tmp"
        try:
            df.to_csv(tmp, index=False)
            os.replace(tmp, path)
            logger.info("Saved %s data: %s -> %s", label, symbol, path)
            return path
        except Exception as exc:
            logger.error("Error saving %s %s: %s", label, symbol, exc)
            if os.path.exists(tmp):
                os.remove(tmp)
            return ""

    def _load(self, directory: str, symbol: str, label: str) -> Optional[pd.DataFrame]:
        path = self._path(directory, symbol)
        if not os.path.exists(path):
            return None
        try:
            df = pd.read_csv(path)
            if "timestamp" in df.columns:
                df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True).dt.tz_localize(None)
            return df
        except Exception as exc:
            logger.error("Error loading %s %s: %s", label, symbol, exc)
            return None

    def save_stock_data(self, df: pd.DataFrame, symbol: str) -> str:
        return self._save(self._stock_dir, df, symbol, "stock")

    def load_stock_data(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._load(self._stock_dir, symbol, "stock")

    def save_crypto_data(self, df: pd.DataFrame, symbol: str) -> str:
        return self._save(self._crypto_dir, df, symbol, "crypto")

    def load_crypto_data(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._load(self._crypto_dir, symbol, "crypto")

    def age_seconds(self, asset_type: str, symbol: str) -> Optional[float]:
        directory = self._crypto_dir if asset_type == "crypto" else self._stock_dir
        try:
            return max(0.0, time.time() - os.path.getmtime(self._path(directory, symbol)))
        except (OSError, ValueError):
            return None
