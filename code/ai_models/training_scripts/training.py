"""
Training Scripts for QuantumVest AI Models
Comprehensive training pipeline with data preprocessing, model training, validation, and deployment
"""

import json
import logging
import os
import pickle
import sys
import warnings
from datetime import datetime
from typing import Any, Dict

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import logging

from advanced_ai_models import AdvancedTimeSeriesPredictor, ModelFactory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class DataPreprocessor:
    """
    Advanced data preprocessing for financial time series
    """

    def __init__(self) -> None:
        self.scalers = {}
        self.feature_stats = {}

    def load_market_data(self, data_sources: Dict[str, str]) -> pd.DataFrame:
        """
        Load market data from various sources
        """
        all_data = {}
        for asset, source in data_sources.items():
            try:
                if source.endswith(".csv"):
                    df = pd.read_csv(source, index_col=0, parse_dates=True)
                elif source.endswith(".json"):
                    with open(source, "r") as f:
                        data = json.load(f)
                    df = pd.DataFrame(data)
                    df.index = pd.to_datetime(df.index)
                else:
                    df = self._fetch_from_api(source)
                df.columns = [col.lower() for col in df.columns]
                required_cols = ["open", "high", "low", "close", "volume"]
                if not all((col in df.columns for col in required_cols)):
                    logger.warning(f"Missing required columns for {asset}")
                    continue
                all_data[asset] = df
                logger.info(f"Loaded {len(df)} records for {asset}")
            except Exception as e:
                logger.error(f"Error loading data for {asset}: {e}")
                continue
        return all_data

    def _fetch_from_api(self, symbol: str) -> pd.DataFrame:
        """
        Fetch data from financial APIs (placeholder implementation)
        """
        try:
            import yfinance as yf

            ticker = yf.Ticker(symbol)
            df = ticker.history(period="5y")
            df.columns = [col.lower() for col in df.columns]
            return df
        except ImportError:
            logger.error("yfinance not available for API data fetching")
            dates = pd.date_range(start="2019-01-01", end="2024-01-01", freq="D")
            np.random.seed(42)
            data = {
                "open": np.random.normal(100, 10, len(dates)),
                "high": np.random.normal(105, 10, len(dates)),
                "low": np.random.normal(95, 10, len(dates)),
                "close": np.random.normal(100, 10, len(dates)),
                "volume": np.random.randint(1000000, 10000000, len(dates)),
            }
            return pd.DataFrame(data, index=dates)

    def clean_data(self, data: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
        """
        Clean and preprocess market data
        """
        cleaned_data = {}
        for asset, df in data.items():
            try:
                df = df[~df.index.duplicated(keep="first")]
                df = df.sort_index()
                df = df.ffill().bfill()
                price_change = df["close"].pct_change().abs()
                outlier_mask = price_change > 0.5
                df = df[~outlier_mask]
                df = df[(df["close"] > 0) & (df["volume"] > 0)]
                df["returns"] = df["close"].pct_change()
                df["log_returns"] = np.log(df["close"] / df["close"].shift(1))
                df["volatility"] = df["returns"].rolling(window=20).std()
                df = df.dropna()
                if len(df) < 100:
                    logger.warning(f"Insufficient data for {asset} after cleaning")
                    continue
                cleaned_data[asset] = df
                logger.info(f"Cleaned data for {asset}: {len(df)} records")
            except Exception as e:
                logger.error(f"Error cleaning data for {asset}: {e}")
                continue
        return cleaned_data

    def create_features(self, data: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
        """
        Create advanced features for all assets
        """
        featured_data = {}
        for asset, df in data.items():
            try:
                predictor = AdvancedTimeSeriesPredictor()
                df_features = predictor.create_features(df, target_col="close")
                if len(data) > 1:
                    df_features = self._add_cross_asset_features(
                        df_features, data, asset
                    )
                df_features = self._add_market_regime_features(df_features)
                df_features = self._add_economic_indicators(df_features)
                featured_data[asset] = df_features
                logger.info(f"Created {len(df_features.columns)} features for {asset}")
            except Exception as e:
                logger.error(f"Error creating features for {asset}: {e}")
                continue
        return featured_data

    def _add_cross_asset_features(
        self, df: pd.DataFrame, all_data: Dict[str, pd.DataFrame], current_asset: str
    ) -> pd.DataFrame:
        """
        Add features based on other assets (correlations, relative performance)
        """
        try:
            other_assets = [
                asset for asset in all_data.keys() if asset != current_asset
            ]
            for other_asset in other_assets[:3]:
                other_df = all_data[other_asset]
                common_dates = df.index.intersection(other_df.index)
                if len(common_dates) < 50:
                    continue
                df_aligned = df.loc[common_dates]
                other_aligned = other_df.loc[common_dates]
                correlation = (
                    df_aligned["returns"]
                    .rolling(window=30)
                    .corr(other_aligned["returns"])
                )
                df.loc[common_dates, f"corr_{other_asset}"] = correlation
                relative_perf = df_aligned["close"] / other_aligned["close"]
                df.loc[common_dates, f"rel_perf_{other_asset}"] = relative_perf
                df.loc[common_dates, f"rel_strength_{other_asset}"] = (
                    df_aligned["returns"].rolling(window=20).mean()
                    / other_aligned["returns"].rolling(window=20).mean()
                )
        except Exception as e:
            logger.error(f"Error adding cross-asset features: {e}")
        return df

    def _add_market_regime_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add market regime features (bull/bear market indicators)
        """
        try:
            df["trend_20"] = np.where(
                df["close"] > df["close"].rolling(20).mean(), 1, 0
            )
            df["trend_50"] = np.where(
                df["close"] > df["close"].rolling(50).mean(), 1, 0
            )
            df["trend_200"] = np.where(
                df["close"] > df["close"].rolling(200).mean(), 1, 0
            )
            vol_20 = df["returns"].rolling(window=20).std()
            vol_percentile = vol_20.rolling(window=252).rank(pct=True)
            df["vol_regime"] = np.where(
                vol_percentile > 0.8, 2, np.where(vol_percentile < 0.2, 0, 1)
            )
            df["stress_indicator"] = np.where(
                (df["volatility"] > df["volatility"].rolling(252).quantile(0.9))
                & (df["returns"] < df["returns"].rolling(252).quantile(0.1)),
                1,
                0,
            )
        except Exception as e:
            logger.error(f"Error adding market regime features: {e}")
        return df

    def _add_economic_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add economic indicators (placeholder implementation)
        """
        try:
            df["fear_index"] = df["volatility"].rolling(window=20).mean() * 100
            df["rate_environment"] = np.sin(np.arange(len(df)) * 2 * np.pi / 252) + 1
            df["economic_cycle"] = (
                np.cos(np.arange(len(df)) * 2 * np.pi / (252 * 4)) + 1
            )
        except Exception as e:
            logger.error(f"Error adding economic indicators: {e}")
        return df


class ModelTrainer:
    """
    Comprehensive model training pipeline
    """

    def __init__(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.models = {}
        self.training_results = {}

    def train_prediction_models(self, data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """
        Train prediction models for all assets
        """
        results = {}
        for asset, df in data.items():
            logger.info(f"Training prediction models for {asset}")
            try:
                model_types = self.config.get(
                    "prediction_models", ["ensemble", "xgboost", "lstm"]
                )
                asset_results = {}
                for model_type in model_types:
                    logger.info(f"Training {model_type} model for {asset}")
                    predictor = ModelFactory.create_predictor(model_type)
                    train_size = int(len(df) * 0.8)
                    train_data = df.iloc[:train_size]
                    test_data = df.iloc[train_size:]
                    training_metrics = predictor.train(
                        train_data,
                        target_col="close",
                        validation_split=0.2,
                        epochs=self.config.get("epochs", 100),
                    )
                    test_predictions = predictor.predict(test_data, target_col="close")
                    test_actual = test_data["close"].values[-len(test_predictions) :]
                    from sklearn.metrics import (
                        mean_absolute_error,
                        mean_squared_error,
                        r2_score,
                    )

                    test_metrics = {
                        "mse": mean_squared_error(test_actual, test_predictions),
                        "mae": mean_absolute_error(test_actual, test_predictions),
                        "r2": r2_score(test_actual, test_predictions),
                        "mape": np.mean(
                            np.abs((test_actual - test_predictions) / test_actual)
                        )
                        * 100,
                    }
                    model_path = f"models/{asset}_{model_type}_predictor"
                    os.makedirs(os.path.dirname(model_path), exist_ok=True)
                    predictor.save_model(model_path)
                    asset_results[model_type] = {
                        "training_metrics": training_metrics,
                        "test_metrics": test_metrics,
                        "model_path": model_path,
                        "feature_importance": predictor.feature_importance,
                    }
                    logger.info(
                        f"Completed {model_type} model for {asset}: R² = {test_metrics['r2']:.4f}"
                    )
                results[asset] = asset_results
            except Exception as e:
                logger.error(f"Error training prediction models for {asset}: {e}")
                continue
        return results

    def train_portfolio_optimization(
        self, data: Dict[str, pd.DataFrame]
    ) -> Dict[str, Any]:
        """
        Train portfolio optimization models
        """
        logger.info("Training portfolio optimization models")
        try:
            common_dates = None
            for asset, df in data.items():
                if common_dates is None:
                    common_dates = df.index
                else:
                    common_dates = common_dates.intersection(df.index)
            returns_data = pd.DataFrame()
            for asset, df in data.items():
                returns_data[asset] = df.loc[common_dates, "returns"]
            returns_data = returns_data.dropna()
            if len(returns_data) < 100:
                raise ValueError("Insufficient data for portfolio optimization")
            optimizer = ModelFactory.create_optimizer()
            objectives = ["max_sharpe", "min_variance", "max_return"]
            optimization_results = {}
            for objective in objectives:
                logger.info(f"Testing {objective} optimization")
                result = optimizer.optimize_portfolio(
                    returns_data,
                    objective=objective,
                    constraints=self.config.get("portfolio_constraints", {}),
                )
                optimization_results[objective] = result
            optimizer_path = "models/portfolio_optimizer.pkl"
            os.makedirs(os.path.dirname(optimizer_path), exist_ok=True)
            with open(optimizer_path, "wb") as f:
                pickle.dump(optimizer, f)
            return {
                "optimization_results": optimization_results,
                "optimizer_path": optimizer_path,
                "assets": list(data.keys()),
                "data_period": {
                    "start": returns_data.index.min().isoformat(),
                    "end": returns_data.index.max().isoformat(),
                    "samples": len(returns_data),
                },
            }
        except Exception as e:
            logger.error(f"Error training portfolio optimization: {e}")
            return {"error": str(e)}

    def train_risk_models(self, data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """
        Train risk assessment models
        """
        logger.info("Training risk assessment models")
        try:
            risk_assessor = ModelFactory.create_risk_assessor()
            returns_data = pd.DataFrame()
            for asset, df in data.items():
                returns_data[asset] = df["returns"]
            returns_data = returns_data.dropna()
            risk_results = {}
            for asset in returns_data.columns:
                asset_returns = returns_data[asset].values
                var_95 = risk_assessor.calculate_var(asset_returns, 0.05)
                var_99 = risk_assessor.calculate_var(asset_returns, 0.01)
                es_95 = risk_assessor.calculate_expected_shortfall(asset_returns, 0.05)
                es_99 = risk_assessor.calculate_expected_shortfall(asset_returns, 0.01)
                risk_results[asset] = {
                    "var_95": var_95,
                    "var_99": var_99,
                    "expected_shortfall_95": es_95,
                    "expected_shortfall_99": es_99,
                    "volatility": np.std(asset_returns) * np.sqrt(252),
                    "skewness": pd.Series(asset_returns).skew(),
                    "kurtosis": pd.Series(asset_returns).kurtosis(),
                }
            equal_weights = np.array(
                [1.0 / len(returns_data.columns)] * len(returns_data.columns)
            )
            stress_scenarios = {
                "market_crash_2008": {asset: -0.3 for asset in returns_data.columns},
                "covid_crash_2020": {asset: -0.25 for asset in returns_data.columns},
                "tech_bubble_2000": {
                    asset: -0.4 if "tech" in asset.lower() else -0.1
                    for asset in returns_data.columns
                },
                "interest_rate_shock": {asset: -0.15 for asset in returns_data.columns},
            }
            stress_results = risk_assessor.stress_test(
                equal_weights, returns_data, stress_scenarios
            )
            risk_path = "models/risk_assessor.pkl"
            os.makedirs(os.path.dirname(risk_path), exist_ok=True)
            with open(risk_path, "wb") as f:
                pickle.dump(risk_assessor, f)
            return {
                "asset_risk_metrics": risk_results,
                "stress_test_results": stress_results,
                "risk_assessor_path": risk_path,
            }
        except Exception as e:
            logger.error(f"Error training risk models: {e}")
            return {"error": str(e)}


class ModelValidator:
    """
    Model validation and backtesting
    """

    def __init__(self) -> None:
        self.validation_results = {}

    def backtest_predictions(
        self,
        models: Dict[str, str],
        data: Dict[str, pd.DataFrame],
        lookback_days: int = 252,
    ) -> Dict[str, Any]:
        """
        Backtest prediction models
        """
        results = {}
        for asset, model_paths in models.items():
            if asset not in data:
                continue
            df = data[asset]
            asset_results = {}
            for model_type, model_path in model_paths.items():
                try:
                    predictor = AdvancedTimeSeriesPredictor(model_type)
                    predictor.load_model(model_path)
                    predictions = []
                    actuals = []
                    for i in range(lookback_days, len(df) - 1, 5):
                        train_data = df.iloc[i - lookback_days : i]
                        actual_value = df.iloc[i + 1]["close"]
                        try:
                            prediction = predictor.predict(
                                train_data, target_col="close"
                            )
                            predictions.append(prediction[0])
                            actuals.append(actual_value)
                        except:
                            continue
                    if len(predictions) > 10:
                        from sklearn.metrics import (
                            mean_absolute_error,
                            mean_squared_error,
                            r2_score,
                        )

                        mse = mean_squared_error(actuals, predictions)
                        mae = mean_absolute_error(actuals, predictions)
                        r2 = r2_score(actuals, predictions)
                        actual_directions = np.sign(np.diff(actuals))
                        pred_directions = np.sign(np.diff(predictions))
                        direction_accuracy = np.mean(
                            actual_directions == pred_directions
                        )
                        asset_results[model_type] = {
                            "mse": mse,
                            "mae": mae,
                            "r2": r2,
                            "direction_accuracy": direction_accuracy,
                            "predictions_count": len(predictions),
                        }
                except Exception as e:
                    logger.error(f"Error backtesting {model_type} for {asset}: {e}")
                    continue
            results[asset] = asset_results
        return results

    def validate_portfolio_optimization(
        self,
        optimizer_path: str,
        data: Dict[str, pd.DataFrame],
        rebalance_frequency: int = 21,
    ) -> Dict[str, Any]:
        """
        Validate portfolio optimization through backtesting
        """
        try:
            with open(optimizer_path, "rb") as f:
                optimizer = pickle.load(f)
            returns_data = pd.DataFrame()
            for asset, df in data.items():
                returns_data[asset] = df["returns"]
            returns_data = returns_data.dropna()
            portfolio_values = []
            rebalance_dates = []
            weights_history = []
            initial_value = 100000
            current_value = initial_value
            for i in range(252, len(returns_data), rebalance_frequency):
                try:
                    hist_data = returns_data.iloc[i - 252 : i]
                    opt_result = optimizer.optimize_portfolio(
                        hist_data, objective="max_sharpe"
                    )
                    if opt_result["success"]:
                        weights = np.array(list(opt_result["weights"].values()))
                        next_period_end = min(
                            i + rebalance_frequency, len(returns_data)
                        )
                        period_returns = returns_data.iloc[i:next_period_end]
                        portfolio_returns = (period_returns * weights).sum(axis=1)
                        for ret in portfolio_returns:
                            current_value *= 1 + ret
                            portfolio_values.append(current_value)
                        rebalance_dates.append(returns_data.index[i])
                        weights_history.append(opt_result["weights"])
                except Exception as e:
                    logger.error(f"Error in portfolio backtest at step {i}: {e}")
                    continue
            if len(portfolio_values) > 0:
                portfolio_returns = pd.Series(portfolio_values).pct_change().dropna()
                total_return = (portfolio_values[-1] - initial_value) / initial_value
                annualized_return = (1 + total_return) ** (
                    252 / len(portfolio_values)
                ) - 1
                volatility = portfolio_returns.std() * np.sqrt(252)
                sharpe_ratio = (annualized_return - 0.02) / volatility
                cumulative_returns = pd.Series(portfolio_values) / initial_value
                running_max = cumulative_returns.expanding().max()
                drawdown = (cumulative_returns - running_max) / running_max
                max_drawdown = drawdown.min()
                return {
                    "total_return": total_return,
                    "annualized_return": annualized_return,
                    "volatility": volatility,
                    "sharpe_ratio": sharpe_ratio,
                    "max_drawdown": max_drawdown,
                    "final_value": portfolio_values[-1],
                    "rebalance_count": len(rebalance_dates),
                    "portfolio_history": portfolio_values,
                }
            else:
                return {"error": "No valid portfolio values generated"}
        except Exception as e:
            logger.error(f"Error validating portfolio optimization: {e}")
            return {"error": str(e)}


def main() -> Any:
    """
    Main training pipeline
    """
    logger.info("Starting QuantumVest AI Model Training Pipeline")
    config = {
        "prediction_models": ["ensemble", "xgboost", "lstm"],
        "epochs": 50,
        "portfolio_constraints": {"max_weight": 0.3, "min_weight": 0.05},
        "data_sources": {
            "AAPL": "AAPL",
            "GOOGL": "GOOGL",
            "MSFT": "MSFT",
            "TSLA": "TSLA",
            "BTC-USD": "BTC-USD",
        },
    }
    try:
        preprocessor = DataPreprocessor()
        trainer = ModelTrainer(config)
        validator = ModelValidator()
        logger.info("Step 1: Loading market data")
        raw_data = preprocessor.load_market_data(config["data_sources"])
        logger.info("Step 2: Cleaning data")
        clean_data = preprocessor.clean_data(raw_data)
        logger.info("Step 3: Creating features")
        featured_data = preprocessor.create_features(clean_data)
        logger.info("Step 4: Training prediction models")
        prediction_results = trainer.train_prediction_models(featured_data)
        logger.info("Step 5: Training portfolio optimization")
        portfolio_results = trainer.train_portfolio_optimization(featured_data)
        logger.info("Step 6: Training risk models")
        risk_results = trainer.train_risk_models(featured_data)
        logger.info("Step 7: Validating models")
        model_paths = {}
        for asset, models in prediction_results.items():
            model_paths[asset] = {
                model_type: info["model_path"] for model_type, info in models.items()
            }
        validation_results = validator.backtest_predictions(model_paths, featured_data)
        if "optimizer_path" in portfolio_results:
            portfolio_validation = validator.validate_portfolio_optimization(
                portfolio_results["optimizer_path"], featured_data
            )
        else:
            portfolio_validation = {"error": "No optimizer to validate"}
        logger.info("Step 8: Saving training results")
        final_results = {
            "timestamp": datetime.now().isoformat(),
            "config": config,
            "data_summary": {
                "assets": list(featured_data.keys()),
                "date_range": {
                    asset: {
                        "start": df.index.min().isoformat(),
                        "end": df.index.max().isoformat(),
                        "samples": len(df),
                    }
                    for asset, df in featured_data.items()
                },
            },
            "prediction_results": prediction_results,
            "portfolio_results": portfolio_results,
            "risk_results": risk_results,
            "validation_results": validation_results,
            "portfolio_validation": portfolio_validation,
        }
        results_path = (
            f"training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(results_path, "w") as f:
            json.dump(final_results, f, indent=2, default=str)
        logger.info(f"Training completed successfully. Results saved to {results_path}")
        logger.info("\n" + "=" * 80)
        logger.info("TRAINING SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Assets trained: {len(featured_data)}")
        logger.info(
            f"Models trained: {sum((len(models) for models in prediction_results.values()))}"
        )
        logger.info("\nPrediction Model Performance:")
        for asset, models in validation_results.items():
            logger.info(f"\n{asset}:")
            for model_type, metrics in models.items():
                logger.info(
                    f"  {model_type}: R² = {metrics['r2']:.4f}, Direction Accuracy = {metrics['direction_accuracy']:.4f}"
                )
        if "total_return" in portfolio_validation:
            logger.info("\nPortfolio Optimization Backtest:")
            logger.info(f"  Total Return: {portfolio_validation['total_return']:.2%}")
            logger.info(
                f"  Annualized Return: {portfolio_validation['annualized_return']:.2%}"
            )
            logger.info(f"  Sharpe Ratio: {portfolio_validation['sharpe_ratio']:.4f}")
            logger.info(f"  Max Drawdown: {portfolio_validation['max_drawdown']:.2%}")
        logger.info("\n" + "=" * 80)
    except Exception as e:
        logger.error(f"Training pipeline failed: {e}")
        raise


if __name__ == "__main__":
    main()
