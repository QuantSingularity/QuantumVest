import json
import logging
import os
import shutil
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler

from ai_models.data.features import (
    FEATURE_COLUMNS,
    MIN_ROWS,
    build_features,
    normalize_ohlcv,
    supervised_frame,
)
from ai_models.evaluation.metrics import score_predictions
from ai_models.exceptions import (
    DataError,
    ModelCompatibilityError,
    NotTrainedError,
)
from ai_models.models.constants import (
    DEEP_MODELS,
    ENSEMBLE,
    MAX_FORECAST_STEPS,
    MIN_SAMPLES,
    MODEL_FORMAT_VERSION,
    MODEL_TYPES,
)
from ai_models.models.deep import (
    build_lstm,
    build_transformer,
    import_tensorflow,
)
from ai_models.models.tree import build_tree_model, ensemble_components

logger = logging.getLogger(__name__)


def _next_timestamp(ts: pd.Timestamp, calendar: str) -> pd.Timestamp:
    if calendar == "D":
        return ts + pd.Timedelta(days=1)
    return pd.bdate_range(ts + pd.Timedelta(days=1), periods=1)[0]


class TimeSeriesPredictor:
    def __init__(
        self,
        model_type: str = ENSEMBLE,
        sequence_length: int = 30,
        random_state: int = 42,
        calendar: str = "B",
    ) -> None:
        if model_type not in MODEL_TYPES:
            raise ValueError(
                f"Unknown model type {model_type!r}; expected one of {MODEL_TYPES}"
            )
        if calendar not in ("B", "D"):
            raise ValueError("calendar must be 'B' or 'D'")
        self.model_type = model_type
        self.sequence_length = int(sequence_length)
        self.random_state = int(random_state)
        self.calendar = calendar
        self.scaler: Optional[RobustScaler] = None
        self.models: Dict[str, Any] = {}
        self.weights: Dict[str, float] = {}
        self.y_scale = 1.0
        self.residual_std: Optional[float] = None
        self.metrics: Dict[str, Any] = {}
        self.feature_importance: Dict[str, float] = {}
        self.history: Dict[str, List[float]] = {}
        self.trained_at: Optional[str] = None
        self.n_samples = 0

    @property
    def is_trained(self) -> bool:
        return bool(self.models) and self.scaler is not None

    @property
    def is_deep(self) -> bool:
        return self.model_type in DEEP_MODELS

    def _components(self) -> List[str]:
        if self.model_type == ENSEMBLE:
            components = ensemble_components()
            if not components:
                raise RuntimeError("No ensemble components are available")
            return components
        if self.is_deep:
            return []
        return [self.model_type]

    @staticmethod
    def _scale(scaler: RobustScaler, X: np.ndarray) -> np.ndarray:
        return np.clip(np.nan_to_num(scaler.transform(X)), -10.0, 10.0)

    def _windows(
        self, Xs: np.ndarray, y: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, Optional[np.ndarray], np.ndarray]:
        seq = self.sequence_length
        idx = np.arange(seq - 1, len(Xs))
        Xw = np.stack([Xs[i - seq + 1 : i + 1] for i in idx]).astype("float32")
        yw = None if y is None else y[idx]
        return Xw, yw, idx

    def _fit_trees(
        self, names: List[str], X: np.ndarray, y: np.ndarray
    ) -> Dict[str, Any]:
        fitted = {}
        for name in names:
            model = build_tree_model(name, self.random_state)
            model.fit(X, y)
            fitted[name] = model
        return fitted

    def _fit_deep(
        self,
        Xs: np.ndarray,
        y: np.ndarray,
        split: int,
        epochs: int,
        batch_size: int,
    ) -> None:
        _, keras = import_tensorflow()
        keras.utils.set_random_seed(self.random_state)
        y_scaled = np.clip(y / self.y_scale, -8.0, 8.0)
        Xw, yw, idx = self._windows(Xs, y_scaled)
        train = idx < split
        val = ~train
        if train.sum() < 50 or val.sum() < 10:
            raise DataError("Insufficient data for sequence model training")
        builder = build_lstm if self.model_type == "lstm" else build_transformer
        model = builder(self.sequence_length, Xs.shape[1])
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=8, restore_best_weights=True
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=4, min_lr=1e-6
            ),
        ]
        history = model.fit(
            Xw[train],
            yw[train],
            validation_data=(Xw[val], yw[val]),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=0,
        )
        self.models = {"keras": model}
        self.history = {
            k: [float(v) for v in vals] for k, vals in history.history.items()
        }

    def _predict_scaled(self, Xs: np.ndarray) -> np.ndarray:
        if self.is_deep:
            out = np.full(len(Xs), np.nan)
            if len(Xs) < self.sequence_length:
                return out
            Xw, _, idx = self._windows(Xs)
            model = self.models["keras"]
            pred = np.asarray(model(Xw, training=False)).reshape(-1)
            out[idx] = pred * self.y_scale
            return out
        total = np.zeros(len(Xs))
        weight_sum = 0.0
        for name, model in self.models.items():
            w = self.weights.get(name, 1.0)
            total += w * np.asarray(model.predict(Xs), dtype=float).reshape(-1)
            weight_sum += w
        return total / weight_sum

    def fit(
        self,
        data: pd.DataFrame,
        validation_fraction: float = 0.2,
        epochs: int = 60,
        batch_size: int = 32,
    ) -> Dict[str, Any]:
        if not 0.05 <= validation_fraction <= 0.5:
            raise ValueError("validation_fraction must be between 0.05 and 0.5")
        frame = normalize_ohlcv(data)
        if len(frame) < MIN_ROWS:
            raise DataError(
                f"Insufficient data: {len(frame)} rows, at least {MIN_ROWS} required"
            )
        dataset = supervised_frame(frame)
        minimum = MIN_SAMPLES + (self.sequence_length if self.is_deep else 0)
        if len(dataset) < minimum:
            raise DataError(
                f"Insufficient usable samples: {len(dataset)}, at least {minimum} required"
            )

        X = dataset[FEATURE_COLUMNS].to_numpy(dtype=float)
        y = dataset["target"].to_numpy(dtype=float)
        n = len(X)
        split = int(n * (1 - validation_fraction))
        split = max(50, min(split, n - 20))

        self.scaler = RobustScaler().fit(X[:split])
        Xs = self._scale(self.scaler, X)
        self.y_scale = float(np.std(y[:split])) or 1.0

        if self.is_deep:
            self._fit_deep(Xs, y, split, epochs, batch_size)
            self.weights = {"keras": 1.0}
        else:
            names = self._components()
            fitted = self._fit_trees(names, Xs[:split], y[:split])
            val_rmse = {}
            for name, model in fitted.items():
                pred = np.asarray(model.predict(Xs[split:]), dtype=float).reshape(-1)
                val_rmse[name] = float(np.sqrt(np.mean((pred - y[split:]) ** 2)))
            inv = {k: 1.0 / max(v, 1e-12) ** 2 for k, v in val_rmse.items()}
            total = sum(inv.values())
            self.weights = {k: v / total for k, v in inv.items()}
            self.models = fitted

        holdout_pred = self._predict_scaled(Xs)[split:]
        mask = np.isfinite(holdout_pred)
        metrics = score_predictions(y[split:][mask], holdout_pred[mask])
        if not metrics:
            raise DataError("Validation produced no predictions")
        self.residual_std = float(metrics["rmse"])

        if not self.is_deep:
            self.scaler = RobustScaler().fit(X)
            Xs_all = self._scale(self.scaler, X)
            self.models = self._fit_trees(list(self.models), Xs_all, y)
            self.feature_importance = self._importance()

        self.metrics = metrics
        self.n_samples = int(n)
        self.trained_at = datetime.now(timezone.utc).isoformat()
        return self.describe()

    def _importance(self) -> Dict[str, float]:
        acc = np.zeros(len(FEATURE_COLUMNS))
        count = 0
        for model in self.models.values():
            imp = getattr(model, "feature_importances_", None)
            if imp is None:
                continue
            imp = np.asarray(imp, dtype=float)
            total = imp.sum()
            if total > 0:
                acc += imp / total
                count += 1
        if count == 0:
            return {}
        acc /= count
        order = np.argsort(acc)[::-1][:15]
        return {FEATURE_COLUMNS[i]: float(acc[i]) for i in order}

    def _require_trained(self) -> None:
        if not self.is_trained:
            raise NotTrainedError("Model must be trained or loaded before use")

    def predict_series(self, data: pd.DataFrame) -> pd.Series:
        self._require_trained()
        frame = normalize_ohlcv(data)
        feats = build_features(frame)
        valid = feats.notna().all(axis=1)
        feats = feats[valid]
        if feats.empty:
            return pd.Series(dtype=float)
        Xs = self._scale(self.scaler, feats.to_numpy(dtype=float))
        pred = self._predict_scaled(Xs)
        return pd.Series(pred, index=feats.index, name="predicted_return").dropna()

    def _predict_last(self, frame: pd.DataFrame) -> float:
        feats = build_features(frame)
        need = self.sequence_length if self.is_deep else 1
        tail = feats.iloc[-need:]
        if len(tail) < need:
            raise DataError("Insufficient history for prediction")
        if tail.isna().any().any():
            tail = tail.fillna(0.0)
        Xs = self._scale(self.scaler, tail.to_numpy(dtype=float))
        pred = self._predict_scaled(Xs)
        value = float(pred[-1])
        if not np.isfinite(value):
            raise DataError("Model produced a non-finite prediction")
        return float(np.clip(value, -0.5, 0.5))

    def predict_next(self, data: pd.DataFrame) -> float:
        self._require_trained()
        frame = normalize_ohlcv(data)
        if len(frame) < MIN_ROWS:
            raise DataError(
                f"Insufficient data: {len(frame)} rows, at least {MIN_ROWS} required"
            )
        return self._predict_last(frame)

    def forecast(self, data: pd.DataFrame, steps: int = 7) -> List[Dict[str, Any]]:
        self._require_trained()
        if not 1 <= steps <= MAX_FORECAST_STEPS:
            raise ValueError(f"steps must be between 1 and {MAX_FORECAST_STEPS}")
        frame = normalize_ohlcv(data)
        if len(frame) < MIN_ROWS:
            raise DataError(
                f"Insufficient data: {len(frame)} rows, at least {MIN_ROWS} required"
            )
        sigma = self.residual_std or float(self.y_scale)
        volume = float(frame["volume"].tail(20).median())
        price = float(frame["close"].iloc[-1])
        log_price = np.log(price)
        base_log_price = log_price
        work = frame
        rows = []
        for step in range(1, steps + 1):
            pred = self._predict_last(work)
            prev_price = price
            log_price += pred
            price = float(np.exp(log_price))
            ts = _next_timestamp(work.index[-1], self.calendar)
            band = 1.96 * sigma * np.sqrt(step)
            rows.append(
                {
                    "step": step,
                    "date": ts.strftime("%Y-%m-%d"),
                    "predicted_return": pred,
                    "predicted_price": price,
                    "lower": float(np.exp(log_price - band)),
                    "upper": float(np.exp(log_price + band)),
                    "cumulative_return": float(np.exp(log_price - base_log_price) - 1),
                }
            )
            bar = pd.DataFrame(
                {
                    "open": [prev_price],
                    "high": [max(prev_price, price)],
                    "low": [min(prev_price, price)],
                    "close": [price],
                    "volume": [volume],
                },
                index=pd.DatetimeIndex([ts], name="timestamp"),
            )
            work = pd.concat([work, bar])
        return rows

    def describe(self) -> Dict[str, Any]:
        return {
            "model_type": self.model_type,
            "components": list(self.weights) if self.weights else [],
            "weights": {k: float(v) for k, v in self.weights.items()},
            "trained_at": self.trained_at,
            "n_samples": self.n_samples,
            "sequence_length": self.sequence_length if self.is_deep else None,
            "calendar": self.calendar,
            "residual_std": self.residual_std,
            "metrics": self.metrics,
            "feature_importance": self.feature_importance,
        }

    def save(self, directory: str, extra: Optional[Dict[str, Any]] = None) -> None:
        self._require_trained()
        directory = os.path.abspath(directory)
        parent = os.path.dirname(directory)
        os.makedirs(parent, exist_ok=True)
        tmp = tempfile.mkdtemp(prefix=".tmp-", dir=parent)
        try:
            meta = self.describe()
            meta.update(
                {
                    "format_version": MODEL_FORMAT_VERSION,
                    "feature_columns": FEATURE_COLUMNS,
                    "random_state": self.random_state,
                    "y_scale": self.y_scale,
                    "history": self.history,
                }
            )
            if extra:
                meta.update(extra)
            with open(os.path.join(tmp, "meta.json"), "w") as fh:
                json.dump(meta, fh, indent=2)
            bundle = {
                "scaler": self.scaler,
                "models": {} if self.is_deep else self.models,
                "weights": self.weights,
            }
            joblib.dump(bundle, os.path.join(tmp, "bundle.joblib"))
            if self.is_deep:
                self.models["keras"].save(os.path.join(tmp, "keras_model.keras"))
            os.chmod(tmp, 0o755)
            previous = None
            if os.path.exists(directory):
                previous = f"{directory}.old-{os.getpid()}"
                os.replace(directory, previous)
            os.replace(tmp, directory)
            if previous:
                shutil.rmtree(previous, ignore_errors=True)
        except Exception:
            shutil.rmtree(tmp, ignore_errors=True)
            raise

    @classmethod
    def load(cls, directory: str) -> "TimeSeriesPredictor":
        meta_path = os.path.join(directory, "meta.json")
        with open(meta_path) as fh:
            meta = json.load(fh)
        if (
            meta.get("format_version") != MODEL_FORMAT_VERSION
            or meta.get("feature_columns") != FEATURE_COLUMNS
        ):
            raise ModelCompatibilityError(
                "Stored model is incompatible with the current feature set"
            )
        obj = cls(
            meta["model_type"],
            meta.get("sequence_length") or 30,
            meta.get("random_state", 42),
            meta.get("calendar", "B"),
        )
        bundle = joblib.load(os.path.join(directory, "bundle.joblib"))
        obj.scaler = bundle["scaler"]
        obj.weights = bundle["weights"]
        obj.models = bundle["models"]
        if obj.is_deep:
            _, keras = import_tensorflow()
            obj.models = {
                "keras": keras.models.load_model(
                    os.path.join(directory, "keras_model.keras"), compile=False
                )
            }
        obj.y_scale = meta["y_scale"]
        obj.residual_std = meta.get("residual_std")
        obj.metrics = meta.get("metrics", {})
        obj.feature_importance = meta.get("feature_importance", {})
        obj.history = meta.get("history", {})
        obj.trained_at = meta.get("trained_at")
        obj.n_samples = meta.get("n_samples", 0)
        return obj
