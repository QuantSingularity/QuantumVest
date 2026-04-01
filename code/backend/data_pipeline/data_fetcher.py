"""
Data Fetcher Module
Core module for fetching financial data from various sources
"""

import logging
import os
import time
from abc import ABC, abstractmethod
from typing import Optional

import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DataFetcher(ABC):
    """Abstract base class for data fetchers"""

    def __init__(self, cache_dir: str = "../../resources/data_cache") -> None:
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "QuantumVest/2.0"})

    @abstractmethod
    def fetch_data(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        interval: str = "1d",
    ) -> pd.DataFrame:
        pass

    def _get_cache_path(self, symbol: str, interval: str) -> str:
        return os.path.join(self.cache_dir, f"{symbol}_{interval}.csv")

    def _load_from_cache(self, symbol: str, interval: str) -> Optional[pd.DataFrame]:
        cache_path = self._get_cache_path(symbol, interval)
        if os.path.exists(cache_path):
            if time.time() - os.path.getmtime(cache_path) < 3600:
                try:
                    df = pd.read_csv(cache_path, parse_dates=["timestamp"])
                    if not df.empty:
                        return df
                except Exception as e:
                    logger.warning(f"Failed to load cache for {symbol}: {e}")
        return None

    def _save_to_cache(self, df: pd.DataFrame, symbol: str, interval: str) -> None:
        if df is not None and not df.empty:
            cache_path = self._get_cache_path(symbol, interval)
            try:
                df.to_csv(cache_path, index=False)
            except Exception as e:
                logger.warning(f"Failed to save cache for {symbol}: {e}")

    def _handle_request_error(self, response: requests.Response, symbol: str) -> None:
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error fetching data for {symbol}: {e}")
            if response.status_code == 429:
                logger.warning("Rate limit exceeded, waiting 60s...")
                time.sleep(60)
            raise
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            raise


class DataValidator:
    """Validates financial data for consistency and quality"""

    @staticmethod
    def validate_dataframe(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
        if df is None or df.empty:
            logger.warning(f"Empty dataframe for {symbol}")
            return pd.DataFrame()

        df = df.copy()

        required_columns = ["timestamp", "open", "high", "low", "close", "volume"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            logger.warning(f"Missing columns for {symbol}: {missing_columns}")
            for col in missing_columns:
                if col == "timestamp" and "date" in df.columns:
                    df["timestamp"] = df["date"]
                elif col == "close" and "adjclose" in df.columns:
                    df["close"] = df["adjclose"]
                elif col == "volume":
                    df["volume"] = 0

        if "timestamp" in df.columns:
            if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
                try:
                    if df["timestamp"].dtype == "int64":
                        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")
                    else:
                        df["timestamp"] = pd.to_datetime(df["timestamp"])
                except Exception as e:
                    logger.error(f"Failed to convert timestamp for {symbol}: {e}")

        df = df.drop_duplicates(subset=["timestamp"])
        df = df.sort_values("timestamp").reset_index(drop=True)

        numeric_cols = ["open", "high", "low", "close", "volume"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        if df.isnull().sum().sum() > 0:
            logger.warning(f"Missing values in {symbol} data, forward-filling")
            df = df.ffill().bfill()

        return df
