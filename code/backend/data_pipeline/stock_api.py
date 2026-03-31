"""
Stock API Module
Fetches stock market data from Yahoo Finance API
"""

import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pandas as pd

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_api import ApiClient
from data_pipeline.data_fetcher import DataFetcher, DataValidator

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class StockDataFetcher(DataFetcher):
    """Fetches stock market data from Yahoo Finance API"""

    def __init__(self, cache_dir: str = "../../resources/data_cache") -> None:
        """
        Initialize the stock data fetcher

        Args:
            cache_dir: Directory to cache fetched data
        """
        super().__init__(cache_dir)
        self.api_client = ApiClient()

    def fetch_data(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        interval: str = "1d",
    ) -> pd.DataFrame:
        """
        Fetch stock data for the given symbol

        Args:
            symbol: The stock ticker symbol
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            interval: Data interval (e.g., '1d', '1wk', '1mo')

        Returns:
            DataFrame with the fetched stock data
        """
        cached_data = self._load_from_cache(symbol, interval)
        if cached_data is not None:
            logger.info(f"Loaded cached data for {symbol}")
            return cached_data
        if end_date is None:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        logger.info(f"Fetching stock data for {symbol} from {start_date} to {end_date}")
        try:
            yf_interval = interval
            if interval == "1d":
                range_param = "1y"
            elif interval == "1wk":
                range_param = "5y"
            elif interval == "1mo":
                range_param = "max"
            else:
                range_param = "1mo"
            response = self.api_client.call_api(
                "YahooFinance/get_stock_chart",
                query={
                    "symbol": symbol,
                    "interval": yf_interval,
                    "range": range_param,
                    "includeAdjustedClose": True,
                },
            )
            if response and "chart" in response and ("result" in response["chart"]):
                result = response["chart"]["result"][0]
                timestamps = result["timestamp"]
                quotes = result["indicators"]["quote"][0]
                if not all(quotes.values()):
                    logger.error(f"Missing data points in response for {symbol}")
                    return pd.DataFrame()
                df = pd.DataFrame(
                    {
                        "timestamp": pd.to_datetime(timestamps, unit="s"),
                        "open": quotes["open"],
                        "high": quotes["high"],
                        "low": quotes["low"],
                        "close": quotes["close"],
                        "volume": quotes["volume"],
                    }
                )
                if "adjclose" in result["indicators"]:
                    df["adjclose"] = result["indicators"]["adjclose"][0]["adjclose"]
                df["symbol"] = symbol
                df = DataValidator.validate_dataframe(df, symbol)
                self._save_to_cache(df, symbol, interval)
                return df
            else:
                logger.error(f"Invalid response format for {symbol}")
                return pd.DataFrame()
        except Exception as e:
            logger.error(f"Error fetching stock data for {symbol}: {e}")
            return pd.DataFrame()

    def fetch_stock_insights(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch additional insights for a stock

        Args:
            symbol: The stock ticker symbol

        Returns:
            Dictionary with stock insights
        """
        try:
            response = self.api_client.call_api(
                "YahooFinance/get_stock_insights", query={"symbol": symbol}
            )
            if response and "finance" in response and ("result" in response["finance"]):
                return response["finance"]["result"]
            else:
                logger.error(f"Invalid insights response format for {symbol}")
                return {}
        except Exception as e:
            logger.error(f"Error fetching stock insights for {symbol}: {e}")
            return {}

    def fetch_multiple_stocks(
        self, symbols: List[str], interval: str = "1d"
    ) -> Dict[str, pd.DataFrame]:
        """
        Fetch data for multiple stock symbols

        Args:
            symbols: List of stock ticker symbols
            interval: Data interval

        Returns:
            Dictionary mapping symbols to their respective DataFrames
        """
        results = {}
        for symbol in symbols:
            results[symbol] = self.fetch_data(symbol, interval=interval)
        return results
