"""
LSTM time-series model.  TensorFlow is an optional dependency - the class
gracefully degrades to a statsmodels-based forecast when TF is absent.
"""

import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger(__name__)


class LSTMModel:
    """Sequence model for financial time-series prediction."""

    def __init__(self, model_dir: str = "resources/models") -> None:
        os.makedirs(model_dir, exist_ok=True)
        self.model_dir = model_dir
        self.model: Optional[Any] = None
        self.scaler: Optional[MinMaxScaler] = None
        self.sequence_length: int = 60
        self._use_tf: bool = self._check_tf()

    @staticmethod
    def _check_tf() -> bool:
        try:
            import tensorflow  # noqa: F401

            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Data preparation
    # ------------------------------------------------------------------

    def _prepare_sequences(
        self,
        df: pd.DataFrame,
        target_col: str = "close",
        seq_len: int = 60,
    ) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
        if "timestamp" in df.columns:
            df = df.sort_values("timestamp")
        data = df[[target_col]].values.astype(float)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled = scaler.fit_transform(data)

        X, y = [], []
        for i in range(seq_len, len(scaled)):
            X.append(scaled[i - seq_len : i, 0])
            y.append(scaled[i, 0])

        X_arr = np.array(X).reshape(-1, seq_len, 1)
        y_arr = np.array(y)
        return X_arr, y_arr, scaler

    # ------------------------------------------------------------------
    # Keras model
    # ------------------------------------------------------------------

    @staticmethod
    def _build_keras(seq_len: int):
        from tensorflow.keras.layers import LSTM  # type: ignore
        from tensorflow.keras.layers import BatchNormalization, Dense, Dropout
        from tensorflow.keras.models import Sequential  # type: ignore
        from tensorflow.keras.optimizers import Adam  # type: ignore

        model = Sequential(
            [
                LSTM(64, return_sequences=True, input_shape=(seq_len, 1)),
                Dropout(0.2),
                BatchNormalization(),
                LSTM(64),
                Dropout(0.2),
                BatchNormalization(),
                Dense(32, activation="relu"),
                Dense(1),
            ]
        )
        model.compile(optimizer=Adam(learning_rate=0.001), loss="mse")
        return model

    # ------------------------------------------------------------------
    # Train
    # ------------------------------------------------------------------

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
            return {"success": False, "error": "Empty DataFrame"}

        self.sequence_length = sequence_length
        X, y, scaler = self._prepare_sequences(df, target_col, sequence_length)
        self.scaler = scaler

        if len(X) < 10:
            return {"success": False, "error": "Insufficient data for training"}

        if self._use_tf:
            try:
                from tensorflow.keras.callbacks import EarlyStopping  # type: ignore

                self.model = self._build_keras(sequence_length)
                self.model.fit(
                    X,
                    y,
                    epochs=epochs,
                    batch_size=batch_size,
                    validation_split=validation_split,
                    callbacks=[
                        EarlyStopping(
                            monitor="val_loss", patience=5, restore_best_weights=True
                        )
                    ],
                    verbose=0,
                )
                self._save(asset_type, symbol)
                return {"success": True, "backend": "tensorflow"}
            except Exception as exc:
                logger.error("Keras training failed: %s - falling back", exc)

        # Statsmodels fallback
        try:
            self.model = self._fit_arima(df[target_col].dropna().values)
            self._save(asset_type, symbol)
            return {"success": True, "backend": "arima"}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    @staticmethod
    def _fit_arima(series: np.ndarray):
        from statsmodels.tsa.arima.model import ARIMA  # type: ignore

        model = ARIMA(series, order=(5, 1, 0))
        return model.fit()

    # ------------------------------------------------------------------
    # Predict
    # ------------------------------------------------------------------

    def predict(
        self, df: pd.DataFrame, days_ahead: int = 7, target_col: str = "close"
    ) -> List[float]:
        if self.model is None or self.scaler is None:
            raise RuntimeError("Model not trained or loaded.")

        if self._use_tf and hasattr(self.model, "predict"):
            # Keras path
            if "timestamp" in df.columns:
                df = df.sort_values("timestamp")
            last_seq = df[[target_col]].values[-self.sequence_length :]
            scaled = self.scaler.transform(last_seq).flatten()

            preds = []
            cur = list(scaled)
            for _ in range(days_ahead):
                x = np.array(cur[-self.sequence_length :]).reshape(
                    1, self.sequence_length, 1
                )
                p = float(self.model.predict(x, verbose=0)[0, 0])
                preds.append(p)
                cur.append(p)

            return (
                self.scaler.inverse_transform(np.array(preds).reshape(-1, 1))
                .flatten()
                .tolist()
            )

        # ARIMA/statsmodels path
        try:
            fc = self.model.forecast(steps=days_ahead)
            return [float(v) for v in fc]
        except Exception:
            last_val = float(df[target_col].iloc[-1])
            return [last_val] * days_ahead

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _save(self, asset_type: str, symbol: str) -> None:
        tag = f"{asset_type}_{symbol.lower()}"
        scaler_path = os.path.join(self.model_dir, f"{tag}_scaler.pkl")
        joblib.dump(self.scaler, scaler_path)

        if self._use_tf and hasattr(self.model, "save"):
            self.model.save(os.path.join(self.model_dir, f"{tag}_model.keras"))
        else:
            joblib.dump(self.model, os.path.join(self.model_dir, f"{tag}_model.pkl"))

    def load(self, asset_type: str, symbol: str) -> bool:
        tag = f"{asset_type}_{symbol.lower()}"
        scaler_path = os.path.join(self.model_dir, f"{tag}_scaler.pkl")

        if not os.path.exists(scaler_path):
            return False
        try:
            self.scaler = joblib.load(scaler_path)
        except Exception:
            return False

        keras_path = os.path.join(self.model_dir, f"{tag}_model.keras")
        pkl_path = os.path.join(self.model_dir, f"{tag}_model.pkl")

        if os.path.exists(keras_path) and self._use_tf:
            try:
                from tensorflow.keras.models import load_model  # type: ignore

                self.model = load_model(keras_path)
                return True
            except Exception:
                pass
        if os.path.exists(pkl_path):
            try:
                self.model = joblib.load(pkl_path)
                return True
            except Exception:
                pass
        return False
