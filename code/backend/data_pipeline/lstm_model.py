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

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class LSTMModel:
    """LSTM model for time-series prediction"""

    def __init__(self, model_dir: str = "../../resources/models") -> None:
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.model = None
        self.scaler = None
        self.sequence_length = 60

    def _prepare_data(
        self, df: pd.DataFrame, target_col: str = "close", sequence_length: int = 60
    ) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
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

    def _build_model(self, sequence_length: int):
        try:
            from tensorflow.keras.layers import LSTM, BatchNormalization, Dense, Dropout
            from tensorflow.keras.models import Sequential
            from tensorflow.keras.optimizers import Adam
        except ImportError:
            raise ImportError(
                "TensorFlow is required for LSTM model. Install with: pip install tensorflow"
            )

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
        if df is None or df.empty:
            return {"success": False, "error": "Empty dataframe"}

        try:
            from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
        except ImportError:
            return {"success": False, "error": "TensorFlow not installed"}

        try:
            logger.info(f"Training LSTM model for {symbol} ({asset_type})")
            self.sequence_length = sequence_length
            X, y, scaler = self._prepare_data(df, target_col, sequence_length)
            self.scaler = scaler

            if len(X) < 10:
                return {
                    "success": False,
                    "error": "Not enough data to train (need at least 70 rows)",
                }

            split_idx = int(len(X) * (1 - validation_split))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]

            self.model = self._build_model(sequence_length)

            model_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_model.keras"
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
                verbose=0,
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
                "final_loss": float(history.history["loss"][-1]),
                "final_val_loss": float(history.history["val_loss"][-1]),
            }
            metadata_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_metadata.pkl"
            )
            joblib.dump(metadata, metadata_path)

            logger.info(
                f"Model training completed for {symbol}, val_loss={metadata['final_val_loss']:.6f}"
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
        try:
            from tensorflow.keras.models import load_model
        except ImportError:
            logger.error("TensorFlow not installed")
            return False

        try:
            model_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_model.keras"
            )
            legacy_path = os.path.join(
                self.model_dir, f"{asset_type}_{symbol.lower()}_model.h5"
            )

            path_to_load = (
                model_path
                if os.path.exists(model_path)
                else (legacy_path if os.path.exists(legacy_path) else None)
            )
            if not path_to_load:
                logger.info(f"No model file found for {symbol}")
                return False

            self.model = load_model(path_to_load)

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
        if self.model is None or self.scaler is None:
            return {"success": False, "error": "Model not loaded"}
        if df is None or df.empty:
            return {"success": False, "error": "Empty dataframe"}

        try:
            df = df.sort_values("timestamp")
            data = df[target_col].values.reshape(-1, 1)
            scaled_data = self.scaler.transform(data)

            if len(scaled_data) < self.sequence_length:
                return {
                    "success": False,
                    "error": f"Not enough data points. Need {self.sequence_length}, got {len(scaled_data)}",
                }

            last_sequence = scaled_data[-self.sequence_length :].reshape(
                1, self.sequence_length, 1
            )

            predictions = []
            current_sequence = last_sequence.copy()

            for _ in range(days_ahead):
                next_pred = float(self.model.predict(current_sequence, verbose=0)[0][0])
                predictions.append(next_pred)
                # Fixed: proper 3D append — [[next_pred]] is 2D but array is 3D
                new_val = np.array([[[next_pred]]])
                current_sequence = np.concatenate(
                    [current_sequence[:, 1:, :], new_val], axis=1
                )

            predictions_arr = np.array(predictions).reshape(-1, 1)
            predictions_arr = self.scaler.inverse_transform(predictions_arr).flatten()

            last_date = df["timestamp"].iloc[-1]
            prediction_dates = [
                last_date + pd.Timedelta(days=i + 1) for i in range(days_ahead)
            ]
            prediction_dates = [d.strftime("%Y-%m-%d") for d in prediction_dates]

            return {
                "success": True,
                "predictions": predictions_arr.tolist(),
                "dates": prediction_dates,
                "last_actual_value": float(data[-1][0]),
                "last_actual_date": df["timestamp"].iloc[-1].strftime("%Y-%m-%d"),
            }
        except Exception as e:
            logger.error(f"Error making predictions: {e}")
            return {"success": False, "error": str(e)}
