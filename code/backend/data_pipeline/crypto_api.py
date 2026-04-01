"""
Cryptocurrency API Module
Fetches cryptocurrency data from CoinGecko API
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import pandas as pd
from data_pipeline.data_fetcher import DataFetcher, DataValidator

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class CryptoDataFetcher(DataFetcher):
    """Fetches cryptocurrency data from CoinGecko API"""

    def __init__(self, cache_dir: str = "../../resources/data_cache") -> None:
        super().__init__(cache_dir)
        self.base_url = "https://api.coingecko.com/api/v3"

    def fetch_data(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        interval: str = "daily",
    ) -> pd.DataFrame:
        cached_data = self._load_from_cache(symbol, interval)
        if cached_data is not None:
            logger.info(f"Loaded cached data for {symbol}")
            return cached_data

        if end_date is None:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

        logger.info(
            f"Fetching crypto data for {symbol} from {start_date} to {end_date}"
        )
        try:
            from_timestamp = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp())
            to_timestamp = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp())

            url = f"{self.base_url}/coins/{symbol}/market_chart/range"
            params = {
                "vs_currency": "usd",
                "from": from_timestamp,
                "to": to_timestamp,
            }
            response = self.session.get(url, params=params, timeout=30)
            self._handle_request_error(response, symbol)
            data = response.json()

            if "prices" in data and "market_caps" in data and "total_volumes" in data:
                prices = data["prices"]
                market_caps = data["market_caps"]
                volumes = data["total_volumes"]

                df = pd.DataFrame(prices, columns=["timestamp", "close"])
                df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
                df["market_cap"] = [item[1] for item in market_caps]
                df["volume"] = [item[1] for item in volumes]
                df["symbol"] = symbol
                df["open"] = df["close"].shift(1)
                df["high"] = df["close"]
                df["low"] = df["close"]

                # Fixed: use iloc[0] instead of loc[0] for positional indexing
                if not df.empty:
                    df.iloc[0, df.columns.get_loc("open")] = df.iloc[0]["close"]

                df = DataValidator.validate_dataframe(df, symbol)
                self._save_to_cache(df, symbol, interval)
                return df
            else:
                logger.error(f"Invalid response format for {symbol}")
                return pd.DataFrame()
        except Exception as e:
            logger.error(f"Error fetching crypto data for {symbol}: {e}")
            return pd.DataFrame()

    def fetch_current_price(self, symbols: List[str]) -> Dict[str, Optional[float]]:
        try:
            url = f"{self.base_url}/simple/price"
            params = {"ids": ",".join(symbols), "vs_currencies": "usd"}
            response = self.session.get(url, params=params, timeout=30)
            self._handle_request_error(response, ",".join(symbols))
            data = response.json()
            prices: Dict[str, Optional[float]] = {}
            for symbol in symbols:
                if symbol in data and "usd" in data[symbol]:
                    prices[symbol] = data[symbol]["usd"]
                else:
                    prices[symbol] = None
            return prices
        except Exception as e:
            logger.error(f"Error fetching current prices: {e}")
            return {symbol: None for symbol in symbols}

    def fetch_multiple_cryptos(
        self, symbols: List[str], interval: str = "daily"
    ) -> Dict[str, pd.DataFrame]:
        results = {}
        for symbol in symbols:
            results[symbol] = self.fetch_data(symbol, interval=interval)
        return results
