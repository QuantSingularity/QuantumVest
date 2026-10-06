import os
from typing import Optional

import pandas as pd
from ai_models.data.features import normalize_ohlcv
from ai_models.exceptions import DataError


def default_model_dir() -> str:
    return os.environ.get("MODEL_PATH", "resources/models")


def load_ohlcv_csv(path: str) -> pd.DataFrame:
    if not os.path.isfile(path):
        raise DataError(f"Data file not found: {path}")
    df = pd.read_csv(path)
    return normalize_ohlcv(df)


def fetch_ohlcv(
    symbol: str, asset_type: str = "stock", period: str = "5y", interval: str = "1d"
) -> pd.DataFrame:
    try:
        import yfinance as yf
    except ImportError as exc:
        raise DataError("yfinance is required to download market data") from exc
    ticker = symbol.upper()
    if asset_type == "crypto" and not ticker.endswith(("-USD", "USDT")):
        ticker = f"{ticker}-USD"
    hist = yf.Ticker(ticker).history(period=period, interval=interval)
    if hist is None or hist.empty:
        raise DataError(f"No market data returned for {ticker}")
    if isinstance(hist.columns, pd.MultiIndex):
        hist.columns = hist.columns.get_level_values(0)
    hist = hist.reset_index()
    return normalize_ohlcv(hist)


def load_price_matrix(path: str, date_column: Optional[str] = None) -> pd.DataFrame:
    if not os.path.isfile(path):
        raise DataError(f"Data file not found: {path}")
    df = pd.read_csv(path)
    index_col = date_column or df.columns[0]
    df[index_col] = pd.to_datetime(df[index_col], errors="coerce", utc=True)
    df = df.dropna(subset=[index_col]).set_index(index_col).sort_index()
    df.index = df.index.tz_localize(None)
    prices = df.select_dtypes(include="number").dropna(axis=1, how="all")
    prices = prices.ffill().dropna()
    if prices.shape[1] < 2:
        raise DataError("Price file must contain at least two numeric asset columns")
    return prices
