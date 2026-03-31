"""
LSTM Model Module
Defines and trains LSTM models for time-series prediction
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.layers import LSTM, BatchNormalization, Dense, Dropout
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.optimizers import Adam

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class LSTMModel:
    """LSTM model for time-series prediction"""

    def __init__(self, model_dir: str = "../../resources/models") -> None:
        """
        Initialize the LSTM model

        Args:
            model_dir: Directory to store trained models
        """
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.model = None
        self.scaler = None
        self.sequence_length = 60

    def _prepare_data(
        self, df: pd.DataFrame, target_col: str = "close", sequence_length: int = 60
    ) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
        """
        Prepare data for LSTM model training

        Args:
            df: DataFrame with time-series data
            target_col: Target column for prediction
            sequence_length: Length of input sequences

        Returns:
            X: Input sequences
            y: Target values
            scaler: Fitted scaler for normalization
        """
        df = df.sort_values("timestamp")
        data = df[target_col].values.reshape(-1, 1)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(data)
        X_list: List[np.ndarray] = []
        y_list: List[float] = []
        for i in range(sequence_length, len(scaled_data)):
            X_list.append(scaled_data[i - sequence_length : i, 0])
            y_list.append(scaled_data[i, 0])
        X = np.array(X_list)
        y = np.array(y_list)
        X = np.reshape(X, (X.shape[0], X.shape[1], 1))
        return (X, y, scaler)

    def _build_model(self, sequence_length: int) -> Sequential:
        """
        Build LSTM model architecture

        Args:
            sequence_length: Length of input sequences

        Returns:
            Compiled Keras model
        """
        model = Sequential()
        model.add(
            LSTM(units=50, return_sequences=True, input_shape=(sequence_length, 1))
        )
        model.add(Dropout(0.2))
        model.add(BatchNormalization())
        model.add(LSTM(units=50, return_sequences=False))
        model.add(Dropout(0.2))
        model.add(BatchNormalization())
        model.add(Dense(units=25, activation="relu"))
        model.add(Dense(units=1))
        model.compile(optimizer=Adam(learning_rate=0.001), loss="mean_squared_error")
        return model

    def train(
        self,
        df: pd.DataFrame,
        asset_type: str,
        symbol: str,
        target_col: str = "close",
        sequence_length: int = 60,
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Train LSTM model on time-series data

        Args:
            df: DataFrame with time-series data
            asset_type: Type of asset ('stock' or 'crypto')
            symbol: Asset symbol
            target_col: Target column for prediction
            sequence_length: Length of input sequences
            epochs: Number of training epochs
            batch_size: Training batch size
            validation_split: Fraction of data to use for validation

        Returns:
            Dictionary with training results
        """
        if df is None or df.empty:
            logger.error(f"Empty dataframe for {symbol}, cannot train model")
            return {"success": False, "error": "Empty dataframe"}
        try:
            logger.info(f"Training LSTM model for {symbol} ({asset_type})")
            self.sequence_length = sequence_length
            X, y, scaler = self._prepare_data(df, target_col, sequence_length)
            self.scaler = scaler
            split_idx = int(len(X) * (1 - validation_split))
            X_train, X_val = (X[:split_idx], X[split_idx:])
            y_train, y_val = (y[:split_idx], y[split_idx:])
            self.model = self._build_model(sequence_length)
            model_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_model.h5"
            )
            callbacks = [
                EarlyStopping(
                    monitor="val_loss", patience=10, restore_best_weights=True
                ),
                ModelCheckpoint(
                    filepath=model_path, save_best_only=True, monitor="val_loss"
                ),
            ]
            history = self.model.fit(
                X_train,
                y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_data=(X_val, y_val),
                callbacks=callbacks,
                verbose=1,
            )
            scaler_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_scaler.pkl"
            )
            joblib.dump(scaler, scaler_path)
            metadata = {
                "asset_type": asset_type,
                "symbol": symbol,
                "target_column": target_col,
                "sequence_length": sequence_length,
                "training_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "model_path": model_path,
                "scaler_path": scaler_path,
                "training_samples": len(X_train),
                "validation_samples": len(X_val),
                "final_loss": history.history["loss"][-1],
                "final_val_loss": history.history["val_loss"][-1],
            }
            metadata_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_metadata.pkl"
            )
            joblib.dump(metadata, metadata_path)
            logger.info(
                f"Model training completed for {symbol} with validation loss: {metadata['final_val_loss']}"
            )
            return {
                "success": True,
                "model_path": model_path,
                "scaler_path": scaler_path,
                "metadata_path": metadata_path,
                "training_loss": metadata["final_loss"],
                "validation_loss": metadata["final_val_loss"],
            }
        except Exception as e:
            logger.error(f"Error training model for {symbol}: {e}")
            return {"success": False, "error": str(e)}

    def load(self, asset_type: str, symbol: str) -> bool:
        """
        Load trained model and scaler

        Args:
            asset_type: Type of asset ('stock' or 'crypto')
            symbol: Asset symbol

        Returns:
            True if loading was successful, False otherwise
        """
        try:
            model_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_model.h5"
            )
            if not os.path.exists(model_path):
                logger.error(f"Model file not found for {symbol}")
                return False
            self.model = load_model(model_path)
            scaler_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_scaler.pkl"
            )
            if not os.path.exists(scaler_path):
                logger.error(f"Scaler file not found for {symbol}")
                return False
            self.scaler = joblib.load(scaler_path)
            metadata_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_metadata.pkl"
            )
            if os.path.exists(metadata_path):
                metadata = joblib.load(metadata_path)
                self.sequence_length = metadata.get("sequence_length", 60)
            logger.info(f"Successfully loaded model for {symbol} ({asset_type})")
            return True
        except Exception as e:
            logger.error(f"Error loading model for {symbol}: {e}")
            return False

    def predict(
        self, df: pd.DataFrame, target_col: str = "close", days_ahead: int = 7
    ) -> Dict[str, Any]:
        """
        Generate predictions using trained model

        Args:
            df: DataFrame with time-series data
            target_col: Target column for prediction
            days_ahead: Number of days to predict ahead

        Returns:
            Dictionary with prediction results
        """
        if self.model is None or self.scaler is None:
            logger.error("Model or scaler not loaded")
            return {"success": False, "error": "Model not loaded"}
        if df is None or df.empty:
            logger.error("Empty dataframe, cannot make predictions")
            return {"success": False, "error": "Empty dataframe"}
        try:
            df = df.sort_values("timestamp")
            data = df[target_col].values.reshape(-1, 1)
            scaled_data = self.scaler.transform(data)
            if len(scaled_data) < self.sequence_length:
                logger.error(
                    f"Not enough data points. Need at least {self.sequence_length}, got {len(scaled_data)}"
                )
                return {"success": False, "error": "Not enough data points"}
            last_sequence = scaled_data[-self.sequence_length :].reshape(
                1, self.sequence_length, 1
            )
            predictions = []
            current_sequence = last_sequence.copy()
            for _ in range(days_ahead):
                next_pred = self.model.predict(current_sequence, verbose=0)[0][0]
                predictions.append(next_pred)
                current_sequence = np.append(
                    current_sequence[:, 1:, :], [[next_pred]], axis=1
                )
            predictions = np.array(predictions).reshape(-1, 1)
            predictions = self.scaler.inverse_transform(predictions).flatten()
            last_date = df["timestamp"].iloc[-1]
            prediction_dates = [
                last_date + pd.Timedelta(days=i + 1) for i in range(days_ahead)
            ]
            prediction_dates = [d.strftime("%Y-%m-%d") for d in prediction_dates]
            result = {
                "success": True,
                "predictions": predictions.tolist(),
                "dates": prediction_dates,
                "last_actual_value": float(data[-1][0]),
                "last_actual_date": df["timestamp"].iloc[-1].strftime("%Y-%m-%d"),
            }
            return result
        except Exception as e:
            logger.error(f"Error making predictions: {e}")
            return {"success": False, "error": str(e)}
