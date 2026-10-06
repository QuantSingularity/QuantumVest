import logging
from typing import Any, Dict, List, Optional

import pandas as pd
from ai_models import (
    DataError,
    InvalidSymbolError,
    ModelStore,
    OptimizationError,
    PortfolioOptimizer,
    PredictionEngine,
    PredictionError,
    RiskAssessmentModel,
    blend_expected_returns,
    discrete_allocation,
    normalize_ohlcv,
    risk_tolerance_to_aversion,
)
from flask import current_app
from pipeline.crypto_api import CryptoDataFetcher
from pipeline.data_storage import DataStorage
from pipeline.stock_api import StockDataFetcher

__all__ = [
    "AIService",
    "DataError",
    "InvalidSymbolError",
    "OptimizationError",
    "PredictionError",
    "get_ai_service",
]

logger = logging.getLogger(__name__)

_EXTENSION_KEY = "quantumvest_ai"
MIN_RETURN_OBSERVATIONS = 30


class AIService:
    def __init__(
        self,
        model_dir: str,
        data_dir: str,
        default_model: str = "ensemble",
        auto_train: bool = True,
        max_model_age_days: int = 7,
        data_ttl_seconds: int = 43200,
        max_concurrent_training: int = 2,
        forecast_weight: float = 0.3,
    ) -> None:
        self.auto_train = auto_train
        self.data_ttl_seconds = int(data_ttl_seconds)
        self.forecast_weight = float(forecast_weight)
        self.storage = DataStorage(data_dir)
        self._stock = StockDataFetcher()
        self._crypto = CryptoDataFetcher()
        self.store = ModelStore(model_dir)
        self.engine = PredictionEngine(
            self.store,
            self._load_market_data,
            default_model=default_model,
            max_model_age_days=max_model_age_days,
            max_concurrent_training=max_concurrent_training,
        )
        self.risk = RiskAssessmentModel()

    @classmethod
    def from_app(cls, app) -> "AIService":
        cfg = app.config
        return cls(
            model_dir=cfg["MODEL_PATH"],
            data_dir=cfg["DATA_PATH"],
            default_model=cfg.get("AI_DEFAULT_MODEL", "ensemble"),
            auto_train=cfg.get("AI_AUTO_TRAIN", True),
            max_model_age_days=cfg.get("AI_MODEL_MAX_AGE_DAYS", 7),
            data_ttl_seconds=cfg.get("AI_MARKET_DATA_TTL_SECONDS", 43200),
            max_concurrent_training=cfg.get("AI_MAX_CONCURRENT_TRAINING", 2),
            forecast_weight=cfg.get("AI_FORECAST_WEIGHT", 0.3),
        )

    def _load_market_data(
        self, symbol: str, asset_type: str, refresh: bool
    ) -> pd.DataFrame:
        crypto = asset_type == "crypto"
        load = self.storage.load_crypto_data if crypto else self.storage.load_stock_data
        save = self.storage.save_crypto_data if crypto else self.storage.save_stock_data
        fetcher = self._crypto if crypto else self._stock
        cached = load(symbol)
        age = self.storage.age_seconds(asset_type, symbol)
        fresh = (
            cached is not None
            and not cached.empty
            and age is not None
            and age < self.data_ttl_seconds
        )
        if fresh and not refresh:
            return cached
        fetched = fetcher.fetch_data(symbol, period="5y")
        if fetched is not None and not fetched.empty:
            save(fetched, symbol)
            return fetched
        if cached is not None and not cached.empty:
            logger.warning("Using stale cached data for %s", symbol)
            return cached
        raise DataError(f"No market data available for {symbol}")

    def close_series(
        self, symbol: str, asset_type: str, refresh: bool = False
    ) -> pd.Series:
        frame = normalize_ohlcv(self._load_market_data(symbol, asset_type, refresh))
        series = frame["close"].copy()
        series.index = series.index.normalize()
        series = series[~series.index.duplicated(keep="last")]
        series.name = symbol
        return series

    def predict(
        self,
        symbol: str,
        asset_type: str = "stock",
        steps: int = 7,
        model_type: Optional[str] = None,
        refresh: bool = False,
    ) -> Dict[str, Any]:
        return self.engine.predict(
            symbol,
            asset_type,
            steps=steps,
            model_type=model_type,
            auto_train=self.auto_train,
            refresh_data=refresh,
        )

    def train(
        self,
        symbol: str,
        asset_type: str = "stock",
        model_type: Optional[str] = None,
        epochs: int = 60,
    ) -> Dict[str, Any]:
        return self.engine.train(symbol, asset_type, model_type, epochs)

    def models(
        self, symbol: Optional[str] = None, asset_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return self.engine.models(symbol, asset_type)

    def optimize(
        self,
        prices: pd.DataFrame,
        asset_types: Dict[str, str],
        objective: str = "max_sharpe",
        risk_tolerance: float = 0.5,
        target_return: Optional[float] = None,
        min_weight: float = 0.0,
        max_weight: Optional[float] = None,
        use_forecasts: bool = False,
        forecast_weight: Optional[float] = None,
        current_values: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        returns = prices.pct_change().dropna()
        n = returns.shape[1]
        if max_weight is None:
            max_weight = max(0.4, 1.0 / max(n, 1))
        optimizer = PortfolioOptimizer()
        expected = None
        forecast_used: List[str] = []
        if use_forecasts:
            historical = optimizer.estimate_expected_returns(returns)
            forecast = self.engine.annualized_forecast_returns(
                {s: asset_types.get(s, "stock") for s in returns.columns},
                horizon=21,
                auto_train=self.auto_train,
            )
            forecast_used = [s for s in forecast.index if pd.notna(forecast[s])]
            weight = (
                self.forecast_weight if forecast_weight is None else forecast_weight
            )
            expected = blend_expected_returns(historical, forecast, weight)
        result = optimizer.optimize(
            returns,
            objective,
            expected_returns=expected,
            min_weight=min_weight,
            max_weight=max_weight,
            target_return=target_return,
            risk_aversion=risk_tolerance_to_aversion(risk_tolerance),
        )
        result["forecast_assets"] = forecast_used
        weights = result["weights"]
        risk_model = self.risk
        port_returns = risk_model.portfolio_returns(returns, weights)
        result["risk"] = {
            "var_95": risk_model.value_at_risk(port_returns, 0.05),
            "expected_shortfall_95": risk_model.expected_shortfall(port_returns, 0.05),
            "max_drawdown": risk_model.max_drawdown(port_returns),
            "risk_contributions": risk_model.risk_contributions(returns, weights),
        }
        if current_values:
            total = float(sum(current_values.values()))
            if total > 0:
                alloc = discrete_allocation(weights, prices.iloc[-1].to_dict(), total)
                result["discrete_allocation"] = alloc
        return result

    def analyze_risk(
        self,
        prices: pd.DataFrame,
        weights: Dict[str, float],
        scenarios: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        returns = prices.pct_change().dropna()
        if len(returns) < MIN_RETURN_OBSERVATIONS:
            raise OptimizationError(
                f"At least {MIN_RETURN_OBSERVATIONS} overlapping observations are required"
            )
        total = float(sum(weights.values()))
        if total <= 0:
            raise OptimizationError("Portfolio has no weight to analyze")
        norm = {k: v / total for k, v in weights.items()}
        port = self.risk.portfolio_returns(returns, norm)
        return {
            "weights": norm,
            "summary": self.risk.risk_summary(port),
            "stress_test": self.risk.stress_test(norm, returns, scenarios),
            "risk_contributions": self.risk.risk_contributions(returns, norm),
            "observations": int(len(returns)),
        }

    def status(self) -> Dict[str, Any]:
        return {
            "available": True,
            "models_trained": len(self.models()),
            "default_model": self.engine.default_model,
            "auto_train": self.auto_train,
        }


def get_ai_service() -> AIService:
    app = current_app._get_current_object()
    service = app.extensions.get(_EXTENSION_KEY)
    if service is None:
        service = AIService.from_app(app)
        app.extensions[_EXTENSION_KEY] = service
    return service
