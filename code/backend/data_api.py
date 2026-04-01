"""
Data API Client Module
Provides a unified interface for calling external financial data APIs
"""

import logging
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)


class ApiClient:
    """Generic API client for fetching financial data"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "QuantumVest/2.0"})

    def call_api(
        self,
        endpoint: str,
        query: Optional[Dict[str, Any]] = None,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
    ) -> Optional[Dict[str, Any]]:
        try:
            if endpoint.startswith("YahooFinance/"):
                return self._call_yahoo_finance(endpoint, query)
            else:
                logger.error(f"Unknown API endpoint: {endpoint}")
                return None
        except Exception as e:
            logger.error(f"Error calling API {endpoint}: {e}")
            return None

    def _call_yahoo_finance(
        self, endpoint: str, query: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            import yfinance as yf

            if endpoint == "YahooFinance/get_stock_chart":
                symbol = query.get("symbol") if query else None
                interval = query.get("interval", "1d") if query else "1d"
                range_param = query.get("range", "1y") if query else "1y"

                if not symbol:
                    return None

                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=range_param, interval=interval)

                if hist.empty:
                    logger.warning(f"No data returned from yfinance for {symbol}")
                    return None

                # Reset index to get timestamps as a column
                hist = hist.reset_index()

                # Handle both Date and Datetime index names
                date_col = "Date" if "Date" in hist.columns else "Datetime"
                timestamps = [int(ts.timestamp()) for ts in hist[date_col]]

                response = {
                    "chart": {
                        "result": [
                            {
                                "timestamp": timestamps,
                                "indicators": {
                                    "quote": [
                                        {
                                            "open": hist["Open"].tolist(),
                                            "high": hist["High"].tolist(),
                                            "low": hist["Low"].tolist(),
                                            "close": hist["Close"].tolist(),
                                            "volume": hist["Volume"].tolist(),
                                        }
                                    ]
                                },
                            }
                        ]
                    }
                }

                if "Adj Close" in hist.columns:
                    response["chart"]["result"][0]["indicators"]["adjclose"] = [
                        {"adjclose": hist["Adj Close"].tolist()}
                    ]

                return response

            return None

        except ImportError:
            logger.error("yfinance package not installed. Run: pip install yfinance")
            return None
        except Exception as e:
            logger.error(f"Error calling Yahoo Finance API: {e}")
            return None
