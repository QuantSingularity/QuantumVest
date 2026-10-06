import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

import numpy as np
import pandas as pd
from ai_models.data.features import MIN_ROWS, normalize_ohlcv
from ai_models.exceptions import DataError, PredictionError
from ai_models.models.constants import (
    DEEP_MODELS,
    ENSEMBLE,
    FAST_MODEL_TYPES,
    MAX_FORECAST_STEPS,
)
from ai_models.models.predictor import TimeSeriesPredictor
from ai_models.serving.registry import (
    ModelStore,
    normalize_asset_type,
    normalize_model_type,
    normalize_symbol,
)

logger = logging.getLogger(__name__)

DataProvider = Callable[[str, str, bool], pd.DataFrame]
TRADING_DAYS = 252


class PredictionEngine:
    def __init__(
        self,
        store: ModelStore,
        data_provider: DataProvider,
        default_model: str = ENSEMBLE,
        max_model_age_days: int = 7,
        max_concurrent_training: int = 2,
    ) -> None:
        self.store = store
        self.data_provider = data_provider
        self.default_model = normalize_model_type(default_model)
        self.max_model_age = timedelta(days=max_model_age_days)
        self._slots = threading.BoundedSemaphore(max(1, int(max_concurrent_training)))
        self._locks: Dict[str, threading.Lock] = {}
        self._locks_guard = threading.Lock()

    def _lock_for(self, key: str) -> threading.Lock:
        with self._locks_guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = self._locks[key] = threading.Lock()
            return lock

    def _frame(self, symbol: str, asset_type: str, refresh: bool) -> pd.DataFrame:
        try:
            raw = self.data_provider(symbol, asset_type, refresh)
        except DataError as exc:
            raise PredictionError(str(exc), "no_data") from exc
        if raw is None or len(raw) == 0:
            raise PredictionError(f"No market data available for {symbol}", "no_data")
        try:
            frame = normalize_ohlcv(raw)
        except DataError as exc:
            raise PredictionError(str(exc), "no_data") from exc
        if len(frame) < MIN_ROWS:
            raise PredictionError(
                f"Insufficient history for {symbol}: {len(frame)} rows, "
                f"at least {MIN_ROWS} required",
                "insufficient_data",
            )
        return frame

    def _is_stale(self, predictor: TimeSeriesPredictor) -> bool:
        if predictor.model_type in DEEP_MODELS or not predictor.trained_at:
            return False
        try:
            trained = datetime.fromisoformat(predictor.trained_at)
        except ValueError:
            return True
        return datetime.now(timezone.utc) - trained > self.max_model_age

    def _fit(
        self,
        frame: pd.DataFrame,
        symbol: str,
        asset_type: str,
        model_type: str,
        epochs: int,
    ) -> TimeSeriesPredictor:
        calendar = "D" if asset_type == "crypto" else "B"
        predictor = TimeSeriesPredictor(model_type, calendar=calendar)
        try:
            predictor.fit(frame, epochs=epochs)
        except DataError as exc:
            raise PredictionError(str(exc), "insufficient_data") from exc
        self.store.save(predictor, asset_type, symbol)
        logger.info("Trained %s model for %s (%s)", model_type, symbol, asset_type)
        return predictor

    def _obtain(
        self,
        symbol: str,
        asset_type: str,
        model_type: str,
        auto_train: bool,
        frame_loader: Callable[[], pd.DataFrame],
        epochs: int = 60,
        force: bool = False,
    ) -> TimeSeriesPredictor:
        predictor = None if force else self.store.load(asset_type, symbol, model_type)
        if predictor is not None and not self._is_stale(predictor):
            return predictor
        if not auto_train and not force:
            if predictor is not None:
                return predictor
            raise PredictionError(
                f"No trained {model_type} model for {symbol}", "model_unavailable"
            )
        if model_type not in FAST_MODEL_TYPES:
            if predictor is not None:
                return predictor
            raise PredictionError(
                f"{model_type} models must be trained offline with the training scripts",
                "training_not_allowed",
            )
        key = f"{asset_type}:{symbol}:{model_type}"
        with self._lock_for(key):
            if not force:
                current = self.store.load(asset_type, symbol, model_type)
                if current is not None and not self._is_stale(current):
                    return current
            if not self._slots.acquire(blocking=False):
                raise PredictionError(
                    "Model training capacity is busy, retry shortly", "busy"
                )
            try:
                return self._fit(frame_loader(), symbol, asset_type, model_type, epochs)
            finally:
                self._slots.release()

    def train(
        self,
        symbol: str,
        asset_type: str = "stock",
        model_type: Optional[str] = None,
        epochs: int = 60,
    ) -> Dict[str, Any]:
        symbol = normalize_symbol(symbol)
        asset_type = normalize_asset_type(asset_type)
        model_type = normalize_model_type(model_type or self.default_model)
        predictor = self._obtain(
            symbol,
            asset_type,
            model_type,
            auto_train=True,
            frame_loader=lambda: self._frame(symbol, asset_type, True),
            epochs=epochs,
            force=True,
        )
        return {
            "success": True,
            "symbol": symbol,
            "asset_type": asset_type,
            "model": self._model_info(predictor),
        }

    @staticmethod
    def _model_info(predictor: TimeSeriesPredictor) -> Dict[str, Any]:
        metrics = predictor.metrics or {}
        skill = metrics.get("skill_vs_naive")
        return {
            "type": predictor.model_type,
            "components": list(predictor.weights),
            "trained_at": predictor.trained_at,
            "n_samples": predictor.n_samples,
            "metrics": {
                k: metrics.get(k)
                for k in (
                    "samples",
                    "directional_accuracy",
                    "rmse",
                    "baseline_rmse",
                    "skill_vs_naive",
                    "information_coefficient",
                    "price_mape_pct",
                    "naive_price_mape_pct",
                )
            },
            "beats_naive": bool(skill is not None and skill > 0),
            "feature_importance": predictor.feature_importance,
        }

    def predict(
        self,
        symbol: str,
        asset_type: str = "stock",
        steps: int = 7,
        model_type: Optional[str] = None,
        auto_train: bool = True,
        refresh_data: bool = False,
    ) -> Dict[str, Any]:
        symbol = normalize_symbol(symbol)
        asset_type = normalize_asset_type(asset_type)
        model_type = normalize_model_type(model_type or self.default_model)
        if not 1 <= int(steps) <= MAX_FORECAST_STEPS:
            raise PredictionError(
                f"steps must be between 1 and {MAX_FORECAST_STEPS}", "invalid_request"
            )
        steps = int(steps)

        frame = self._frame(symbol, asset_type, refresh_data)
        predictor = self._obtain(
            symbol,
            asset_type,
            model_type,
            auto_train,
            frame_loader=lambda: frame,
        )
        try:
            rows = predictor.forecast(frame, steps)
        except DataError as exc:
            raise PredictionError(str(exc), "insufficient_data") from exc

        last_price = float(frame["close"].iloc[-1])
        cumulative = rows[-1]["cumulative_return"]
        sigma = (predictor.residual_std or 0.0) * np.sqrt(steps)
        if abs(np.log1p(cumulative)) < 0.5 * sigma:
            direction = "neutral"
        else:
            direction = "up" if cumulative > 0 else "down"
        return {
            "success": True,
            "symbol": symbol,
            "asset_type": asset_type,
            "steps": steps,
            "last_price": last_price,
            "last_timestamp": frame.index[-1].strftime("%Y-%m-%d"),
            "forecast": rows,
            "expected_return": cumulative,
            "direction": direction,
            "model": self._model_info(predictor),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def models(
        self, symbol: Optional[str] = None, asset_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return self.store.list_models(asset_type, symbol)

    def annualized_forecast_returns(
        self,
        assets: Dict[str, str],
        horizon: int = 21,
        model_type: Optional[str] = None,
        auto_train: bool = True,
    ) -> pd.Series:
        out: Dict[str, float] = {}
        for symbol, asset_type in assets.items():
            try:
                result = self.predict(
                    symbol,
                    asset_type,
                    steps=horizon,
                    model_type=model_type,
                    auto_train=auto_train,
                )
            except (PredictionError, ValueError) as exc:
                logger.info("Forecast unavailable for %s: %s", symbol, exc)
                out[symbol] = np.nan
                continue
            if not result["model"]["beats_naive"]:
                out[symbol] = np.nan
                continue
            growth = 1.0 + result["expected_return"]
            annual = growth ** (TRADING_DAYS / horizon) - 1.0
            out[symbol] = float(np.clip(annual, -0.5, 1.0))
        return pd.Series(out, dtype=float)
