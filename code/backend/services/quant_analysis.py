"""
Quantitative Analysis Module
Provides quantitative models and analysis tools for portfolio optimization
"""

import logging
from typing import Dict, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class QuantitativeModels:
    """Quantitative models for financial analysis"""

    @staticmethod
    def calculate_returns(prices: np.ndarray) -> np.ndarray:
        """
        Calculate returns from price data

        Args:
            prices: Array of prices

        Returns:
            Array of returns
        """
        return np.diff(prices) / prices[:-1]

    @staticmethod
    def calculate_volatility(returns: np.ndarray, annualize: bool = True) -> float:
        """
        Calculate volatility from returns

        Args:
            returns: Array of returns
            annualize: Whether to annualize the volatility

        Returns:
            Volatility value
        """
        vol = np.std(returns)
        if annualize:
            vol *= np.sqrt(252)  # Assuming 252 trading days
        return float(vol)

    @staticmethod
    def calculate_sharpe_ratio(
        returns: np.ndarray, risk_free_rate: float = 0.02, annualize: bool = True
    ) -> float:
        """
        Calculate Sharpe ratio

        Args:
            returns: Array of returns
            risk_free_rate: Risk-free rate (annual)
            annualize: Whether to annualize the ratio

        Returns:
            Sharpe ratio
        """
        mean_return = np.mean(returns)
        volatility = np.std(returns)

        if volatility == 0:
            return 0.0

        if annualize:
            mean_return *= 252
            volatility *= np.sqrt(252)

        sharpe = (mean_return - risk_free_rate) / volatility
        return float(sharpe)

    @staticmethod
    def calculate_max_drawdown(prices: np.ndarray) -> float:
        """
        Calculate maximum drawdown

        Args:
            prices: Array of prices

        Returns:
            Maximum drawdown (negative value)
        """
        peak = np.maximum.accumulate(prices)
        drawdown = (prices - peak) / peak
        return float(np.min(drawdown))

    @staticmethod
    def calculate_var(returns: np.ndarray, confidence_level: float = 0.95) -> float:
        """
        Calculate Value at Risk (VaR)

        Args:
            returns: Array of returns
            confidence_level: Confidence level (e.g., 0.95 for 95%)

        Returns:
            VaR value
        """
        return float(np.percentile(returns, (1 - confidence_level) * 100))

    @staticmethod
    def calculate_cvar(returns: np.ndarray, confidence_level: float = 0.95) -> float:
        """
        Calculate Conditional Value at Risk (CVaR/Expected Shortfall)

        Args:
            returns: Array of returns
            confidence_level: Confidence level (e.g., 0.95 for 95%)

        Returns:
            CVaR value
        """
        var = QuantitativeModels.calculate_var(returns, confidence_level)
        cvar = np.mean(returns[returns <= var])
        return float(cvar)

    @staticmethod
    def calculate_beta(asset_returns: np.ndarray, market_returns: np.ndarray) -> float:
        """
        Calculate beta relative to market

        Args:
            asset_returns: Array of asset returns
            market_returns: Array of market returns

        Returns:
            Beta value
        """
        covariance = np.cov(asset_returns, market_returns)[0, 1]
        market_variance = np.var(market_returns)

        if market_variance == 0:
            return 1.0

        beta = covariance / market_variance
        return float(beta)

    @staticmethod
    def calculate_correlation_matrix(returns_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate correlation matrix for multiple assets

        Args:
            returns_df: DataFrame of returns for multiple assets

        Returns:
            Correlation matrix
        """
        return returns_df.corr()

    @staticmethod
    def calculate_efficient_frontier(
        expected_returns: np.ndarray, cov_matrix: np.ndarray, num_portfolios: int = 1000
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Calculate efficient frontier

        Args:
            expected_returns: Expected returns for each asset
            cov_matrix: Covariance matrix
            num_portfolios: Number of portfolios to simulate

        Returns:
            Tuple of (returns, volatilities, sharpe_ratios)
        """
        num_assets = len(expected_returns)
        results = np.zeros((3, num_portfolios))

        for i in range(num_portfolios):
            # Random weights
            weights = np.random.random(num_assets)
            weights /= np.sum(weights)

            # Calculate portfolio metrics
            portfolio_return = np.sum(weights * expected_returns)
            portfolio_volatility = np.sqrt(
                np.dot(weights.T, np.dot(cov_matrix, weights))
            )
            sharpe_ratio = (portfolio_return - 0.02) / portfolio_volatility

            results[0, i] = portfolio_return
            results[1, i] = portfolio_volatility
            results[2, i] = sharpe_ratio

        return results[0], results[1], results[2]

    @staticmethod
    def calculate_portfolio_metrics(
        weights: np.ndarray,
        expected_returns: np.ndarray,
        cov_matrix: np.ndarray,
        risk_free_rate: float = 0.02,
    ) -> Dict[str, float]:
        """
        Calculate portfolio metrics given weights

        Args:
            weights: Portfolio weights
            expected_returns: Expected returns for each asset
            cov_matrix: Covariance matrix
            risk_free_rate: Risk-free rate

        Returns:
            Dictionary of metrics
        """
        portfolio_return = np.sum(weights * expected_returns)
        portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        sharpe_ratio = (
            (portfolio_return - risk_free_rate) / portfolio_volatility
            if portfolio_volatility > 0
            else 0
        )

        return {
            "return": float(portfolio_return),
            "volatility": float(portfolio_volatility),
            "sharpe_ratio": float(sharpe_ratio),
        }
