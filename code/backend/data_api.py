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
        """Initialize the API client"""
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "QuantumVest/1.0"})

    def call_api(
        self,
        endpoint: str,
        query: Optional[Dict[str, Any]] = None,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Make an API call to the specified endpoint

        Args:
            endpoint: API endpoint to call (e.g., 'YahooFinance/get_stock_chart')
            query: Query parameters
            method: HTTP method (GET, POST, etc.)
            headers: Additional headers

        Returns:
            Response data as dictionary or None if error
        """
        try:
            # Parse endpoint to determine API provider
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
        """
        Call Yahoo Finance API

        Args:
            endpoint: Yahoo Finance endpoint
            query: Query parameters

        Returns:
            Response data or None
        """
        try:
            import yfinance as yf

            if endpoint == "YahooFinance/get_stock_chart":
                symbol = query.get("symbol") if query else None
                interval = query.get("interval", "1d") if query else "1d"
                range_param = query.get("range", "1y") if query else "1y"

                # Use yfinance to fetch data
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period=range_param, interval=interval)

                if hist.empty:
                    return None

                # Convert to Yahoo Finance API format
                timestamps = [int(ts.timestamp()) for ts in hist.index]

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

                # Add adjusted close if available
                if "Adj Close" in hist.columns:
                    response["chart"]["result"][0]["indicators"]["adjclose"] = [
                        {"adjclose": hist["Adj Close"].tolist()}
                    ]

                return response

            return None

        except ImportError:
            logger.error("yfinance package not installed")
            return None
        except Exception as e:
            logger.error(f"Error calling Yahoo Finance API: {e}")
            return None
