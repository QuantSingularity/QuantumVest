"""
Data Storage Module
Handles storage and retrieval of financial data
"""

import logging
import os
from typing import List, Optional

import pandas as pd

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DataStorage:
    """Handles storage and retrieval of financial data"""

    def __init__(self, data_dir: str = "../../resources/data") -> None:
        """
        Initialize the data storage

        Args:
            data_dir: Directory to store data
        """
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.stock_dir = os.path.join(data_dir, "stocks")
        self.crypto_dir = os.path.join(data_dir, "crypto")
        os.makedirs(self.stock_dir, exist_ok=True)
        os.makedirs(self.crypto_dir, exist_ok=True)

    def save_stock_data(self, df: pd.DataFrame, symbol: str) -> str:
        """
        Save stock data to CSV

        Args:
            df: DataFrame with stock data
            symbol: Stock symbol

        Returns:
            Path to saved file
        """
        if df is None or df.empty:
            logger.warning(f"Empty dataframe for {symbol}, not saving")
            return ""
        file_path = os.path.join(self.stock_dir, f"{symbol.lower()}.csv")
        try:
            df.to_csv(file_path, index=False)
            logger.info(f"Saved stock data for {symbol} to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Error saving stock data for {symbol}: {e}")
            return ""

    def save_crypto_data(self, df: pd.DataFrame, symbol: str) -> str:
        """
        Save cryptocurrency data to CSV

        Args:
            df: DataFrame with cryptocurrency data
            symbol: Cryptocurrency symbol

        Returns:
            Path to saved file
        """
        if df is None or df.empty:
            logger.warning(f"Empty dataframe for {symbol}, not saving")
            return ""
        file_path = os.path.join(self.crypto_dir, f"{symbol.lower()}.csv")
        try:
            df.to_csv(file_path, index=False)
            logger.info(f"Saved crypto data for {symbol} to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Error saving crypto data for {symbol}: {e}")
            return ""

    def load_stock_data(self, symbol: str) -> Optional[pd.DataFrame]:
        """
        Load stock data from CSV

        Args:
            symbol: Stock symbol

        Returns:
            DataFrame with stock data or None if not found
        """
        file_path = os.path.join(self.stock_dir, f"{symbol.lower()}.csv")
        if os.path.exists(file_path):
            try:
                df = pd.read_csv(file_path)
                if "timestamp" in df.columns:
                    df["timestamp"] = pd.to_datetime(df["timestamp"])
                logger.info(f"Loaded stock data for {symbol} from {file_path}")
                return df
            except Exception as e:
                logger.error(f"Error loading stock data for {symbol}: {e}")
        else:
            logger.warning(f"No data file found for stock {symbol}")
        return None

    def load_crypto_data(self, symbol: str) -> Optional[pd.DataFrame]:
        """
        Load cryptocurrency data from CSV

        Args:
            symbol: Cryptocurrency symbol

        Returns:
            DataFrame with cryptocurrency data or None if not found
        """
        file_path = os.path.join(self.crypto_dir, f"{symbol.lower()}.csv")
        if os.path.exists(file_path):
            try:
                df = pd.read_csv(file_path)
                if "timestamp" in df.columns:
                    df["timestamp"] = pd.to_datetime(df["timestamp"])
                logger.info(f"Loaded crypto data for {symbol} from {file_path}")
                return df
            except Exception as e:
                logger.error(f"Error loading crypto data for {symbol}: {e}")
        else:
            logger.warning(f"No data file found for crypto {symbol}")
        return None

    def get_available_stocks(self) -> List[str]:
        """
        Get list of available stock symbols

        Returns:
            List of stock symbols
        """
        try:
            files = os.listdir(self.stock_dir)
            symbols = [f.split(".")[0].upper() for f in files if f.endswith(".csv")]
            return symbols
        except Exception as e:
            logger.error(f"Error getting available stocks: {e}")
            return []

    def get_available_cryptos(self) -> List[str]:
        """
        Get list of available cryptocurrency symbols

        Returns:
            List of cryptocurrency symbols
        """
        try:
            files = os.listdir(self.crypto_dir)
            symbols = [f.split(".")[0].lower() for f in files if f.endswith(".csv")]
            return symbols
        except Exception as e:
            logger.error(f"Error getting available cryptos: {e}")
            return []
