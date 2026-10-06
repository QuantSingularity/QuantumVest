import logging
from typing import Any, Optional, Tuple

from app.core.auth import admin_required, rate_limit, token_required
from app.models.financial import Asset, AssetType
from app.services.ai import InvalidSymbolError, PredictionError, get_ai_service
from app.services.portfolio import PortfolioService
from flask import Blueprint, Response, current_app, jsonify, request

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/v1")

_ERROR_STATUS = {
    "invalid_request": 400,
    "training_not_allowed": 400,
    "no_data": 404,
    "model_unavailable": 404,
    "insufficient_data": 422,
    "busy": 503,
}


def _disabled() -> Optional[Tuple[Response, int]]:
    if not current_app.config.get("AI_ENABLED", True):
        return jsonify({"success": False, "error": "AI features are disabled"}), 503
    return None


def _resolve_asset_type(symbol: str, explicit: Optional[str]) -> str:
    if explicit:
        return explicit.strip().lower()
    asset = Asset.query.filter_by(symbol=symbol.upper()).first()
    if asset is not None and asset.asset_type == AssetType.CRYPTO:
        return "crypto"
    return "stock"


def _int_arg(name: str, default: int) -> int:
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    return int(raw)


def _error(exc: PredictionError) -> Tuple[Response, int]:
    status = _ERROR_STATUS.get(exc.code, 500)
    return jsonify({"success": False, "error": exc.message, "code": exc.code}), status


@ai_bp.route("/predictions/models", methods=["GET"])
@token_required
def list_prediction_models(current_user: Any) -> Tuple[Response, int]:
    blocked = _disabled()
    if blocked:
        return blocked
    try:
        symbol = request.args.get("symbol")
        asset_type = request.args.get("asset_type")
        models = get_ai_service().models(symbol, asset_type)
        return jsonify({"success": True, "models": models}), 200
    except (ValueError, InvalidSymbolError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        logger.error("list_prediction_models error: %s", exc)
        return jsonify({"success": False, "error": "Failed to list models"}), 500


@ai_bp.route("/predictions/<symbol>", methods=["GET"])
@token_required
@rate_limit(limit=30, window=60)
def get_prediction(current_user: Any, symbol: str) -> Tuple[Response, int]:
    blocked = _disabled()
    if blocked:
        return blocked
    try:
        steps = _int_arg("days", 7)
        asset_type = _resolve_asset_type(symbol, request.args.get("asset_type"))
        refresh = request.args.get("refresh", "").lower() in ("1", "true", "yes")
        result = get_ai_service().predict(
            symbol,
            asset_type,
            steps=steps,
            model_type=request.args.get("model"),
            refresh=refresh,
        )
        return jsonify(result), 200
    except PredictionError as exc:
        return _error(exc)
    except (ValueError, InvalidSymbolError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        logger.error("get_prediction error for %s: %s", symbol, exc)
        return jsonify({"success": False, "error": "Prediction failed"}), 500


@ai_bp.route("/predictions/<symbol>/train", methods=["POST"])
@token_required
@admin_required
@rate_limit(limit=5, window=300)
def train_prediction_model(current_user: Any, symbol: str) -> Tuple[Response, int]:
    blocked = _disabled()
    if blocked:
        return blocked
    try:
        data = request.get_json(silent=True) or {}
        asset_type = _resolve_asset_type(symbol, data.get("asset_type"))
        epochs = int(data.get("epochs", 60))
        if not 1 <= epochs <= 500:
            return jsonify({"success": False, "error": "epochs must be between 1 and 500"}), 400
        result = get_ai_service().train(
            symbol, asset_type, data.get("model_type"), epochs
        )
        return jsonify(result), 201
    except PredictionError as exc:
        return _error(exc)
    except (ValueError, TypeError, InvalidSymbolError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        logger.error("train_prediction_model error for %s: %s", symbol, exc)
        return jsonify({"success": False, "error": "Training failed"}), 500


@ai_bp.route("/portfolios/<portfolio_id>/risk", methods=["GET"])
@token_required
@rate_limit(limit=30, window=60)
def get_portfolio_risk(current_user: Any, portfolio_id: str) -> Tuple[Response, int]:
    blocked = _disabled()
    if blocked:
        return blocked
    result = PortfolioService.get_portfolio_risk(portfolio_id, str(current_user.id))
    if result["success"]:
        return jsonify(result), 200
    status = 404 if result["error"] == "Portfolio not found" else 400
    return jsonify(result), status
