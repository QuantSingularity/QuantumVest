"""
Model Evaluator Module
Evaluates model performance and generates performance metrics
"""

import logging
import os
from typing import Dict, List

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Evaluates model performance and generates metrics"""

    def __init__(self, reports_dir: str = "../../resources/model_reports") -> None:
        """
        Initialize the model evaluator

        Args:
            reports_dir: Directory to store evaluation reports
        """
        self.reports_dir = reports_dir
        os.makedirs(reports_dir, exist_ok=True)

    def evaluate_predictions(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> Dict[str, float]:
        """
        Calculate performance metrics for predictions

        Args:
            y_true: Array of true values
            y_pred: Array of predicted values

        Returns:
            Dictionary with performance metrics
        """
        try:
            mse = mean_squared_error(y_true, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_true, y_pred)
            r2 = r2_score(y_true, y_pred)
            mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
            direction_true = np.diff(y_true) > 0
            direction_pred = np.diff(y_pred) > 0
            directional_accuracy = np.mean(direction_true == direction_pred) * 100
            return {
                "mse": mse,
                "rmse": rmse,
                "mae": mae,
                "r2": r2,
                "mape": mape,
                "directional_accuracy": directional_accuracy,
            }
        except Exception as e:
            logger.error(f"Error calculating performance metrics: {e}")
            return {
                "mse": float("nan"),
                "rmse": float("nan"),
                "mae": float("nan"),
                "r2": float("nan"),
                "mape": float("nan"),
                "directional_accuracy": float("nan"),
            }

    def generate_evaluation_report(
        self,
        asset_type: str,
        symbol: str,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        dates: List[str] = None,
    ) -> str:
        """
        Generate and save evaluation report

        Args:
            asset_type: Type of asset ('stock' or 'crypto')
            symbol: Asset symbol
            y_true: Array of true values
            y_pred: Array of predicted values
            dates: List of dates corresponding to the values

        Returns:
            Path to the saved report
        """
        try:
            metrics = self.evaluate_predictions(y_true, y_pred)
            report_dir = os.path.join(
                self.reports_dir, f"{asset_type}_{symbol.lower()}"
            )
            os.makedirs(report_dir, exist_ok=True)
            self._generate_plots(y_true, y_pred, dates, report_dir, symbol)
            report_path = os.path.join(report_dir, "metrics.txt")
            with open(report_path, "w") as f:
                f.write(f"Model Evaluation Report for {symbol} ({asset_type})\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Mean Squared Error (MSE): {metrics['mse']:.4f}\n")
                f.write(f"Root Mean Squared Error (RMSE): {metrics['rmse']:.4f}\n")
                f.write(f"Mean Absolute Error (MAE): {metrics['mae']:.4f}\n")
                f.write(f"R-squared (R²): {metrics['r2']:.4f}\n")
                f.write(
                    f"Mean Absolute Percentage Error (MAPE): {metrics['mape']:.2f}%\n"
                )
                f.write(
                    f"Directional Accuracy: {metrics['directional_accuracy']:.2f}%\n"
                )
            logger.info(f"Evaluation report generated for {symbol} at {report_path}")
            return report_path
        except Exception as e:
            logger.error(f"Error generating evaluation report: {e}")
            return ""

    def _generate_plots(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        dates: List[str],
        report_dir: str,
        symbol: str,
    ) -> None:
        """
        Generate evaluation plots

        Args:
            y_true: Array of true values
            y_pred: Array of predicted values
            dates: List of dates corresponding to the values
            report_dir: Directory to save plots
            symbol: Asset symbol
        """
        try:
            x = range(len(y_true))
            if dates is not None and len(dates) == len(y_true):
                x_labels = dates
            else:
                x_labels = [str(i) for i in x]
            plt.figure(figsize=(12, 6))
            plt.plot(x, y_true, label="Actual", marker="o")
            plt.plot(x, y_pred, label="Predicted", marker="x")
            plt.title(f"Actual vs Predicted Values for {symbol}")
            plt.xlabel("Date")
            plt.ylabel("Value")
            plt.xticks(
                x[:: max(1, len(x) // 10)],
                [x_labels[i] for i in x[:: max(1, len(x) // 10)]],
                rotation=45,
            )
            plt.legend()
            plt.grid(True)
            plt.tight_layout()
            plt.savefig(os.path.join(report_dir, "actual_vs_predicted.png"))
            plt.close()
            error = y_true - y_pred
            plt.figure(figsize=(12, 6))
            plt.bar(x, error)
            plt.title(f"Prediction Error for {symbol}")
            plt.xlabel("Date")
            plt.ylabel("Error (Actual - Predicted)")
            plt.xticks(
                x[:: max(1, len(x) // 10)],
                [x_labels[i] for i in x[:: max(1, len(x) // 10)]],
                rotation=45,
            )
            plt.grid(True)
            plt.tight_layout()
            plt.savefig(os.path.join(report_dir, "prediction_error.png"))
            plt.close()
            plt.figure(figsize=(10, 6))
            plt.hist(error, bins=20)
            plt.title(f"Error Distribution for {symbol}")
            plt.xlabel("Error")
            plt.ylabel("Frequency")
            plt.grid(True)
            plt.tight_layout()
            plt.savefig(os.path.join(report_dir, "error_distribution.png"))
            plt.close()
        except Exception as e:
            logger.error(f"Error generating plots: {e}")
