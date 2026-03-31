import logging
from typing import Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# --- Configuration ---
# Assuming the target variable is 'Close' price for prediction
TARGET_COLUMN = "Close"
# Features to be used for training (excluding the target and date/time)
FEATURE_COLUMNS = [
    "Open",
    "High",
    "Low",
    "Volume",
    "SMA_10",
    "EMA_10",
    "RSI",
    "MACD",
    "MACD_Signal",
    "Volatility",
]
# Window size for creating sequences for a time-series model (e.g., LSTM)
SEQUENCE_LENGTH = 60


def load_data(file_path: str) -> pd.DataFrame:
    """
    Loads financial time-series data from a CSV file.
    Assumes a 'Date' column is present and should be set as the index.
    """
    try:
        df = pd.read_csv(file_path)
        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"])
            df.set_index("Date", inplace=True)
        logger.info(f"Data loaded successfully from {file_path}. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.info(f"Error: File not found at {file_path}")
        return pd.DataFrame()
    except Exception as e:
        logger.info(f"An error occurred during data loading: {e}")
        return pd.DataFrame()


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Creates common technical indicators and features for financial time-series data.
    """
    if df.empty:
        return df

    logger.info("Starting feature engineering...")
    # 1. Simple Moving Average (SMA)
    df["SMA_10"] = df[TARGET_COLUMN].rolling(window=10).mean()
    df["SMA_30"] = df[TARGET_COLUMN].rolling(window=30).mean()

    # 2. Exponential Moving Average (EMA)
    df["EMA_10"] = df[TARGET_COLUMN].ewm(span=10, adjust=False).mean()

    # 3. Relative Strength Index (RSI) - requires 'Close'
    delta = df[TARGET_COLUMN].diff()
    gain = (delta.where(delta > 0, 0)).fillna(0)
    loss = (-delta.where(delta < 0, 0)).fillna(0)
    avg_gain = gain.ewm(com=13, adjust=False).mean()
    avg_loss = loss.ewm(com=13, adjust=False).mean()
    rs = avg_gain / avg_loss
    df["RSI"] = 100 - (100 / (1 + rs))

    # 4. Moving Average Convergence Divergence (MACD)
    exp1 = df[TARGET_COLUMN].ewm(span=12, adjust=False).mean()
    exp2 = df[TARGET_COLUMN].ewm(span=26, adjust=False).mean()
    df["MACD"] = exp1 - exp2
    df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()

    # 5. Volatility (Standard Deviation of returns)
    df["Log_Return"] = np.log(df[TARGET_COLUMN] / df[TARGET_COLUMN].shift(1))
    df["Volatility"] = df["Log_Return"].rolling(window=20).std()
    df.drop(columns=["Log_Return"], inplace=True)

    logger.info("Feature engineering complete.")
    return df


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Handles missing values by forward-filling and then dropping any remaining NaNs.
    Forward-filling is common for time-series data to carry the last known value forward.
    """
    if df.empty:
        return df

    logger.info(f"Initial NaN count: {df.isnull().sum().sum()}")
    # Forward-fill missing values
    df.fillna(method="ffill", inplace=True)

    # Drop any remaining NaNs (e.g., those at the very beginning due to rolling windows)
    df.dropna(inplace=True)

    logger.info(f"Final NaN count after processing: {df.isnull().sum().sum()}")
    logger.info(f"Data shape after handling NaNs: {df.shape}")
    return df


def scale_data(
    df: pd.DataFrame, scaler: Optional[MinMaxScaler] = None
) -> Tuple[pd.DataFrame, MinMaxScaler]:
    """
    Scales the data using MinMaxScaler.
    If a scaler is provided, it uses that for transformation (e.g., for test data).
    Otherwise, it fits a new scaler (e.g., for training data).
    """
    if df.empty:
        return df, MinMaxScaler()

    # Select only the feature columns that are present in the DataFrame
    features_to_scale = [col for col in FEATURE_COLUMNS if col in df.columns]

    if not features_to_scale:
        logger.info("Warning: No valid feature columns found for scaling.")
        return df, MinMaxScaler()

    data_to_scale = df[features_to_scale].values

    if scaler is None:
        logger.info("Fitting and transforming data with new MinMaxScaler...")
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(data_to_scale)
    else:
        logger.info("Transforming data with provided MinMaxScaler...")
        scaled_data = scaler.transform(data_to_scale)

    scaled_df = pd.DataFrame(scaled_data, columns=features_to_scale, index=df.index)

    # Re-add the target column (unscaled) for sequence creation later
    if TARGET_COLUMN in df.columns:
        scaled_df[TARGET_COLUMN] = df[TARGET_COLUMN]

    return scaled_df, scaler


def create_sequences(
    data: pd.DataFrame, sequence_length: int, target_column: str
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Converts the time-series data into sequences (X) and corresponding next-step targets (y).
    X will contain scaled features, y will contain the unscaled target value.
    """
    if data.empty:
        return np.array([]), np.array([])

    X, y = [], []

    # Select only the feature columns that are present in the DataFrame
    feature_cols = [col for col in FEATURE_COLUMNS if col in data.columns]

    if not feature_cols or target_column not in data.columns:
        logger.info(
            "Error: Missing required feature or target columns for sequence creation."
        )
        return np.array([]), np.array([])

    feature_data = data[feature_cols].values
    target_data = data[target_column].values

    for i in range(len(data) - sequence_length):
        # Sequence of features (X)
        X.append(feature_data[i : (i + sequence_length)])
        # Target is the value immediately following the sequence (y)
        y.append(target_data[i + sequence_length])

    logger.info(f"Created {len(X)} sequences of length {sequence_length}.")
    return np.array(X), np.array(y)


def preprocess_data(
    file_path: str,
    sequence_length: int = SEQUENCE_LENGTH,
    scaler: Optional[MinMaxScaler] = None,
) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """
    Main function to orchestrate the entire data preprocessing pipeline.
    """
    logger.info(f"--- Starting Preprocessing for {file_path} ---")
    # 1. Load Data
    df = load_data(file_path)
    if df.empty:
        return np.array([]), np.array([]), MinMaxScaler()

    # 2. Feature Engineering
    df = feature_engineering(df)

    # 3. Handle Missing Values (must be done after feature engineering)
    df = handle_missing_values(df)

    # 4. Scale Data
    scaled_df, fitted_scaler = scale_data(df, scaler=scaler)

    # 5. Create Sequences
    X, y = create_sequences(scaled_df, sequence_length, TARGET_COLUMN)

    logger.info("--- Preprocessing Complete ---")
    return X, y, fitted_scaler


if __name__ == "__main__":
    # Example usage:
    # NOTE: This path is a placeholder. You should adjust it to point to your actual data file.
    # Based on the repo structure, a likely path is:
    # data_path = '../../../../resources/datasets/market_data.csv'

    # Create a dummy DataFrame for testing the script's logic
    logger.info("Running self-test with dummy data...")
    dates = pd.to_datetime(pd.date_range(start="2020-01-01", periods=200))
    dummy_data = {
        "Date": dates,
        "Open": np.random.rand(200) * 100,
        "High": np.random.rand(200) * 100 + 1,
        "Low": np.random.rand(200) * 100 - 1,
        "Close": np.random.rand(200) * 100,
        "Volume": np.random.randint(10000, 50000, 200),
    }
    dummy_df = pd.DataFrame(dummy_data)
    dummy_df.to_csv("dummy_market_data.csv", index=False)

    # Run the full pipeline
    X_train, y_train, scaler = preprocess_data(
        "dummy_market_data.csv", sequence_length=10
    )

    if X_train.size > 0:
        logger.info("\n--- Preprocessing Results Summary ---")
        logger.info(f"X_train shape: {X_train.shape}")
        logger.info(f"y_train shape: {y_train.shape}")
        logger.info(f"Number of features scaled: {scaler.n_features_in_}")
        # Clean up dummy file
        import os

        os.remove("dummy_market_data.csv")
    else:
        logger.info("\nPreprocessing failed to produce output.")
