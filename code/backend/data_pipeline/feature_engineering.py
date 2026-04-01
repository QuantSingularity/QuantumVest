"""
Feature Engineering Module
Creates features from raw time-series data for model training
"""

import logging

import numpy as np
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class FeatureEngineering:
    """Creates features from raw time-series data"""

    @staticmethod
    def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
        """
        Add technical indicators to the dataframe

        Args:
            df: DataFrame with OHLCV data

        Returns:
            DataFrame with added technical indicators
        """
        if df is None or df.empty:
            logger.warning("Empty dataframe, cannot add technical indicators")
            return df

        # Make a copy to avoid modifying the original
        df = df.copy()

        try:
            # Ensure required columns exist
            required_cols = ["open", "high", "low", "close", "volume"]
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                logger.warning(
                    f"Missing columns for technical indicators: {missing_cols}"
                )
                return df

            # Moving Averages
            df["ma7"] = df["close"].rolling(window=7).mean()
            df["ma20"] = df["close"].rolling(window=20).mean()
            df["ma50"] = df["close"].rolling(window=50).mean()

            # Exponential Moving Averages
            df["ema12"] = df["close"].ewm(span=12, adjust=False).mean()
            df["ema26"] = df["close"].ewm(span=26, adjust=False).mean()

            # MACD (Moving Average Convergence Divergence)
            df["macd"] = df["ema12"] - df["ema26"]
            df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
            df["macd_hist"] = df["macd"] - df["macd_signal"]

            # Bollinger Bands
            df["bb_middle"] = df["close"].rolling(window=20).mean()
            df["bb_std"] = df["close"].rolling(window=20).std()
            df["bb_upper"] = df["bb_middle"] + (df["bb_std"] * 2)
            df["bb_lower"] = df["bb_middle"] - (df["bb_std"] * 2)

            # RSI (Relative Strength Index)
            delta = df["close"].diff()
            gain = delta.where(delta > 0, 0)
            loss = -delta.where(delta < 0, 0)
            avg_gain = gain.rolling(window=14).mean()
            avg_loss = loss.rolling(window=14).mean()
            rs = avg_gain / avg_loss
            df["rsi"] = 100 - (100 / (1 + rs))

            # Stochastic Oscillator
            low_14 = df["low"].rolling(window=14).min()
            high_14 = df["high"].rolling(window=14).max()
            df["stoch_k"] = 100 * ((df["close"] - low_14) / (high_14 - low_14))
            df["stoch_d"] = df["stoch_k"].rolling(window=3).mean()

            # Average True Range (ATR)
            tr1 = df["high"] - df["low"]
            tr2 = abs(df["high"] - df["close"].shift())
            tr3 = abs(df["low"] - df["close"].shift())
            df["tr"] = pd.DataFrame([tr1, tr2, tr3]).max()
            df["atr"] = df["tr"].rolling(window=14).mean()

            # Price Rate of Change
            df["roc"] = df["close"].pct_change(periods=12) * 100

            # On-Balance Volume (OBV)
            df["obv"] = (np.sign(df["close"].diff()) * df["volume"]).fillna(0).cumsum()

            # Fill NaN values
            df = df.bfill()

            return df

        except Exception as e:
            logger.error(f"Error adding technical indicators: {e}")
            return df

    @staticmethod
    def add_date_features(
        df: pd.DataFrame, date_col: str = "timestamp"
    ) -> pd.DataFrame:
        """
        Add date-based features to the dataframe

        Args:
            df: DataFrame with time-series data
            date_col: Name of the date/timestamp column

        Returns:
            DataFrame with added date features
        """
        if df is None or df.empty or date_col not in df.columns:
            logger.warning(f"Cannot add date features, missing column: {date_col}")
            return df

        # Make a copy to avoid modifying the original
        df = df.copy()

        try:
            # Ensure timestamp column is datetime
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col])

            # Extract date components
            df["day_of_week"] = df[date_col].dt.dayofweek
            df["day_of_month"] = df[date_col].dt.day
            df["week_of_year"] = df[date_col].dt.isocalendar().week
            df["month"] = df[date_col].dt.month
            df["quarter"] = df[date_col].dt.quarter
            df["year"] = df[date_col].dt.year

            # Is business day (Monday to Friday)
            df["is_business_day"] = (df["day_of_week"] < 5).astype(int)

            # Is month start/end
            df["is_month_start"] = df[date_col].dt.is_month_start.astype(int)
            df["is_month_end"] = df[date_col].dt.is_month_end.astype(int)

            # Is quarter start/end
            df["is_quarter_start"] = df[date_col].dt.is_quarter_start.astype(int)
            df["is_quarter_end"] = df[date_col].dt.is_quarter_end.astype(int)

            # Is year start/end
            df["is_year_start"] = df[date_col].dt.is_year_start.astype(int)
            df["is_year_end"] = df[date_col].dt.is_year_end.astype(int)

            return df

        except Exception as e:
            logger.error(f"Error adding date features: {e}")
            return df

    @staticmethod
    def prepare_model_features(
        df: pd.DataFrame,
        target_col: str = "close",
        add_technical: bool = True,
        add_date: bool = True,
    ) -> pd.DataFrame:
        """
        Prepare features for model training

        Args:
            df: DataFrame with time-series data
            target_col: Target column for prediction
            add_technical: Whether to add technical indicators
            add_date: Whether to add date features

        Returns:
            DataFrame with prepared features
        """
        if df is None or df.empty:
            logger.warning("Empty dataframe, cannot prepare features")
            return df

        # Make a copy to avoid modifying the original
        df = df.copy()

        try:
            # Add technical indicators if requested
            if add_technical:
                df = FeatureEngineering.add_technical_indicators(df)

            # Add date features if requested
            if add_date:
                df = FeatureEngineering.add_date_features(df)

            # Add lag features for target column
            for lag in [1, 2, 3, 5, 7, 14, 21]:
                df[f"{target_col}_lag_{lag}"] = df[target_col].shift(lag)

            # Add rolling statistics
            for window in [7, 14, 30]:
                df[f"{target_col}_rolling_mean_{window}"] = (
                    df[target_col].rolling(window=window).mean()
                )
                df[f"{target_col}_rolling_std_{window}"] = (
                    df[target_col].rolling(window=window).std()
                )
                df[f"{target_col}_rolling_min_{window}"] = (
                    df[target_col].rolling(window=window).min()
                )
                df[f"{target_col}_rolling_max_{window}"] = (
                    df[target_col].rolling(window=window).max()
                )

            # Add percentage change features
            for period in [1, 3, 7, 14]:
                df[f"{target_col}_pct_change_{period}"] = df[target_col].pct_change(
                    periods=period
                )

            # Fill NaN values
            df = df.bfill().ffill().fillna(0)

            return df

        except Exception as e:
            logger.error(f"Error preparing model features: {e}")
            return df
