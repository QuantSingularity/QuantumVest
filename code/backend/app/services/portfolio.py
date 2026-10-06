"""
Portfolio management service: CRUD, transaction processing, performance analytics, optimization.
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from app.extensions import db
from app.models.financial import (
    Asset,
    AssetType,
    Portfolio,
    PortfolioHolding,
    PortfolioPerformance,
    PriceData,
    Transaction,
    TransactionType,
)
from sqlalchemy import and_

logger = logging.getLogger(__name__)


class PortfolioService:
    """Service for portfolio management and analytics."""

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
                existing = Portfolio.query.filter_by(
                    user_id=user_id, is_default=True
                ).first()
                if existing:
                    existing.is_default = False

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
        except Exception as exc:
            db.session.rollback()
            logger.error("Error creating portfolio: %s", exc)
            return {"success": False, "error": str(exc)}

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
        except Exception as exc:
            db.session.rollback()
            logger.error("Error deleting portfolio: %s", exc)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def get_user_portfolios(user_id: str) -> Dict[str, Any]:
        try:
            portfolios = Portfolio.query.filter_by(
                user_id=user_id, is_active=True
            ).all()
            result = []
            for p in portfolios:
                d = p.to_dict()
                d["holdings_count"] = PortfolioHolding.query.filter_by(
                    portfolio_id=p.id
                ).count()
                result.append(d)
            return {"success": True, "portfolios": result}
        except Exception as exc:
            logger.error("Error getting user portfolios: %s", exc)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def get_portfolio_details(portfolio_id: str, user_id: str) -> Dict[str, Any]:
        try:
            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}

            rows = (
                db.session.query(PortfolioHolding, Asset)
                .join(Asset, PortfolioHolding.asset_id == Asset.id)
                .filter(PortfolioHolding.portfolio_id == portfolio_id)
                .all()
            )

            holdings_data = []
            total_value = Decimal("0")

            for holding, asset in rows:
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

                h_dict = holding.to_dict()
                h_dict["asset"] = asset.to_dict()
                holdings_data.append(h_dict)

            portfolio.total_value = total_value
            for h in holdings_data:
                h["current_allocation"] = (
                    float(Decimal(str(h["market_value"])) / total_value * 100)
                    if total_value > 0
                    else 0
                )

            db.session.commit()
            d = portfolio.to_dict()
            d["holdings"] = holdings_data
            d["total_value"] = float(total_value)
            return {"success": True, "portfolio": d}
        except Exception as exc:
            db.session.rollback()
            logger.error("Error getting portfolio details: %s", exc)
            return {"success": False, "error": str(exc)}

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

            qty = Decimal(str(quantity))
            px = Decimal(str(price))
            fee = Decimal(str(fees))
            if not (qty.is_finite() and px.is_finite() and fee.is_finite()):
                return {"success": False, "error": "Numeric values must be finite"}
            if qty <= 0:
                return {"success": False, "error": "Quantity must be positive"}
            if px < 0 or fee < 0:
                return {"success": False, "error": "Price and fees must not be negative"}
            total_amount = qty * px + fee

            transaction = Transaction(
                user_id=user_id,
                portfolio_id=portfolio_id,
                asset_id=asset.id,
                transaction_type=trans_type,
                quantity=qty,
                price=px,
                total_amount=total_amount,
                fees=fee,
                notes=notes,
            )
            db.session.add(transaction)

            holding = PortfolioHolding.query.filter_by(
                portfolio_id=portfolio_id, asset_id=asset.id
            ).first()

            if trans_type == TransactionType.BUY:
                cost_basis = qty * px
                if holding:
                    old_cost = holding.quantity * holding.average_cost
                    holding.quantity += qty
                    holding.average_cost = (old_cost + cost_basis) / holding.quantity
                else:
                    holding = PortfolioHolding(
                        portfolio_id=portfolio_id,
                        asset_id=asset.id,
                        quantity=qty,
                        average_cost=px,
                    )
                    db.session.add(holding)

            elif trans_type == TransactionType.SELL:
                if not holding or holding.quantity < qty:
                    db.session.rollback()
                    return {"success": False, "error": "Insufficient holdings to sell"}
                realized_pnl = (px - holding.average_cost) * qty
                transaction.realized_pnl = realized_pnl
                portfolio.realized_pnl = (
                    portfolio.realized_pnl or Decimal("0")
                ) + realized_pnl
                holding.quantity -= qty
                if holding.quantity <= Decimal("0"):
                    db.session.delete(holding)

            db.session.commit()
            return {"success": True, "transaction": transaction.to_dict()}
        except Exception as exc:
            db.session.rollback()
            logger.error("Error adding transaction: %s", exc)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def get_transactions(
        portfolio_id: str, user_id: str, page: int = 1, per_page: int = 20
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
        except Exception as exc:
            logger.error("Error getting transactions: %s", exc)
            return {"success": False, "error": str(exc)}

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

            perf_records = (
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

            if not perf_records:
                current_value = PortfolioService._calculate_current_value(portfolio_id)
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

            values = [float(p.total_value) for p in perf_records]
            dates = [p.timestamp.isoformat() for p in perf_records]

            if len(values) > 1:
                arr = np.array(values)
                denom = np.where(arr[:-1] != 0, arr[:-1], 1)
                returns = np.diff(arr) / denom
                total_return = (
                    (values[-1] - values[0]) / values[0] * 100 if values[0] > 0 else 0
                )
                volatility = float(np.std(returns) * np.sqrt(252) * 100)
                rf = 0.02 / 252
                excess = returns - rf
                sharpe_ratio = (
                    float(np.mean(excess) / np.std(returns) * np.sqrt(252))
                    if np.std(returns) > 0
                    else 0
                )
                peak = np.maximum.accumulate(arr)
                drawdown = (arr - peak) / np.where(peak != 0, peak, 1)
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
        except Exception as exc:
            logger.error("Error getting portfolio performance: %s", exc)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def _holding_prices(
        holdings: List[PortfolioHolding], days: int = 400
    ) -> Tuple[pd.DataFrame, Dict[str, str], Dict[str, float]]:
        from app.services.ai import get_ai_service

        service = get_ai_service()
        series: Dict[str, pd.Series] = {}
        asset_types: Dict[str, str] = {}
        values: Dict[str, float] = {}
        for holding in holdings:
            asset = db.session.get(Asset, holding.asset_id)
            if asset is None:
                continue
            kind = "crypto" if asset.asset_type == AssetType.CRYPTO else "stock"
            close = PortfolioService._db_close_series(asset.id, days)
            if close is None or len(close) < 60:
                try:
                    close = service.close_series(asset.symbol, kind)
                except Exception as exc:
                    logger.info("No price history for %s: %s", asset.symbol, exc)
                    continue
            series[asset.symbol] = close
            asset_types[asset.symbol] = kind
            values[asset.symbol] = float(holding.quantity) * float(close.iloc[-1])
        if not series:
            return pd.DataFrame(), asset_types, values
        prices = pd.DataFrame(series).dropna()
        return prices, asset_types, values

    @staticmethod
    def _db_close_series(asset_id: str, days: int) -> Optional[pd.Series]:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=days)
        rows = (
            PriceData.query.filter(
                and_(
                    PriceData.asset_id == asset_id,
                    PriceData.timestamp >= start,
                    PriceData.timestamp <= end,
                    PriceData.interval == "1d",
                )
            )
            .order_by(PriceData.timestamp)
            .all()
        )
        if len(rows) < 2:
            return None
        index = pd.DatetimeIndex(
            [
                r.timestamp.replace(tzinfo=None) if r.timestamp.tzinfo else r.timestamp
                for r in rows
            ]
        ).normalize()
        series = pd.Series([float(r.close_price) for r in rows], index=index)
        return series[~series.index.duplicated(keep="last")]

    @staticmethod
    def optimize_portfolio(
        portfolio_id: str,
        user_id: str,
        target_return: Optional[float] = None,
        risk_tolerance: float = 0.5,
        objective: Optional[str] = None,
        max_weight: Optional[float] = None,
        min_weight: float = 0.0,
        use_forecasts: bool = False,
    ) -> Dict[str, Any]:
        from app.services.ai import OptimizationError, get_ai_service

        try:
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

            prices, asset_types, values = PortfolioService._holding_prices(holdings)
            if prices.shape[1] < 2:
                return {
                    "success": False,
                    "error": "Insufficient price data for optimization",
                }

            if objective is None:
                objective = "target_return" if target_return is not None else "mean_variance"
            if target_return is not None and objective != "target_return":
                objective = "target_return"
            risk_tolerance = float(0.5 if risk_tolerance is None else risk_tolerance)

            result = get_ai_service().optimize(
                prices,
                asset_types,
                objective=objective,
                risk_tolerance=risk_tolerance,
                target_return=target_return,
                min_weight=min_weight,
                max_weight=max_weight,
                use_forecasts=use_forecasts,
                current_values=values,
            )

            total_value = sum(values.values())
            recs = []
            for symbol, optimal in result["weights"].items():
                current = values.get(symbol, 0.0) / total_value if total_value > 0 else 0.0
                diff = optimal - current
                recs.append(
                    {
                        "symbol": symbol,
                        "current_weight": round(current, 4),
                        "optimal_weight": round(optimal, 4),
                        "recommendation": (
                            "buy" if diff > 0.05 else ("sell" if diff < -0.05 else "hold")
                        ),
                    }
                )

            return {
                "success": True,
                "optimization": {
                    "objective": result["objective"],
                    "effective_objective": result["effective_objective"],
                    "expected_return": round(result["expected_return"] * 100, 2),
                    "volatility": round(result["volatility"] * 100, 2),
                    "sharpe_ratio": round(result["sharpe_ratio"], 4),
                    "observations": result["observations"],
                    "forecast_assets": result["forecast_assets"],
                    "note": result.get("note"),
                    "risk": result["risk"],
                    "recommendations": recs,
                },
            }
        except OptimizationError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            logger.error("Error optimizing portfolio: %s", exc)
            return {"success": False, "error": "Optimization failed"}

    @staticmethod
    def get_portfolio_risk(portfolio_id: str, user_id: str) -> Dict[str, Any]:
        from app.services.ai import OptimizationError, get_ai_service

        try:
            portfolio = Portfolio.query.filter_by(
                id=portfolio_id, user_id=user_id
            ).first()
            if not portfolio:
                return {"success": False, "error": "Portfolio not found"}
            holdings = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
            if not holdings:
                return {"success": False, "error": "Portfolio has no holdings"}
            prices, asset_types, values = PortfolioService._holding_prices(holdings)
            if prices.empty:
                return {"success": False, "error": "Insufficient price data"}
            weights = {s: values[s] for s in prices.columns}
            analysis = get_ai_service().analyze_risk(prices, weights)
            return {"success": True, "risk": analysis}
        except OptimizationError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            logger.error("Error analyzing portfolio risk: %s", exc)
            return {"success": False, "error": "Risk analysis failed"}

    @staticmethod
    def _get_latest_price(asset_id: str) -> Optional[Decimal]:
        try:
            row = (
                PriceData.query.filter_by(asset_id=asset_id)
                .order_by(PriceData.timestamp.desc())
                .first()
            )
            return row.close_price if row else None
        except Exception as exc:
            logger.error("Error getting latest price: %s", exc)
            return None

    @staticmethod
    def _calculate_current_value(portfolio_id: str) -> Decimal:
        try:
            holdings = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
            total = Decimal("0")
            for h in holdings:
                price = PortfolioService._get_latest_price(h.asset_id)
                if price:
                    total += h.quantity * price
            return total
        except Exception as exc:
            logger.error("Error calculating portfolio value: %s", exc)
            return Decimal("0")

    @staticmethod
    def _get_asset_returns(asset_id: str, days: int = 252) -> Optional[np.ndarray]:
        try:
            end = datetime.now(timezone.utc)
            start = end - timedelta(days=days)
            rows = (
                PriceData.query.filter(
                    and_(
                        PriceData.asset_id == asset_id,
                        PriceData.timestamp >= start,
                        PriceData.timestamp <= end,
                        PriceData.interval == "1d",
                    )
                )
                .order_by(PriceData.timestamp)
                .all()
            )
            if len(rows) < 2:
                return None
            prices = np.array([float(r.close_price) for r in rows])
            denom = np.where(prices[:-1] != 0, prices[:-1], 1)
            return np.diff(prices) / denom
        except Exception as exc:
            logger.error("Error getting asset returns: %s", exc)
            return None
