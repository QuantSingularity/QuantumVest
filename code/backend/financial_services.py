"""
Financial Services Module for QuantumVest
Comprehensive financial industry services including risk management, compliance, and analytics
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import numpy as np
from models import (
    Alert,
    Asset,
    ComplianceCheck,
    ComplianceStatus,
    Portfolio,
    PortfolioHolding,
    PortfolioPerformance,
    PriceHistory,
    RiskLevel,
    db,
)
from scipy.optimize import minimize

logger = logging.getLogger(__name__)


@dataclass
class RiskAnalysisResult:
    """Risk analysis result container"""

    var_95: float
    var_99: float
    cvar_95: float
    cvar_99: float
    volatility: float
    beta: float
    sharpe_ratio: float
    max_drawdown: float
    correlation_matrix: Dict[str, Any]


@dataclass
class OptimizationResult:
    """Portfolio optimization result container"""

    optimal_weights: Dict[str, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    efficient_frontier: List[Dict[str, float]]


@dataclass
class PerformanceMetrics:
    """Portfolio performance metrics container"""

    total_return: float
    annualized_return: float
    volatility: float
    sharpe_ratio: float
    alpha: float
    beta: float
    max_drawdown: float
    calmar_ratio: float
    sortino_ratio: float


class RiskManagementService:
    """Comprehensive risk management service"""

    @staticmethod
    def calculate_portfolio_risk(
        portfolio_id: str, lookback_days: int = 252
    ) -> RiskAnalysisResult:
        """Calculate comprehensive risk metrics for a portfolio"""
        try:
            portfolio = Portfolio.query.get(portfolio_id)
            if not portfolio:
                raise ValueError(f"Portfolio {portfolio_id} not found")
            holdings = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
            if not holdings:
                raise ValueError("Portfolio has no holdings")
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=lookback_days)
            returns_data = {}
            weights = {}
            for holding in holdings:
                asset = holding.asset
                prices = (
                    PriceHistory.query.filter(
                        PriceHistory.asset_id == holding.asset_id,
                        PriceHistory.timestamp >= start_date,
                        PriceHistory.timestamp <= end_date,
                    )
                    .order_by(PriceHistory.timestamp)
                    .all()
                )
                if len(prices) < 30:
                    continue
                price_series = [float(p.close_price) for p in prices]
                returns = np.diff(np.log(price_series))
                returns_data[asset.symbol] = returns
                weights[asset.symbol] = float(holding.weight) if holding.weight else 0
            if not returns_data:
                raise ValueError("Insufficient price data for risk calculation")
            symbols = list(returns_data.keys())
            min_length = min((len(returns_data[symbol]) for symbol in symbols))
            returns_matrix = np.array(
                [returns_data[symbol][-min_length:] for symbol in symbols]
            ).T
            portfolio_weights = np.array([weights.get(symbol, 0) for symbol in symbols])
            portfolio_weights = portfolio_weights / np.sum(portfolio_weights)
            portfolio_returns = np.dot(returns_matrix, portfolio_weights)
            var_95 = np.percentile(portfolio_returns, 5)
            var_99 = np.percentile(portfolio_returns, 1)
            cvar_95 = np.mean(portfolio_returns[portfolio_returns <= var_95])
            cvar_99 = np.mean(portfolio_returns[portfolio_returns <= var_99])
            volatility = np.std(portfolio_returns) * np.sqrt(252)
            if len(symbols) > 1:
                market_returns = returns_matrix[:, 0]
                beta = np.cov(portfolio_returns, market_returns)[0, 1] / np.var(
                    market_returns
                )
            else:
                beta = 1.0
            risk_free_rate = 0.02
            excess_returns = np.mean(portfolio_returns) * 252 - risk_free_rate
            sharpe_ratio = excess_returns / volatility if volatility > 0 else 0
            cumulative_returns = np.cumprod(1 + portfolio_returns)
            running_max = np.maximum.accumulate(cumulative_returns)
            drawdown = (cumulative_returns - running_max) / running_max
            max_drawdown = np.min(drawdown)
            correlation_matrix = np.corrcoef(returns_matrix.T)
            correlation_dict = {
                "symbols": symbols,
                "matrix": correlation_matrix.tolist(),
            }
            return RiskAnalysisResult(
                var_95=var_95,
                var_99=var_99,
                cvar_95=cvar_95,
                cvar_99=cvar_99,
                volatility=volatility,
                beta=beta,
                sharpe_ratio=sharpe_ratio,
                max_drawdown=max_drawdown,
                correlation_matrix=correlation_dict,
            )
        except Exception as e:
            logger.error(f"Error calculating portfolio risk: {e}")
            raise

    @staticmethod
    def stress_test_portfolio(
        portfolio_id: str, scenarios: List[Dict[str, float]]
    ) -> Dict[str, Any]:
        """Perform stress testing on portfolio"""
        try:
            portfolio = Portfolio.query.get(portfolio_id)
            if not portfolio:
                raise ValueError(f"Portfolio {portfolio_id} not found")
            holdings = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
            if not holdings:
                raise ValueError("Portfolio has no holdings")
            results = {}
            for scenario_name, shocks in scenarios.items():
                portfolio_shock = 0
                for holding in holdings:
                    asset_symbol = holding.asset.symbol
                    if asset_symbol in shocks:
                        shock = shocks[asset_symbol]
                        weight = float(holding.weight) if holding.weight else 0
                        portfolio_shock += weight * shock
                results[scenario_name] = {
                    "portfolio_shock": portfolio_shock,
                    "new_value": float(portfolio.total_value) * (1 + portfolio_shock),
                    "loss_amount": float(portfolio.total_value)
                    * abs(min(0, portfolio_shock)),
                }
            return results
        except Exception as e:
            logger.error(f"Error in stress testing: {e}")
            raise


class PortfolioOptimizationService:
    """Advanced portfolio optimization service"""

    @staticmethod
    def optimize_portfolio(
        assets: List[str],
        expected_returns: Dict[str, float],
        covariance_matrix: np.ndarray,
        risk_tolerance: float = 0.5,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> OptimizationResult:
        """Optimize portfolio using Modern Portfolio Theory"""
        try:
            n_assets = len(assets)
            returns_array = np.array([expected_returns[asset] for asset in assets])

            def negative_sharpe_ratio(weights):
                portfolio_return = np.dot(weights, returns_array)
                portfolio_variance = np.dot(
                    weights.T, np.dot(covariance_matrix, weights)
                )
                portfolio_std = np.sqrt(portfolio_variance)
                risk_free_rate = 0.02
                sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_std
                return -sharpe_ratio

            constraints_list = [{"type": "eq", "fun": lambda x: np.sum(x) - 1}]
            if constraints:
                if "max_weight" in constraints:
                    max_weight = constraints["max_weight"]
                    for i in range(n_assets):
                        constraints_list.append(
                            {"type": "ineq", "fun": lambda x, i=i: max_weight - x[i]}
                        )
                if "min_weight" in constraints:
                    min_weight = constraints["min_weight"]
                    for i in range(n_assets):
                        constraints_list.append(
                            {"type": "ineq", "fun": lambda x, i=i: x[i] - min_weight}
                        )
            bounds = tuple(((0, 1) for _ in range(n_assets)))
            initial_guess = np.array([1.0 / n_assets] * n_assets)
            result = minimize(
                negative_sharpe_ratio,
                initial_guess,
                method="SLSQP",
                bounds=bounds,
                constraints=constraints_list,
            )
            if not result.success:
                raise ValueError(f"Optimization failed: {result.message}")
            optimal_weights = result.x
            optimal_return = np.dot(optimal_weights, returns_array)
            optimal_variance = np.dot(
                optimal_weights.T, np.dot(covariance_matrix, optimal_weights)
            )
            optimal_volatility = np.sqrt(optimal_variance)
            optimal_sharpe = (optimal_return - 0.02) / optimal_volatility
            efficient_frontier = (
                PortfolioOptimizationService._generate_efficient_frontier(
                    returns_array, covariance_matrix, n_points=50
                )
            )
            return OptimizationResult(
                optimal_weights={
                    assets[i]: float(optimal_weights[i]) for i in range(n_assets)
                },
                expected_return=float(optimal_return),
                volatility=float(optimal_volatility),
                sharpe_ratio=float(optimal_sharpe),
                efficient_frontier=efficient_frontier,
            )
        except Exception as e:
            logger.error(f"Error in portfolio optimization: {e}")
            raise

    @staticmethod
    def _generate_efficient_frontier(
        returns: np.ndarray, cov_matrix: np.ndarray, n_points: int = 50
    ) -> List[Dict[str, float]]:
        """Generate efficient frontier points"""
        try:
            n_assets = len(returns)
            min_return = np.min(returns)
            max_return = np.max(returns)
            target_returns = np.linspace(min_return, max_return, n_points)
            efficient_portfolios = []
            for target_return in target_returns:

                def portfolio_variance(weights):
                    return np.dot(weights.T, np.dot(cov_matrix, weights))

                constraints = [
                    {"type": "eq", "fun": lambda x: np.sum(x) - 1},
                    {"type": "eq", "fun": lambda x: np.dot(x, returns) - target_return},
                ]
                bounds = tuple(((0, 1) for _ in range(n_assets)))
                initial_guess = np.array([1.0 / n_assets] * n_assets)
                result = minimize(
                    portfolio_variance,
                    initial_guess,
                    method="SLSQP",
                    bounds=bounds,
                    constraints=constraints,
                )
                if result.success:
                    variance = result.fun
                    volatility = np.sqrt(variance)
                    sharpe_ratio = (
                        (target_return - 0.02) / volatility if volatility > 0 else 0
                    )
                    efficient_portfolios.append(
                        {
                            "return": float(target_return),
                            "volatility": float(volatility),
                            "sharpe_ratio": float(sharpe_ratio),
                        }
                    )
            return efficient_portfolios
        except Exception as e:
            logger.error(f"Error generating efficient frontier: {e}")
            return []


class PerformanceAnalyticsService:
    """Comprehensive performance analytics service"""

    @staticmethod
    def calculate_performance_metrics(
        portfolio_id: str, benchmark_symbol: str = "SPY"
    ) -> PerformanceMetrics:
        """Calculate comprehensive performance metrics"""
        try:
            portfolio = Portfolio.query.get(portfolio_id)
            if not portfolio:
                raise ValueError(f"Portfolio {portfolio_id} not found")
            performance_history = (
                PortfolioPerformance.query.filter_by(portfolio_id=portfolio_id)
                .order_by(PortfolioPerformance.timestamp)
                .all()
            )
            if len(performance_history) < 30:
                raise ValueError("Insufficient performance history")
            returns = []
            for i in range(1, len(performance_history)):
                prev_value = float(performance_history[i - 1].total_value)
                curr_value = float(performance_history[i].total_value)
                if prev_value > 0:
                    daily_return = (curr_value - prev_value) / prev_value
                    returns.append(daily_return)
            returns = np.array(returns)
            benchmark_asset = Asset.query.filter_by(symbol=benchmark_symbol).first()
            benchmark_returns = []
            if benchmark_asset:
                benchmark_prices = (
                    PriceHistory.query.filter(
                        PriceHistory.asset_id == benchmark_asset.id,
                        PriceHistory.timestamp >= performance_history[0].timestamp,
                        PriceHistory.timestamp <= performance_history[-1].timestamp,
                    )
                    .order_by(PriceHistory.timestamp)
                    .all()
                )
                for i in range(1, len(benchmark_prices)):
                    prev_price = float(benchmark_prices[i - 1].close_price)
                    curr_price = float(benchmark_prices[i].close_price)
                    if prev_price > 0:
                        benchmark_return = (curr_price - prev_price) / prev_price
                        benchmark_returns.append(benchmark_return)
            benchmark_returns = np.array(benchmark_returns)
            total_return = float(np.prod(1 + returns) - 1)
            annualized_return = float((1 + total_return) ** (252 / len(returns)) - 1)
            volatility = float(np.std(returns) * np.sqrt(252))
            risk_free_rate = 0.02
            excess_returns = annualized_return - risk_free_rate
            sharpe_ratio = excess_returns / volatility if volatility > 0 else 0
            alpha, beta = (0.0, 1.0)
            if len(benchmark_returns) > 0 and len(returns) == len(benchmark_returns):
                min_length = min(len(returns), len(benchmark_returns))
                portfolio_returns_aligned = returns[-min_length:]
                benchmark_returns_aligned = benchmark_returns[-min_length:]
                covariance = np.cov(
                    portfolio_returns_aligned, benchmark_returns_aligned
                )[0, 1]
                benchmark_variance = np.var(benchmark_returns_aligned)
                beta = (
                    covariance / benchmark_variance if benchmark_variance > 0 else 1.0
                )
                benchmark_annual_return = float(
                    np.mean(benchmark_returns_aligned) * 252
                )
                alpha = annualized_return - (
                    risk_free_rate + beta * (benchmark_annual_return - risk_free_rate)
                )
            cumulative_returns = np.cumprod(1 + returns)
            running_max = np.maximum.accumulate(cumulative_returns)
            drawdown = (cumulative_returns - running_max) / running_max
            max_drawdown = float(np.min(drawdown))
            calmar_ratio = (
                annualized_return / abs(max_drawdown) if max_drawdown != 0 else 0
            )
            downside_returns = returns[returns < 0]
            downside_deviation = (
                np.std(downside_returns) * np.sqrt(252)
                if len(downside_returns) > 0
                else 0
            )
            sortino_ratio = (
                excess_returns / downside_deviation if downside_deviation > 0 else 0
            )
            return PerformanceMetrics(
                total_return=total_return,
                annualized_return=annualized_return,
                volatility=volatility,
                sharpe_ratio=float(sharpe_ratio),
                alpha=float(alpha),
                beta=float(beta),
                max_drawdown=max_drawdown,
                calmar_ratio=float(calmar_ratio),
                sortino_ratio=float(sortino_ratio),
            )
        except Exception as e:
            logger.error(f"Error calculating performance metrics: {e}")
            raise


class ComplianceService:
    """Comprehensive compliance and regulatory service"""

    @staticmethod
    def check_portfolio_compliance(portfolio_id: str) -> Dict[str, Any]:
        """Perform comprehensive compliance checks"""
        try:
            portfolio = Portfolio.query.get(portfolio_id)
            if not portfolio:
                raise ValueError(f"Portfolio {portfolio_id} not found")
            user = portfolio.owner
            holdings = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
            compliance_results = {
                "overall_status": ComplianceStatus.COMPLIANT,
                "checks": [],
                "violations": [],
                "recommendations": [],
            }
            concentration_check = ComplianceService._check_concentration_risk(holdings)
            compliance_results["checks"].append(concentration_check)
            diversification_check = ComplianceService._check_diversification(holdings)
            compliance_results["checks"].append(diversification_check)
            risk_check = ComplianceService._check_risk_tolerance(portfolio, user)
            compliance_results["checks"].append(risk_check)
            regulatory_check = ComplianceService._check_regulatory_limits(
                holdings, user
            )
            compliance_results["checks"].append(regulatory_check)
            liquidity_check = ComplianceService._check_liquidity_requirements(holdings)
            compliance_results["checks"].append(liquidity_check)
            for check in compliance_results["checks"]:
                if check["status"] == ComplianceStatus.NON_COMPLIANT:
                    compliance_results["overall_status"] = (
                        ComplianceStatus.NON_COMPLIANT
                    )
                    compliance_results["violations"].append(check)
                elif check["status"] == ComplianceStatus.UNDER_REVIEW:
                    if (
                        compliance_results["overall_status"]
                        == ComplianceStatus.COMPLIANT
                    ):
                        compliance_results["overall_status"] = (
                            ComplianceStatus.UNDER_REVIEW
                        )
            compliance_check = ComplianceCheck(
                user_id=user.id,
                portfolio_id=portfolio.id,
                check_type="comprehensive_portfolio_check",
                check_description="Comprehensive portfolio compliance check",
                status=compliance_results["overall_status"],
                findings=compliance_results,
            )
            db.session.add(compliance_check)
            db.session.commit()
            return compliance_results
        except Exception as e:
            logger.error(f"Error in compliance check: {e}")
            raise

    @staticmethod
    def _check_concentration_risk(holdings: List[PortfolioHolding]) -> Dict[str, Any]:
        """Check for concentration risk violations"""
        max_single_position = 0.2
        max_sector_concentration = 0.3
        violations = []
        for holding in holdings:
            if holding.weight and holding.weight > max_single_position:
                violations.append(
                    f"Position {holding.asset.symbol} exceeds maximum weight: {holding.weight:.2%}"
                )
        sector_weights = {}
        for holding in holdings:
            sector = holding.asset.sector or "Unknown"
            sector_weights[sector] = sector_weights.get(sector, 0) + (
                holding.weight or 0
            )
        for sector, weight in sector_weights.items():
            if weight > max_sector_concentration:
                violations.append(
                    f"Sector {sector} exceeds maximum weight: {weight:.2%}"
                )
        status = (
            ComplianceStatus.NON_COMPLIANT if violations else ComplianceStatus.COMPLIANT
        )
        return {
            "check_name": "Concentration Risk",
            "status": status,
            "violations": violations,
            "details": {
                "max_single_position": max_single_position,
                "max_sector_concentration": max_sector_concentration,
                "sector_weights": sector_weights,
            },
        }

    @staticmethod
    def _check_diversification(holdings: List[PortfolioHolding]) -> Dict[str, Any]:
        """Check diversification requirements"""
        min_positions = 5
        min_asset_types = 2
        violations = []
        if len(holdings) < min_positions:
            violations.append(
                f"Portfolio has only {len(holdings)} positions, minimum required: {min_positions}"
            )
        asset_types = set((holding.asset.asset_type for holding in holdings))
        if len(asset_types) < min_asset_types:
            violations.append(
                f"Portfolio has only {len(asset_types)} asset types, minimum required: {min_asset_types}"
            )
        status = (
            ComplianceStatus.NON_COMPLIANT if violations else ComplianceStatus.COMPLIANT
        )
        return {
            "check_name": "Diversification",
            "status": status,
            "violations": violations,
            "details": {
                "positions_count": len(holdings),
                "asset_types_count": len(asset_types),
                "asset_types": list(asset_types),
            },
        }

    @staticmethod
    def _check_risk_tolerance(portfolio: Portfolio, user: Any) -> Dict[str, Any]:
        """Check risk tolerance alignment"""
        violations = []
        risk_thresholds = {
            RiskLevel.CONSERVATIVE: 0.1,
            RiskLevel.MODERATE: 0.2,
            RiskLevel.AGGRESSIVE: 0.35,
            RiskLevel.SPECULATIVE: 1.0,
        }
        max_volatility = risk_thresholds.get(portfolio.risk_level, 0.2)
        if portfolio.volatility and portfolio.volatility > max_volatility:
            violations.append(
                f"Portfolio volatility {portfolio.volatility:.2%} exceeds risk tolerance limit {max_volatility:.2%}"
            )
        if user.risk_tolerance:
            if user.risk_tolerance < 0.3 and portfolio.risk_level in [
                RiskLevel.AGGRESSIVE,
                RiskLevel.SPECULATIVE,
            ]:
                violations.append(
                    "Portfolio risk level too high for user's risk tolerance"
                )
            elif (
                user.risk_tolerance > 0.7
                and portfolio.risk_level == RiskLevel.CONSERVATIVE
            ):
                violations.append(
                    "Portfolio risk level too low for user's risk tolerance"
                )
        status = (
            ComplianceStatus.NON_COMPLIANT if violations else ComplianceStatus.COMPLIANT
        )
        return {
            "check_name": "Risk Tolerance Alignment",
            "status": status,
            "violations": violations,
            "details": {
                "portfolio_risk_level": portfolio.risk_level.value,
                "portfolio_volatility": portfolio.volatility,
                "user_risk_tolerance": user.risk_tolerance,
                "max_allowed_volatility": max_volatility,
            },
        }

    @staticmethod
    def _check_regulatory_limits(
        holdings: List[PortfolioHolding], user: Any
    ) -> Dict[str, Any]:
        """Check regulatory limits and restrictions"""
        violations = []
        high_risk_assets = [
            holding
            for holding in holdings
            if holding.asset.asset_type.value in ["option", "future"]
        ]
        if high_risk_assets and (not user.accredited_investor):
            violations.append("Non-accredited investor holding restricted instruments")
        total_crypto_weight = sum(
            (
                holding.weight or 0
                for holding in holdings
                if holding.asset.asset_type.value == "crypto"
            )
        )
        if total_crypto_weight > 0.2:
            violations.append(
                f"Cryptocurrency allocation {total_crypto_weight:.2%} exceeds regulatory limit of 20%"
            )
        status = (
            ComplianceStatus.NON_COMPLIANT if violations else ComplianceStatus.COMPLIANT
        )
        return {
            "check_name": "Regulatory Limits",
            "status": status,
            "violations": violations,
            "details": {
                "accredited_investor": user.accredited_investor,
                "crypto_allocation": total_crypto_weight,
                "high_risk_positions": len(high_risk_assets),
            },
        }

    @staticmethod
    def _check_liquidity_requirements(
        holdings: List[PortfolioHolding],
    ) -> Dict[str, Any]:
        """Check liquidity requirements"""
        violations = []
        min_liquid_allocation = 0.1
        liquid_assets = ["stock", "etf"]
        liquid_weight = sum(
            (
                holding.weight or 0
                for holding in holdings
                if holding.asset.asset_type.value in liquid_assets
            )
        )
        if liquid_weight < min_liquid_allocation:
            violations.append(
                f"Liquid asset allocation {liquid_weight:.2%} below minimum requirement {min_liquid_allocation:.2%}"
            )
        status = (
            ComplianceStatus.NON_COMPLIANT if violations else ComplianceStatus.COMPLIANT
        )
        return {
            "check_name": "Liquidity Requirements",
            "status": status,
            "violations": violations,
            "details": {
                "liquid_allocation": liquid_weight,
                "min_required": min_liquid_allocation,
            },
        }


class AlertService:
    """Alert and notification service"""

    @staticmethod
    def create_risk_alert(
        user_id: str, portfolio_id: str, risk_metrics: RiskAnalysisResult
    ) -> Any:
        """Create risk-based alerts"""
        try:
            alerts = []
            if risk_metrics.var_95 < -0.05:
                alert = Alert(
                    user_id=user_id,
                    title="High Risk Alert",
                    message=f"Portfolio VaR (95%) is {risk_metrics.var_95:.2%}, indicating high potential losses",
                    alert_type="risk",
                    severity="warning",
                    metadata={
                        "portfolio_id": portfolio_id,
                        "var_95": risk_metrics.var_95,
                        "var_99": risk_metrics.var_99,
                    },
                )
                alerts.append(alert)
            if risk_metrics.volatility > 0.3:
                alert = Alert(
                    user_id=user_id,
                    title="High Volatility Alert",
                    message=f"Portfolio volatility is {risk_metrics.volatility:.2%}, consider rebalancing",
                    alert_type="risk",
                    severity="info",
                    metadata={
                        "portfolio_id": portfolio_id,
                        "volatility": risk_metrics.volatility,
                    },
                )
                alerts.append(alert)
            if risk_metrics.sharpe_ratio < 0.5:
                alert = Alert(
                    user_id=user_id,
                    title="Poor Risk-Adjusted Returns",
                    message=f"Portfolio Sharpe ratio is {risk_metrics.sharpe_ratio:.2f}, consider optimization",
                    alert_type="performance",
                    severity="info",
                    metadata={
                        "portfolio_id": portfolio_id,
                        "sharpe_ratio": risk_metrics.sharpe_ratio,
                    },
                )
                alerts.append(alert)
            for alert in alerts:
                db.session.add(alert)
            db.session.commit()
            return len(alerts)
        except Exception as e:
            logger.error(f"Error creating risk alerts: {e}")
            db.session.rollback()
            return 0

    @staticmethod
    def create_compliance_alert(
        user_id: str, compliance_results: Dict[str, Any]
    ) -> Any:
        """Create compliance-based alerts"""
        try:
            if compliance_results["overall_status"] == ComplianceStatus.NON_COMPLIANT:
                violations = compliance_results.get("violations", [])
                alert = Alert(
                    user_id=user_id,
                    title="Compliance Violation Alert",
                    message=f"Portfolio has {len(violations)} compliance violations that require attention",
                    alert_type="compliance",
                    severity="error",
                    metadata=compliance_results,
                )
                db.session.add(alert)
                db.session.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error creating compliance alert: {e}")
            db.session.rollback()
            return False
