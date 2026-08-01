"""
Crypto data fetcher - yfinance backend (appends -USD suffix automatically).
"""

import logging

import pandas as pd

logger = logging.getLogger(__name__)


class CryptoDataFetcher:
    """Fetch OHLCV crypto data from Yahoo Finance via yfinance."""

    def fetch_data(
        self,
        symbol: str,
        period: str = "2y",
        interval: str = "1d",
    ) -> pd.DataFrame:
        """Return a normalised OHLCV DataFrame (empty on failure)."""
        try:
            import yfinance as yf

            ticker_symbol = symbol.upper()
            if not ticker_symbol.endswith("-USD") and not ticker_symbol.endswith(
                "USDT"
            ):
                ticker_symbol = f"{ticker_symbol}-USD"

            ticker = yf.Ticker(ticker_symbol)
            hist = ticker.history(period=period, interval=interval)

            if hist.empty:
                logger.warning("yfinance returned no data for %s", ticker_symbol)
                return pd.DataFrame()

            hist = hist.reset_index()
            date_col = "Date" if "Date" in hist.columns else "Datetime"
            hist = hist.rename(columns={date_col: "timestamp"})
            hist.columns = [c.lower() for c in hist.columns]

            keep = ["timestamp", "open", "high", "low", "close", "volume"]
            hist = hist[[c for c in keep if c in hist.columns]]
            hist["symbol"] = symbol.upper()
            return hist
        except ImportError:
            logger.error("yfinance is not installed.")
            return pd.DataFrame()
        except Exception as exc:
            logger.error("Error fetching crypto %s: %s", symbol, exc)
            return pd.DataFrame()
