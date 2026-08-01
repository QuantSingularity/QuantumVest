"""
Stock data fetcher - yfinance backend with a clean DataFrame contract.
"""

import logging

import pandas as pd

logger = logging.getLogger(__name__)

_COLUMN_MAP = {
    "Open": "open",
    "High": "high",
    "Low": "low",
    "Close": "close",
    "Volume": "volume",
    "Adj Close": "adj_close",
}


class StockDataFetcher:
    """Fetch OHLCV data from Yahoo Finance via yfinance."""

    def fetch_data(
        self,
        symbol: str,
        period: str = "2y",
        interval: str = "1d",
    ) -> pd.DataFrame:
        """Return a normalised OHLCV DataFrame (empty on failure)."""
        try:
            import yfinance as yf

            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, interval=interval)

            if hist.empty:
                logger.warning("yfinance returned no data for %s", symbol)
                return pd.DataFrame()

            hist = hist.reset_index()
            date_col = "Date" if "Date" in hist.columns else "Datetime"
            hist = hist.rename(columns={date_col: "timestamp"})
            hist = hist.rename(
                columns={k: v for k, v in _COLUMN_MAP.items() if k in hist.columns}
            )

            keep = ["timestamp", "open", "high", "low", "close", "volume"]
            if "adj_close" in hist.columns:
                keep.append("adj_close")
            hist = hist[[c for c in keep if c in hist.columns]]
            hist["symbol"] = symbol.upper()
            return hist
        except ImportError:
            logger.error("yfinance is not installed.")
            return pd.DataFrame()
        except Exception as exc:
            logger.error("Error fetching stock %s: %s", symbol, exc)
            return pd.DataFrame()
