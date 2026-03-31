from typing import Any

"""
Validation Script
Tests the data pipeline, model training, and API endpoints
"""

import logging
import os
import sys

import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_pipeline.crypto_api import CryptoDataFetcher
from data_pipeline.data_storage import DataStorage
from data_pipeline.lstm_model import LSTMModel
from data_pipeline.prediction_service import PredictionService
from data_pipeline.stock_api import StockDataFetcher

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_data_fetching() -> Any:
    """Test data fetching functionality"""
    logger.info("Testing data fetching...")
    stock_fetcher = StockDataFetcher()
    stock_symbols = ["AAPL", "MSFT", "GOOGL"]
    for symbol in stock_symbols:
        logger.info(f"Fetching data for stock {symbol}")
        df = stock_fetcher.fetch_data(symbol)
        if df is not None and (not df.empty):
            logger.info(f"Successfully fetched {len(df)} records for {symbol}")
            logger.info(f"Columns: {df.columns.tolist()}")
            logger.info(
                f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}"
            )
        else:
            logger.error(f"Failed to fetch data for {symbol}")
    crypto_fetcher = CryptoDataFetcher()
    crypto_symbols = ["bitcoin", "ethereum", "ripple"]
    for symbol in crypto_symbols:
        logger.info(f"Fetching data for crypto {symbol}")
        df = crypto_fetcher.fetch_data(symbol)
        if df is not None and (not df.empty):
            logger.info(f"Successfully fetched {len(df)} records for {symbol}")
            logger.info(f"Columns: {df.columns.tolist()}")
            logger.info(
                f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}"
            )
        else:
            logger.error(f"Failed to fetch data for {symbol}")


def test_data_storage() -> Any:
    """Test data storage functionality"""
    logger.info("Testing data storage...")
    stock_fetcher = StockDataFetcher()
    crypto_fetcher = CryptoDataFetcher()
    data_storage = DataStorage()
    symbol = "AAPL"
    logger.info(f"Testing storage for stock {symbol}")
    df = stock_fetcher.fetch_data(symbol)
    if df is not None and (not df.empty):
        path = data_storage.save_stock_data(df, symbol)
        logger.info(f"Saved stock data to {path}")
        loaded_df = data_storage.load_stock_data(symbol)
        if loaded_df is not None and (not loaded_df.empty):
            logger.info(f"Successfully loaded {len(loaded_df)} records for {symbol}")
        else:
            logger.error(f"Failed to load data for {symbol}")
    symbol = "bitcoin"
    logger.info(f"Testing storage for crypto {symbol}")
    df = crypto_fetcher.fetch_data(symbol)
    if df is not None and (not df.empty):
        path = data_storage.save_crypto_data(df, symbol)
        logger.info(f"Saved crypto data to {path}")
        loaded_df = data_storage.load_crypto_data(symbol)
        if loaded_df is not None and (not loaded_df.empty):
            logger.info(f"Successfully loaded {len(loaded_df)} records for {symbol}")
        else:
            logger.error(f"Failed to load data for {symbol}")


def test_model_training() -> Any:
    """Test model training functionality"""
    logger.info("Testing model training...")
    stock_fetcher = StockDataFetcher()
    lstm_model = LSTMModel()
    symbol = "AAPL"
    logger.info(f"Testing model training for stock {symbol}")
    df = stock_fetcher.fetch_data(symbol)
    if df is not None and (not df.empty):
        df = df.tail(200)
        result = lstm_model.train(df, "stock", symbol, epochs=2)
        if result["success"]:
            logger.info(f"Successfully trained model for {symbol}")
            logger.info(f"Model saved to {result['model_path']}")
            logger.info(f"Training loss: {result['training_loss']}")
            logger.info(f"Validation loss: {result['validation_loss']}")
        else:
            logger.error(
                f"Failed to train model for {symbol}: {result.get('error', 'Unknown error')}"
            )


def test_prediction_service() -> Any:
    """Test prediction service functionality"""
    logger.info("Testing prediction service...")
    prediction_service = PredictionService()
    symbol = "AAPL"
    logger.info(f"Testing prediction for stock {symbol}")
    result = prediction_service.get_stock_prediction(symbol, days_ahead=7)
    if result["success"]:
        logger.info(f"Successfully generated predictions for {symbol}")
        logger.info(f"Predictions: {result['predictions']}")
        logger.info(f"Dates: {result['dates']}")
    else:
        logger.error(
            f"Failed to generate predictions for {symbol}: {result.get('error', 'Unknown error')}"
        )
    symbol = "bitcoin"
    logger.info(f"Testing prediction for crypto {symbol}")
    result = prediction_service.get_crypto_prediction(symbol, days_ahead=7)
    if result["success"]:
        logger.info(f"Successfully generated predictions for {symbol}")
        logger.info(f"Predictions: {result['predictions']}")
        logger.info(f"Dates: {result['dates']}")
    else:
        logger.error(
            f"Failed to generate predictions for {symbol}: {result.get('error', 'Unknown error')}"
        )


def test_api_endpoints() -> Any:
    """Test API endpoints"""
    logger.info("Testing API endpoints...")
    base_url = "http://localhost:5000/api/v1"
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            logger.info("Health endpoint is working")
            logger.info(f"Response: {response.json()}")
        else:
            logger.error(
                f"Health endpoint failed with status code {response.status_code}"
            )
    except Exception as e:
        logger.error(f"Error testing health endpoint: {e}")
    try:
        symbol = "AAPL"
        response = requests.get(f"{base_url}/data/stocks/{symbol}")
        if response.status_code == 200:
            logger.info(f"Stock data endpoint for {symbol} is working")
            data = response.json()
            logger.info(f"Received {len(data.get('data', []))} records")
        else:
            logger.error(
                f"Stock data endpoint failed with status code {response.status_code}"
            )
    except Exception as e:
        logger.error(f"Error testing stock data endpoint: {e}")
    try:
        symbol = "AAPL"
        response = requests.get(f"{base_url}/predictions/stocks/{symbol}")
        if response.status_code == 200:
            logger.info(f"Stock prediction endpoint for {symbol} is working")
            data = response.json()
            logger.info(f"Predictions: {data.get('predictions', [])}")
        else:
            logger.error(
                f"Stock prediction endpoint failed with status code {response.status_code}"
            )
    except Exception as e:
        logger.error(f"Error testing stock prediction endpoint: {e}")


def run_validation() -> Any:
    """Run all validation tests"""
    logger.info("Starting validation tests...")
    report_dir = "../../resources/validation_reports"
    os.makedirs(report_dir, exist_ok=True)
    test_data_fetching()
    test_data_storage()
    test_model_training()
    test_prediction_service()
    logger.info("Validation tests completed")


if __name__ == "__main__":
    run_validation()
