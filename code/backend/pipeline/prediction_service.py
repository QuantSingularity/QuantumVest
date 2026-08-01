"""
Prediction service - wraps the LSTM/ARIMA model with caching and data fetching.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from pipeline.crypto_api import CryptoDataFetcher
from pipeline.data_storage import DataStorage
from pipeline.lstm_model import LSTMModel
from pipeline.stock_api import StockDataFetcher

logger = logging.getLogger(__name__)


class PredictionService:
    """Generate price forecasts for stocks and crypto."""

    def __init__(
        self,
        model_dir: str = "resources/models",
        data_dir: str = "resources/data",
    ) -> None:
        os.makedirs(model_dir, exist_ok=True)
        os.makedirs(data_dir, exist_ok=True)
        self._model_dir = model_dir
        self._lstm = LSTMModel(model_dir)
        self._storage = DataStorage(data_dir)
        self._stock = StockDataFetcher()
        self._crypto = CryptoDataFetcher()

    # ------------------------------------------------------------------

    def get_stock_prediction(
        self, symbol: str, days_ahead: int = 7, use_cached: bool = True
    ) -> Dict[str, Any]:
        return self._predict(symbol, "stock", days_ahead, use_cached)

    def get_crypto_prediction(
        self, symbol: str, days_ahead: int = 7, use_cached: bool = True
    ) -> Dict[str, Any]:
        return self._predict(symbol, "crypto", days_ahead, use_cached)

    def get_available_models(self) -> List[str]:
        if not os.path.isdir(self._model_dir):
            return []
        return [
            f.replace("_scaler.pkl", "")
            for f in os.listdir(self._model_dir)
            if f.endswith("_scaler.pkl")
        ]

    # ------------------------------------------------------------------

    def _predict(
        self, symbol: str, asset_type: str, days_ahead: int, use_cached: bool
    ) -> Dict[str, Any]:
        try:
            df = self._load_data(symbol, asset_type, use_cached)
            if df is None or df.empty:
                return {"success": False, "error": f"No data available for {symbol}"}

            model = LSTMModel(self._model_dir)
            if not model.load(asset_type, symbol):
                logger.info("Training new model for %s (%s)", symbol, asset_type)
                result = model.train(df, asset_type, symbol)
                if not result["success"]:
                    return {
                        "success": False,
                        "error": result.get("error", "Training failed"),
                    }

            predictions = model.predict(df, days_ahead)
            last_price = float(df["close"].iloc[-1]) if "close" in df.columns else None

            return {
                "success": True,
                "symbol": symbol,
                "asset_type": asset_type,
                "days_ahead": days_ahead,
                "predictions": [round(p, 4) for p in predictions],
                "last_known_price": last_price,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            logger.error("Prediction error for %s: %s", symbol, exc)
            return {"success": False, "error": str(exc)}

    def _load_data(self, symbol: str, asset_type: str, use_cached: bool):
        if asset_type == "stock":
            load = self._storage.load_stock_data
            fetch = self._stock.fetch_data
            save = self._storage.save_stock_data
        else:
            load = self._storage.load_crypto_data
            fetch = self._crypto.fetch_data
            save = self._storage.save_crypto_data

        df = load(symbol) if use_cached else None
        if df is None or df.empty:
            df = fetch(symbol)
            if df is not None and not df.empty:
                save(df, symbol)
        return df
