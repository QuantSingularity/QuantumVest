"""
Portfolio Management Service for QuantumVest
Comprehensive portfolio tracking, analysis, and optimization
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from models import (
    Asset,
    Portfolio,
    PortfolioHolding,
    PortfolioPerformance,
    PriceData,
    Transaction,
    TransactionType,
    db,
)
from sqlalchemy import and_

logger = logging.getLogger(__name__)


class PortfolioService:
    """Service for portfolio management and analysis"""

    @staticmethod
    def create_portfolio(
        user_id: str,
        name: str,
        description: Optional[str] = None,
        currency: str = "USD",
        is_default: bool = False,
    ) -> Dict[str, Any]:
        try:
            if is_default:
                existing_default = Portfolio.query.filter_by(
                    user_id=user_id, is_default=True
                ).first()
                if existing_default:
                    existing_default.is_default = False

            portfolio = Portfolio(
                user_id=user_id,
                name=name,
                description=description,
                currency=currency,
                is_default=is_default,
            )
            db.session.add(portfolio)
            db.session.commit()
            return {"success": True, "portfolio": portfolio.to_dict()}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating portfolio: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def delete_portfolio(portfolio_id: str, user_id: str) -> Dict[str, Any]:
        try:
            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}
            db.session.delete(portfolio)
            db.session.commit()
            return {"success": True, "message": "Portfolio deleted successfully"}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting portfolio: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_user_portfolios(user_id: str) -> Dict[str, Any]:
        try:
            portfolios = Portfolio.query.filter_by(
                user_id=user_id, is_active=True
            ).all()
            portfolio_data = []
            for portfolio in portfolios:
                portfolio_dict = portfolio.to_dict()
                holdings_count = PortfolioHolding.query.filter_by(
                    portfolio_id=portfolio.id
                ).count()
                portfolio_dict["holdings_count"] = holdings_count
                portfolio_data.append(portfolio_dict)
            return {"success": True, "portfolios": portfolio_data}
        except Exception as e:
            logger.error(f"Error getting user portfolios: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_portfolio_details(portfolio_id: str, user_id: str) -> Dict[str, Any]:
        try:
            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}

            holdings = (
                db.session.query(PortfolioHolding, Asset)
                .join(Asset, PortfolioHolding.asset_id == Asset.id)
                .filter(PortfolioHolding.portfolio_id == portfolio_id)
                .all()
            )

            holdings_data = []
            total_value = Decimal("0")

            for holding, asset in holdings:
                latest_price = PortfolioService._get_latest_price(asset.id)
                if latest_price:
                    holding.current_price = latest_price
                    holding.market_value = holding.quantity * latest_price
                    holding.unrealized_pnl = holding.market_value - (
                        holding.quantity * holding.average_cost
                    )
                    if holding.average_cost and holding.average_cost > 0:
                        holding.unrealized_pnl_percent = float(
                            (holding.current_price - holding.average_cost)
                            / holding.average_cost
                            * 100
                        )
                    total_value += holding.market_value or Decimal("0")

                holding_dict = holding.to_dict()
                holding_dict["asset"] = asset.to_dict()
                holdings_data.append(holding_dict)

            portfolio.total_value = total_value
            for holding_data in holdings_data:
                if total_value > 0:
                    holding_data["current_allocation"] = float(
                        Decimal(str(holding_data["market_value"])) / total_value * 100
                    )
                else:
                    holding_data["current_allocation"] = 0

            db.session.commit()

            portfolio_dict = portfolio.to_dict()
            portfolio_dict["holdings"] = holdings_data
            portfolio_dict["total_value"] = float(total_value)
            return {"success": True, "portfolio": portfolio_dict}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error getting portfolio details: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def add_transaction(
        portfolio_id: str,
        user_id: str,
        asset_symbol: str,
        transaction_type: str,
        quantity: float,
        price: float,
        fees: float = 0,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}

            asset = Asset.query.filter_by(symbol=asset_symbol.upper()).first()
            if not asset:
                return {"success": False, "error": f"Asset {asset_symbol} not found"}

            try:
                trans_type = TransactionType[transaction_type.upper()]
            except KeyError:
                return {
                    "success": False,
                    "error": f"Invalid transaction type: {transaction_type}",
                }

            total_amount = Decimal(str(quantity)) * Decimal(str(price)) + Decimal(
                str(fees)
            )

            transaction = Transaction(
                user_id=user_id,
                portfolio_id=portfolio_id,
                asset_id=asset.id,
                transaction_type=trans_type,
                quantity=Decimal(str(quantity)),
                price=Decimal(str(price)),
                total_amount=total_amount,
                fees=Decimal(str(fees)),
                notes=notes,
            )
            db.session.add(transaction)

            holding = PortfolioHolding.query.filter_by(
                portfolio_id=portfolio_id, asset_id=asset.id
            ).first()

            if transaction_type.lower() == "buy":
                cost_basis = Decimal(str(quantity)) * Decimal(str(price))
                if holding:
                    old_cost = holding.quantity * holding.average_cost
                    holding.quantity += Decimal(str(quantity))
                    holding.average_cost = (old_cost + cost_basis) / holding.quantity
                else:
                    holding = PortfolioHolding(
                        portfolio_id=portfolio_id,
                        asset_id=asset.id,
                        quantity=Decimal(str(quantity)),
                        average_cost=Decimal(str(price)),
                    )
                    db.session.add(holding)

            elif transaction_type.lower() == "sell":
                if not holding or holding.quantity < Decimal(str(quantity)):
                    return {"success": False, "error": "Insufficient holdings to sell"}

                realized_pnl = (Decimal(str(price)) - holding.average_cost) * Decimal(
                    str(quantity)
                )
                transaction.realized_pnl = realized_pnl

                portfolio.realized_pnl = (
                    portfolio.realized_pnl or Decimal("0")
                ) + realized_pnl
                holding.quantity -= Decimal(str(quantity))

                if holding.quantity <= Decimal("0"):
                    db.session.delete(holding)

            db.session.commit()
            return {"success": True, "transaction": transaction.to_dict()}
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error adding transaction: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_transactions(
        portfolio_id: str,
        user_id: str,
        page: int = 1,
        per_page: int = 20,
    ) -> Dict[str, Any]:
        try:
            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}

            paginated = (
                Transaction.query.filter_by(portfolio_id=portfolio_id)
                .order_by(Transaction.executed_at.desc())
                .paginate(page=page, per_page=per_page, error_out=False)
            )

            return {
                "success": True,
                "transactions": [t.to_dict() for t in paginated.items],
                "total": paginated.total,
                "pages": paginated.pages,
                "page": page,
                "per_page": per_page,
            }
        except Exception as e:
            logger.error(f"Error getting transactions: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_portfolio_performance(
        portfolio_id: str, user_id: str, days: int = 30
    ) -> Dict[str, Any]:
        try:
            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}

            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)

            performance_data = (
                PortfolioPerformance.query.filter(
                    and_(
                        PortfolioPerformance.portfolio_id == portfolio_id,
                        PortfolioPerformance.timestamp >= start_date,
                        PortfolioPerformance.timestamp <= end_date,
                    )
                )
                .order_by(PortfolioPerformance.timestamp)
                .all()
            )

            if not performance_data:
                current_value = PortfolioService._calculate_current_portfolio_value(
                    portfolio_id
                )
                return {
                    "success": True,
                    "performance": {
                        "current_value": float(current_value),
                        "total_return": 0,
                        "total_return_percentage": 0,
                        "daily_returns": [],
                        "volatility": 0,
                        "sharpe_ratio": 0,
                        "max_drawdown": 0,
                    },
                }

            values = [float(p.total_value) for p in performance_data]
            dates = [p.timestamp.isoformat() for p in performance_data]

            if len(values) > 1:
                returns = np.diff(values) / np.where(
                    np.array(values[:-1]) != 0, values[:-1], 1
                )
                total_return = (
                    (values[-1] - values[0]) / values[0] * 100 if values[0] > 0 else 0
                )
                volatility = float(np.std(returns) * np.sqrt(252) * 100)

                risk_free_rate = 0.02 / 252
                excess_returns = returns - risk_free_rate
                sharpe_ratio = (
                    float(np.mean(excess_returns) / np.std(returns) * np.sqrt(252))
                    if np.std(returns) > 0
                    else 0
                )

                peak = np.maximum.accumulate(values)
                drawdown = (np.array(values) - peak) / np.where(peak != 0, peak, 1)
                max_drawdown = float(np.min(drawdown) * 100)
            else:
                total_return = volatility = sharpe_ratio = max_drawdown = 0

            return {
                "success": True,
                "performance": {
                    "current_value": values[-1] if values else 0,
                    "total_return": total_return,
                    "total_return_percentage": total_return,
                    "volatility": volatility,
                    "sharpe_ratio": sharpe_ratio,
                    "max_drawdown": max_drawdown,
                    "dates": dates,
                    "values": values,
                },
            }
        except Exception as e:
            logger.error(f"Error getting portfolio performance: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def optimize_portfolio(
        portfolio_id: str,
        user_id: str,
        target_return: Optional[float] = None,
        risk_tolerance: float = 0.5,
    ) -> Dict[str, Any]:
        try:
            import cvxpy as cp

            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}

            holdings = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
            if len(holdings) < 2:
                return {
                    "success": False,
                    "error": "Need at least 2 assets for optimization",
                }

            asset_returns = {}
            symbols = []
            for holding in holdings:
                returns = PortfolioService._get_asset_returns(
                    holding.asset_id, days=252
                )
                if returns is not None and len(returns) > 0:
                    asset = db.session.get(Asset, holding.asset_id)
                    if asset:
                        asset_returns[asset.symbol] = returns
                        symbols.append(asset.symbol)

            if len(asset_returns) < 2:
                return {
                    "success": False,
                    "error": "Insufficient price data for optimization",
                }

            min_len = min(len(v) for v in asset_returns.values())
            for k in asset_returns:
                asset_returns[k] = asset_returns[k][-min_len:]

            returns_df = pd.DataFrame(asset_returns)
            expected_returns = returns_df.mean().values * 252
            cov_matrix = returns_df.cov().values * 252
            n_assets = len(symbols)

            weights = cp.Variable(n_assets)
            portfolio_variance = cp.quad_form(weights, cov_matrix)
            objective = cp.Minimize(portfolio_variance)
            constraints = [cp.sum(weights) == 1, weights >= 0]

            problem = cp.Problem(objective, constraints)
            try:
                problem.solve()
            except Exception as e:
                return {"success": False, "error": f"Optimization solver error: {e}"}

            if problem.status not in ["optimal", "optimal_inaccurate"]:
                return {
                    "success": False,
                    "error": f"Optimization failed: {problem.status}",
                }

            optimized_weights = weights.value
            portfolio_return = float(np.dot(optimized_weights, expected_returns))
            portfolio_volatility = float(np.sqrt(max(problem.value, 0)))
            sharpe_ratio = (
                (portfolio_return - 0.02) / portfolio_volatility
                if portfolio_volatility > 0
                else 0
            )

            recommendations = []
            for i, symbol in enumerate(symbols):
                current_holding = next(
                    (
                        h
                        for h in holdings
                        if db.session.get(Asset, h.asset_id)
                        and db.session.get(Asset, h.asset_id).symbol == symbol
                    ),
                    None,
                )
                current_weight = 0.0
                if (
                    current_holding
                    and portfolio.total_value
                    and float(portfolio.total_value) > 0
                ):
                    mv = current_holding.market_value or Decimal("0")
                    current_weight = float(mv) / float(portfolio.total_value)

                optimal = float(optimized_weights[i])
                diff = optimal - current_weight
                recommendations.append(
                    {
                        "symbol": symbol,
                        "current_weight": round(current_weight, 4),
                        "optimal_weight": round(optimal, 4),
                        "recommendation": (
                            "buy"
                            if diff > 0.05
                            else ("sell" if diff < -0.05 else "hold")
                        ),
                    }
                )

            return {
                "success": True,
                "optimization": {
                    "expected_return": round(portfolio_return * 100, 2),
                    "volatility": round(portfolio_volatility * 100, 2),
                    "sharpe_ratio": round(float(sharpe_ratio), 4),
                    "recommendations": recommendations,
                },
            }
        except ImportError:
            return {
                "success": False,
                "error": "cvxpy not installed. Cannot optimize portfolio.",
            }
        except Exception as e:
            logger.error(f"Error optimizing portfolio: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _get_latest_price(asset_id: str) -> Optional[Decimal]:
        try:
            latest = (
                PriceData.query.filter_by(asset_id=asset_id)
                .order_by(PriceData.timestamp.desc())
                .first()
            )
            return latest.close_price if latest else None
        except Exception as e:
            logger.error(f"Error getting latest price: {e}")
            return None

    @staticmethod
    def _calculate_current_portfolio_value(portfolio_id: str) -> Decimal:
        try:
            holdings = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
            total = Decimal("0")
            for holding in holdings:
                price = PortfolioService._get_latest_price(holding.asset_id)
                if price:
                    total += holding.quantity * price
            return total
        except Exception as e:
            logger.error(f"Error calculating portfolio value: {e}")
            return Decimal("0")

    @staticmethod
    def _get_asset_returns(asset_id: str, days: int = 252) -> Optional[np.ndarray]:
        try:
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            price_data = (
                PriceData.query.filter(
                    and_(
                        PriceData.asset_id == asset_id,
                        PriceData.timestamp >= start_date,
                        PriceData.timestamp <= end_date,
                        PriceData.interval == "1d",
                    )
                )
                .order_by(PriceData.timestamp)
                .all()
            )
            if len(price_data) < 2:
                return None
            prices = np.array([float(p.close_price) for p in price_data])
            returns = np.diff(prices) / np.where(prices[:-1] != 0, prices[:-1], 1)
            return returns
        except Exception as e:
            logger.error(f"Error getting asset returns: {e}")
            return None
