"""
Feature engineering - technical indicators added to an OHLCV DataFrame.
"""

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_REQUIRED = ["open", "high", "low", "close", "volume"]


class FeatureEngineering:
    """Compute technical indicators from raw OHLCV data."""

    @staticmethod
    def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
        """Return a copy of *df* augmented with standard indicators.

        Missing required columns are silently skipped so callers never crash.
        """
        if df is None or df.empty:
            return df

        df = df.copy()
        missing = [c for c in _REQUIRED if c not in df.columns]
        if missing:
            logger.warning("Missing columns, skipping indicators: %s", missing)
            return df

        close = df["close"]

        # Moving averages
        for n in (7, 20, 50):
            df[f"ma{n}"] = close.rolling(n).mean()

        # Exponential MAs
        df["ema12"] = close.ewm(span=12, adjust=False).mean()
        df["ema26"] = close.ewm(span=26, adjust=False).mean()

        # MACD
        df["macd"] = df["ema12"] - df["ema26"]
        df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
        df["macd_hist"] = df["macd"] - df["macd_signal"]

        # Bollinger Bands
        bb_mid = close.rolling(20).mean()
        bb_std = close.rolling(20).std()
        df["bb_upper"] = bb_mid + 2 * bb_std
        df["bb_middle"] = bb_mid
        df["bb_lower"] = bb_mid - 2 * bb_std

        # RSI (Wilder smoothing)
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        df["rsi"] = 100 - 100 / (1 + rs)

        # Stochastic %K / %D
        low14 = df["low"].rolling(14).min()
        high14 = df["high"].rolling(14).max()
        denom = (high14 - low14).replace(0, np.nan)
        df["stoch_k"] = (close - low14) / denom * 100
        df["stoch_d"] = df["stoch_k"].rolling(3).mean()

        # ATR
        high_low = df["high"] - df["low"]
        high_close = (df["high"] - close.shift()).abs()
        low_close = (df["low"] - close.shift()).abs()
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df["atr"] = tr.rolling(14).mean()

        # OBV
        direction = np.sign(close.diff().fillna(0))
        df["obv"] = (direction * df["volume"]).cumsum()

        # Log returns
        df["log_return"] = np.log(close / close.shift(1))

        return df

    @staticmethod
    def prepare_lstm_features(
        df: pd.DataFrame, target_col: str = "close"
    ) -> pd.DataFrame:
        """Add indicators and drop rows with NaN in the target column."""
        df = FeatureEngineering.add_technical_indicators(df)
        df = df.dropna(subset=[target_col])
        return df
