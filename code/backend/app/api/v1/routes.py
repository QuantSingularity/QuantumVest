"""
REST API routes - /api/v1/*
"""

import logging
from datetime import datetime, timezone
from typing import Any, Tuple

from app.core.auth import (
    AuthService,
    admin_required,
    premium_required,
    rate_limit,
    token_required,
)
from app.extensions import db
from app.models.financial import Asset, Watchlist, WatchlistItem
from app.services.blockchain import BlockchainService
from app.services.portfolio import PortfolioService
from flask import Blueprint, Response, jsonify, request
from sqlalchemy import text

logger = logging.getLogger(__name__)

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")

_portfolio_service = PortfolioService()


# ─────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────


@api_bp.route("/health", methods=["GET"])
def health_check() -> Response:
    db_ok = False
    try:
        db.session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # Lightweight boolean only - the authenticated /blockchain/status
    # endpoint below has connection/contract details.
    blockchain_ok = False
    try:
        blockchain_ok = BlockchainService.is_connected()
    except Exception:
        pass

    return jsonify(
        {
            "status": "healthy" if db_ok else "degraded",
            "version": "2.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "services": {"database": db_ok, "blockchain": blockchain_ok},
        }
    )


# ─────────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────────


@api_bp.route("/auth/register", methods=["POST"])
@rate_limit(limit=5, window=300)
def register() -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        if not all([username, email, password]):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "username, email and password are required",
                    }
                ),
                400,
            )

        result = AuthService.register_user(
            username=username,
            email=email,
            password=password,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
        )
        return (jsonify(result), 201) if result["success"] else (jsonify(result), 400)
    except Exception as exc:
        logger.error("register error: %s", exc)
        return jsonify({"success": False, "error": "Registration failed"}), 500


@api_bp.route("/auth/login", methods=["POST"])
@rate_limit(limit=10, window=300)
def login() -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        identifier = data.get("username") or data.get("email")
        password = data.get("password")

        if not all([identifier, password]):
            return jsonify({"success": False, "error": "Credentials required"}), 400

        result = AuthService.login_user(identifier, password)
        return (jsonify(result), 200) if result["success"] else (jsonify(result), 401)
    except Exception as exc:
        logger.error("login error: %s", exc)
        return jsonify({"success": False, "error": "Login failed"}), 500


@api_bp.route("/auth/logout", methods=["POST"])
@token_required
def logout(current_user: Any) -> Tuple[Response, int]:
    return jsonify({"success": True, "message": "Logged out successfully"}), 200


@api_bp.route("/auth/refresh", methods=["POST"])
def refresh_token() -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data or "refresh_token" not in data:
            return jsonify({"success": False, "error": "Refresh token required"}), 400
        result = AuthService.refresh_access_token(data["refresh_token"])
        return (jsonify(result), 200) if result["success"] else (jsonify(result), 401)
    except Exception as exc:
        logger.error("refresh error: %s", exc)
        return jsonify({"success": False, "error": "Token refresh failed"}), 500


@api_bp.route("/auth/forgot-password", methods=["POST"])
@rate_limit(limit=5, window=300)
def forgot_password() -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data or "email" not in data:
            return jsonify({"success": False, "error": "Email is required"}), 400
        result = AuthService.request_password_reset(data["email"])
        return jsonify(result), 200
    except Exception as exc:
        logger.error("forgot_password error: %s", exc)
        return (
            jsonify(
                {
                    "success": True,
                    "message": (
                        "If an account exists for that email, a password "
                        "reset link has been sent."
                    ),
                }
            ),
            200,
        )


@api_bp.route("/auth/reset-password", methods=["POST"])
@rate_limit(limit=5, window=300)
def reset_password() -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ("token", "new_password")):
            return (
                jsonify(
                    {"success": False, "error": "token and new_password are required"}
                ),
                400,
            )
        result = AuthService.reset_password(data["token"], data["new_password"])
        return (jsonify(result), 200) if result["success"] else (jsonify(result), 400)
    except Exception as exc:
        logger.error("reset_password error: %s", exc)
        return jsonify({"success": False, "error": "Failed to reset password"}), 500


@api_bp.route("/auth/profile", methods=["GET"])
@token_required
def get_profile(current_user: Any) -> Tuple[Response, int]:
    return jsonify({"success": True, "user": current_user.to_dict()}), 200


@api_bp.route("/auth/profile", methods=["PUT"])
@token_required
def update_profile(current_user: Any) -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        allowed = [
            "first_name",
            "last_name",
            "phone",
            "risk_tolerance",
            "investment_experience",
            "investment_goals",
        ]
        for field in allowed:
            if field in data:
                setattr(current_user, field, data[field])
        current_user.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({"success": True, "user": current_user.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error("update_profile error: %s", exc)
        return jsonify({"success": False, "error": "Failed to update profile"}), 500


@api_bp.route("/auth/change-password", methods=["POST"])
@token_required
@rate_limit(limit=5, window=300)
def change_password(current_user: Any) -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        cur = data.get("current_password")
        new = data.get("new_password")
        if not all([cur, new]):
            return (
                jsonify(
                    {"success": False, "error": "Current and new password required"}
                ),
                400,
            )

        result = AuthService.change_password(str(current_user.id), cur, new)
        return (jsonify(result), 200) if result["success"] else (jsonify(result), 400)
    except Exception as exc:
        logger.error("change_password error: %s", exc)
        return jsonify({"success": False, "error": "Failed to change password"}), 500


# ─────────────────────────────────────────────────────────────
# Portfolios
# ─────────────────────────────────────────────────────────────


@api_bp.route("/portfolios", methods=["GET"])
@token_required
def get_portfolios(current_user: Any) -> Tuple[Response, int]:
    result = PortfolioService.get_user_portfolios(str(current_user.id))
    return (jsonify(result), 200) if result["success"] else (jsonify(result), 400)


@api_bp.route("/portfolios", methods=["POST"])
@token_required
def create_portfolio(current_user: Any) -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data or "name" not in data:
            return (
                jsonify({"success": False, "error": "Portfolio name is required"}),
                400,
            )

        result = PortfolioService.create_portfolio(
            user_id=str(current_user.id),
            name=data["name"],
            description=data.get("description"),
            currency=data.get("currency", "USD"),
            is_default=data.get("is_default", False),
        )
        return (jsonify(result), 201) if result["success"] else (jsonify(result), 400)
    except Exception as exc:
        logger.error("create_portfolio error: %s", exc)
        return jsonify({"success": False, "error": "Failed to create portfolio"}), 500


@api_bp.route("/portfolios/<portfolio_id>", methods=["GET"])
@token_required
def get_portfolio(current_user: Any, portfolio_id: str) -> Tuple[Response, int]:
    result = PortfolioService.get_portfolio_details(portfolio_id, str(current_user.id))
    return (jsonify(result), 200) if result["success"] else (jsonify(result), 404)


@api_bp.route("/portfolios/<portfolio_id>", methods=["DELETE"])
@token_required
def delete_portfolio(current_user: Any, portfolio_id: str) -> Tuple[Response, int]:
    result = PortfolioService.delete_portfolio(portfolio_id, str(current_user.id))
    return (jsonify(result), 200) if result["success"] else (jsonify(result), 404)


@api_bp.route("/portfolios/<portfolio_id>/transactions", methods=["POST"])
@token_required
def add_transaction(current_user: Any, portfolio_id: str) -> Tuple[Response, int]:
    try:
        data = request.get_json()
        required = ["asset_symbol", "transaction_type", "quantity", "price"]
        if not data or not all(f in data for f in required):
            return jsonify({"success": False, "error": f"Required: {required}"}), 400

        result = PortfolioService.add_transaction(
            portfolio_id=portfolio_id,
            user_id=str(current_user.id),
            asset_symbol=data["asset_symbol"],
            transaction_type=data["transaction_type"],
            quantity=float(data["quantity"]),
            price=float(data["price"]),
            fees=float(data.get("fees", 0)),
            notes=data.get("notes"),
        )
        return (jsonify(result), 201) if result["success"] else (jsonify(result), 400)
    except Exception as exc:
        logger.error("add_transaction error: %s", exc)
        return jsonify({"success": False, "error": "Failed to add transaction"}), 500


@api_bp.route("/portfolios/<portfolio_id>/transactions", methods=["GET"])
@token_required
def get_transactions(current_user: Any, portfolio_id: str) -> Tuple[Response, int]:
    try:
        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 20)), 100)
        result = PortfolioService.get_transactions(
            portfolio_id, str(current_user.id), page=page, per_page=per_page
        )
        return (jsonify(result), 200) if result["success"] else (jsonify(result), 404)
    except Exception as exc:
        logger.error("get_transactions error: %s", exc)
        return jsonify({"success": False, "error": "Failed to get transactions"}), 500


@api_bp.route("/portfolios/<portfolio_id>/performance", methods=["GET"])
@token_required
def get_portfolio_performance(
    current_user: Any, portfolio_id: str
) -> Tuple[Response, int]:
    try:
        days = int(request.args.get("days", 30))
        result = PortfolioService.get_portfolio_performance(
            portfolio_id, str(current_user.id), days=days
        )
        return (jsonify(result), 200) if result["success"] else (jsonify(result), 404)
    except Exception as exc:
        logger.error("get_portfolio_performance error: %s", exc)
        return jsonify({"success": False, "error": "Failed to get performance"}), 500


@api_bp.route("/portfolios/<portfolio_id>/optimize", methods=["POST"])
@token_required
@premium_required
def optimize_portfolio(current_user: Any, portfolio_id: str) -> Tuple[Response, int]:
    try:
        data = request.get_json() or {}
        result = PortfolioService.optimize_portfolio(
            portfolio_id=portfolio_id,
            user_id=str(current_user.id),
            target_return=data.get("target_return"),
            risk_tolerance=data.get(
                "risk_tolerance", current_user.risk_tolerance or 0.5
            ),
        )
        return (jsonify(result), 200) if result["success"] else (jsonify(result), 400)
    except Exception as exc:
        logger.error("optimize_portfolio error: %s", exc)
        return jsonify({"success": False, "error": "Failed to optimize portfolio"}), 500


# ─────────────────────────────────────────────────────────────
# Assets
# ─────────────────────────────────────────────────────────────


@api_bp.route("/assets", methods=["GET"])
@token_required
def list_assets(current_user: Any) -> Tuple[Response, int]:
    try:
        asset_type = request.args.get("type", "").strip()
        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 20)), 100)

        q = Asset.query.filter(Asset.is_active == True)  # noqa: E712
        if asset_type:
            q = q.filter(Asset.asset_type == asset_type)

        paginated = q.paginate(page=page, per_page=per_page, error_out=False)
        return (
            jsonify(
                {
                    "success": True,
                    "assets": [a.to_dict() for a in paginated.items],
                    "total": paginated.total,
                    "pages": paginated.pages,
                    "page": page,
                    "per_page": per_page,
                }
            ),
            200,
        )
    except Exception as exc:
        logger.error("list_assets error: %s", exc)
        return jsonify({"success": False, "error": "Failed to list assets"}), 500


@api_bp.route("/assets/search", methods=["GET"])
@token_required
def search_assets(current_user: Any) -> Tuple[Response, int]:
    try:
        query = request.args.get("q", "").strip()
        asset_type = request.args.get("type", "").strip()
        limit = min(int(request.args.get("limit", 20)), 100)

        if not query:
            return jsonify({"success": False, "error": "Search query is required"}), 400

        q = Asset.query.filter(Asset.is_active == True)  # noqa: E712
        if asset_type:
            q = q.filter(Asset.asset_type == asset_type)
        q = q.filter(
            db.or_(Asset.symbol.ilike(f"%{query}%"), Asset.name.ilike(f"%{query}%"))
        )
        assets = q.limit(limit).all()
        return jsonify({"success": True, "assets": [a.to_dict() for a in assets]}), 200
    except Exception as exc:
        logger.error("search_assets error: %s", exc)
        return jsonify({"success": False, "error": "Failed to search assets"}), 500


# ─────────────────────────────────────────────────────────────
# Watchlists
# ─────────────────────────────────────────────────────────────


@api_bp.route("/watchlists", methods=["GET"])
@token_required
def get_watchlists(current_user: Any) -> Tuple[Response, int]:
    try:
        watchlists = Watchlist.query.filter_by(user_id=current_user.id).all()
        data = [
            {
                **w.to_dict(),
                "items_count": w.items.count(),
            }
            for w in watchlists
        ]
        return jsonify({"success": True, "watchlists": data}), 200
    except Exception as exc:
        logger.error("get_watchlists error: %s", exc)
        return jsonify({"success": False, "error": "Failed to get watchlists"}), 500


@api_bp.route("/watchlists/<watchlist_id>", methods=["GET"])
@token_required
def get_watchlist_detail(current_user: Any, watchlist_id: str) -> Tuple[Response, int]:
    """Return a single watchlist with its items and asset details.

    Added to close a gap: the list endpoint only exposed items_count, and
    there was previously no way for a client to discover which assets are
    in a watchlist (making removal impossible, since that requires an
    item_id the client could never obtain).
    """
    try:
        wl = Watchlist.query.filter_by(id=watchlist_id, user_id=current_user.id).first()
        if not wl:
            return jsonify({"success": False, "error": "Watchlist not found"}), 404

        items = []
        for item in wl.items.order_by(WatchlistItem.created_at.desc()).all():
            asset = db.session.get(Asset, item.asset_id)
            items.append(
                {**item.to_dict(), "asset": asset.to_dict() if asset else None}
            )

        return (
            jsonify({"success": True, "watchlist": {**wl.to_dict(), "items": items}}),
            200,
        )
    except Exception as exc:
        logger.error("get_watchlist_detail error: %s", exc)
        return jsonify({"success": False, "error": "Failed to get watchlist"}), 500


@api_bp.route("/watchlists", methods=["POST"])
@token_required
def create_watchlist(current_user: Any) -> Tuple[Response, int]:
    try:
        data = request.get_json()
        if not data or "name" not in data:
            return (
                jsonify({"success": False, "error": "Watchlist name is required"}),
                400,
            )

        wl = Watchlist(
            user_id=current_user.id,
            name=data["name"],
            description=data.get("description"),
            is_default=data.get("is_default", False),
        )
        db.session.add(wl)
        db.session.commit()
        return jsonify({"success": True, "watchlist": wl.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        logger.error("create_watchlist error: %s", exc)
        return jsonify({"success": False, "error": "Failed to create watchlist"}), 500


@api_bp.route("/watchlists/<watchlist_id>", methods=["DELETE"])
@token_required
def delete_watchlist(current_user: Any, watchlist_id: str) -> Tuple[Response, int]:
    try:
        wl = Watchlist.query.filter_by(id=watchlist_id, user_id=current_user.id).first()
        if not wl:
            return jsonify({"success": False, "error": "Watchlist not found"}), 404
        db.session.delete(wl)
        db.session.commit()
        return jsonify({"success": True, "message": "Watchlist deleted"}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error("delete_watchlist error: %s", exc)
        return jsonify({"success": False, "error": "Failed to delete watchlist"}), 500


@api_bp.route("/watchlists/<watchlist_id>/items", methods=["POST"])
@token_required
def add_watchlist_item(current_user: Any, watchlist_id: str) -> Tuple[Response, int]:
    try:
        wl = Watchlist.query.filter_by(id=watchlist_id, user_id=current_user.id).first()
        if not wl:
            return jsonify({"success": False, "error": "Watchlist not found"}), 404

        data = request.get_json()
        if not data or "asset_symbol" not in data:
            return jsonify({"success": False, "error": "asset_symbol is required"}), 400

        asset = Asset.query.filter_by(symbol=data["asset_symbol"].upper()).first()
        if not asset:
            return jsonify({"success": False, "error": "Asset not found"}), 404

        if WatchlistItem.query.filter_by(
            watchlist_id=watchlist_id, asset_id=asset.id
        ).first():
            return (
                jsonify({"success": False, "error": "Asset already in watchlist"}),
                409,
            )

        item = WatchlistItem(
            watchlist_id=watchlist_id, asset_id=asset.id, notes=data.get("notes")
        )
        db.session.add(item)
        db.session.commit()
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Asset added to watchlist",
                    "item": {**item.to_dict(), "asset": asset.to_dict()},
                }
            ),
            201,
        )
    except Exception as exc:
        db.session.rollback()
        logger.error("add_watchlist_item error: %s", exc)
        return jsonify({"success": False, "error": "Failed to add watchlist item"}), 500


@api_bp.route("/watchlists/<watchlist_id>/items/<item_id>", methods=["DELETE"])
@token_required
def remove_watchlist_item(
    current_user: Any, watchlist_id: str, item_id: str
) -> Tuple[Response, int]:
    try:
        wl = Watchlist.query.filter_by(id=watchlist_id, user_id=current_user.id).first()
        if not wl:
            return jsonify({"success": False, "error": "Watchlist not found"}), 404

        item = WatchlistItem.query.filter_by(
            id=item_id, watchlist_id=watchlist_id
        ).first()
        if not item:
            return jsonify({"success": False, "error": "Item not found"}), 404

        db.session.delete(item)
        db.session.commit()
        return jsonify({"success": True, "message": "Item removed"}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error("remove_watchlist_item error: %s", exc)
        return jsonify({"success": False, "error": "Failed to remove item"}), 500


# ─────────────────────────────────────────────────────────────
# Risk
# ─────────────────────────────────────────────────────────────


@api_bp.route("/risk/var", methods=["POST"])
@token_required
def calculate_var(current_user: Any) -> Tuple[Response, int]:
    """Calculate VaR from a supplied list of returns."""
    try:
        import numpy as np
        from app.services.risk import RiskManagementService

        data = request.get_json()
        if not data or "returns" not in data:
            return (
                jsonify({"success": False, "error": "returns array is required"}),
                400,
            )

        returns = np.array(data["returns"], dtype=float)
        if len(returns) < 10:
            return (
                jsonify({"success": False, "error": "Need at least 10 data points"}),
                400,
            )

        alpha = float(data.get("alpha", 0.05))
        method = data.get("method", "historical")
        horizon = int(data.get("time_horizon", 1))

        var = RiskManagementService.calculate_var(returns, alpha, horizon, method)
        cvar = RiskManagementService.calculate_cvar(returns, alpha)
        return (
            jsonify(
                {
                    "success": True,
                    "var": round(var, 6),
                    "cvar": round(cvar, 6),
                    "confidence_level": 1 - alpha,
                    "method": method,
                }
            ),
            200,
        )
    except Exception as exc:
        logger.error("calculate_var error: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@api_bp.route("/risk/metrics", methods=["POST"])
@token_required
def risk_metrics(current_user: Any) -> Tuple[Response, int]:
    """Calculate comprehensive metrics from a returns array."""
    try:
        import numpy as np
        from app.services.risk import RiskManagementService

        data = request.get_json()
        if not data or "returns" not in data:
            return (
                jsonify({"success": False, "error": "returns array is required"}),
                400,
            )

        returns = np.array(data["returns"], dtype=float)
        benchmark = (
            np.array(data["benchmark_returns"], dtype=float)
            if "benchmark_returns" in data
            else None
        )

        metrics = RiskManagementService.calculate_metrics(returns, benchmark)
        return jsonify({"success": True, "metrics": metrics}), 200
    except Exception as exc:
        logger.error("risk_metrics error: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


# ─────────────────────────────────────────────────────────────
# Blockchain
# ─────────────────────────────────────────────────────────────
# Web3 gateway to the contracts in ../../blockchain - see
# app/services/blockchain.py for connection/address resolution details.


@api_bp.route("/blockchain/status", methods=["GET"])
@token_required
def blockchain_status(current_user: Any) -> Tuple[Response, int]:
    status = BlockchainService.status()
    return jsonify({"success": True, **status}), 200


@api_bp.route("/blockchain/trend", methods=["GET"])
@token_required
def blockchain_trend(current_user: Any) -> Tuple[Response, int]:
    """Latest Chainlink-fed price, and optionally a simple moving average
    if ?window=N is supplied (see TrendAnalysis.sol)."""
    window = request.args.get("window", type=int)

    result = BlockchainService.get_price_trend()
    if not result["success"]:
        return jsonify(result), 502

    if window:
        ma_result = BlockchainService.get_moving_average(window)
        if ma_result["success"]:
            result["moving_average"] = ma_result["moving_average"]
            result["window"] = window

    return jsonify(result), 200


@api_bp.route("/blockchain/market-data/<ticker>", methods=["GET"])
@token_required
def blockchain_market_data(current_user: Any, ticker: str) -> Tuple[Response, int]:
    """On-chain market data history recorded via DataTracking.sol."""
    result = BlockchainService.get_historical_market_data(ticker.upper())
    return (jsonify(result), 200) if result["success"] else (jsonify(result), 502)


@api_bp.route("/blockchain/market-data", methods=["POST"])
@token_required
@admin_required
def record_blockchain_market_data(current_user: Any) -> Tuple[Response, int]:
    """Records a market data point on-chain. Admin-only: this sends a real
    (gas-costing) transaction signed by the configured contract-owner key."""
    try:
        data = request.get_json()
        required = ["ticker", "price", "volume"]
        if not data or not all(f in data for f in required):
            return jsonify({"success": False, "error": f"Required: {required}"}), 400

        result = BlockchainService.record_market_data(
            ticker=str(data["ticker"]).upper(),
            price=int(data["price"]),
            volume=int(data["volume"]),
        )
        return (jsonify(result), 201) if result["success"] else (jsonify(result), 502)
    except (TypeError, ValueError) as exc:
        return jsonify({"success": False, "error": f"Invalid input: {exc}"}), 400
    except Exception as exc:
        logger.error("record_blockchain_market_data error: %s", exc)
        return (
            jsonify({"success": False, "error": "Failed to record market data"}),
            500,
        )


@api_bp.route("/blockchain/token/balance/<address>", methods=["GET"])
@token_required
def blockchain_token_balance(current_user: Any, address: str) -> Tuple[Response, int]:
    """QuantumVestToken (QVT) balance for a given wallet address."""
    result = BlockchainService.get_token_balance(address)
    return (jsonify(result), 200) if result["success"] else (jsonify(result), 400)


@api_bp.route("/blockchain/oracle/<asset_address>", methods=["GET"])
@token_required
def blockchain_oracle_price(
    current_user: Any, asset_address: str
) -> Tuple[Response, int]:
    """On-chain oracle price for an asset (see QuantumVestOracle.sol)."""
    result = BlockchainService.get_oracle_price(asset_address)
    return (jsonify(result), 200) if result["success"] else (jsonify(result), 404)
