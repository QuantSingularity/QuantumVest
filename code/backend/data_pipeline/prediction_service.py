"""
Prediction Service Module
Generates predictions using trained models
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List

from data_pipeline.crypto_api import CryptoDataFetcher
from data_pipeline.data_storage import DataStorage
from data_pipeline.lstm_model import LSTMModel
from data_pipeline.stock_api import StockDataFetcher

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class PredictionService:
    """Service for generating predictions using trained models"""

    def __init__(
        self,
        model_dir: str = "../../resources/models",
        data_dir: str = "../../resources/data",
    ) -> None:
        """
        Initialize the prediction service

        Args:
            model_dir: Directory with trained models
            data_dir: Directory with stored data
        """
        self.model_dir = model_dir
        self.data_dir = data_dir
        os.makedirs(model_dir, exist_ok=True)
        os.makedirs(data_dir, exist_ok=True)
        self.lstm_model = LSTMModel(model_dir)
        self.data_storage = DataStorage(data_dir)
        self.stock_fetcher = StockDataFetcher()
        self.crypto_fetcher = CryptoDataFetcher()

    def get_stock_prediction(
        self, symbol: str, days_ahead: int = 7, use_cached: bool = True
    ) -> Dict[str, Any]:
        """
        Get stock price prediction

        Args:
            symbol: Stock symbol
            days_ahead: Number of days to predict ahead
            use_cached: Whether to use cached data if available

        Returns:
            Dictionary with prediction results
        """
        try:
            if use_cached:
                df = self.data_storage.load_stock_data(symbol)
                if df is None or df.empty:
                    df = self.stock_fetcher.fetch_data(symbol)
                    if not df.empty:
                        self.data_storage.save_stock_data(df, symbol)
            else:
                df = self.stock_fetcher.fetch_data(symbol)
                if not df.empty:
                    self.data_storage.save_stock_data(df, symbol)
            if df is None or df.empty:
                return {
                    "success": False,
                    "error": f"No data available for stock {symbol}",
                }
            model_loaded = self.lstm_model.load("stock", symbol)
            if not model_loaded:
                logger.info(f"Model not found for {symbol}, training new model")
                training_result = self.lstm_model.train(df, "stock", symbol)
                if not training_result["success"]:
                    return {
                        "success": False,
                        "error": f"Failed to train model for {symbol}: {training_result.get('error', 'Unknown error')}",
                    }
            prediction_result = self.lstm_model.predict(df, days_ahead=days_ahead)
            if prediction_result["success"]:
                prediction_result["symbol"] = symbol
                prediction_result["asset_type"] = "stock"
                prediction_result["generated_at"] = datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                prediction_result["confidence"] = 0.85
            return prediction_result
        except Exception as e:
            logger.error(f"Error getting stock prediction for {symbol}: {e}")
            return {"success": False, "error": str(e)}

    def get_crypto_prediction(
        self, symbol: str, days_ahead: int = 7, use_cached: bool = True
    ) -> Dict[str, Any]:
        """
        Get cryptocurrency price prediction

        Args:
            symbol: Cryptocurrency symbol
            days_ahead: Number of days to predict ahead
            use_cached: Whether to use cached data if available

        Returns:
            Dictionary with prediction results
        """
        try:
            if use_cached:
                df = self.data_storage.load_crypto_data(symbol)
                if df is None or df.empty:
                    df = self.crypto_fetcher.fetch_data(symbol)
                    if not df.empty:
                        self.data_storage.save_crypto_data(df, symbol)
            else:
                df = self.crypto_fetcher.fetch_data(symbol)
                if not df.empty:
                    self.data_storage.save_crypto_data(df, symbol)
            if df is None or df.empty:
                return {
                    "success": False,
                    "error": f"No data available for cryptocurrency {symbol}",
                }
            model_loaded = self.lstm_model.load("crypto", symbol)
            if not model_loaded:
                logger.info(f"Model not found for {symbol}, training new model")
                training_result = self.lstm_model.train(df, "crypto", symbol)
                if not training_result["success"]:
                    return {
                        "success": False,
                        "error": f"Failed to train model for {symbol}: {training_result.get('error', 'Unknown error')}",
                    }
            prediction_result = self.lstm_model.predict(df, days_ahead=days_ahead)
            if prediction_result["success"]:
                prediction_result["symbol"] = symbol
                prediction_result["asset_type"] = "crypto"
                prediction_result["generated_at"] = datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                prediction_result["confidence"] = 0.8
            return prediction_result
        except Exception as e:
            logger.error(f"Error getting crypto prediction for {symbol}: {e}")
            return {"success": False, "error": str(e)}

    def get_available_models(self) -> Dict[str, List[str]]:
        """
        Get list of available trained models

        Returns:
            Dictionary with available models by asset type
        """
        try:
            available_models = {"stocks": [], "crypto": []}
            if os.path.exists(self.model_dir):
                files = os.listdir(self.model_dir)
                for file in files:
                    if file.endswith("_model.h5"):
                        parts = file.split("_")
                        if len(parts) >= 2:
                            asset_type = parts[0]
                            symbol = "_".join(parts[1:-1])
                            if asset_type == "stock":
                                available_models["stocks"].append(symbol)
                            elif asset_type == "crypto":
                                available_models["crypto"].append(symbol)
            return available_models
        except Exception as e:
            logger.error(f"Error getting available models: {e}")
            return {"stocks": [], "crypto": []}
