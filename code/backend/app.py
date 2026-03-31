"""
Flask Application for QuantumVest
Comprehensive investment analytics platform with authentication, portfolio management, and AI predictions
"""

import logging
import os

from api_routes import api_bp
from config import get_config
from flask import Flask, jsonify, send_from_directory
from flask_caching import Cache
from flask_cors import CORS
from flask_migrate import Migrate
from models import Asset, AssetType, db

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def create_app(config_name: str = None) -> Flask:
    """Application factory pattern"""
    app = Flask(__name__, static_folder="../web-frontend/build")
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")
    config_class = get_config()
    app.config.from_object(config_class)
    db.init_app(app)
    Migrate(app, db)
    Cache(app)
    CORS(app, origins=app.config.get("CORS_ORIGINS", ["*"]))
    app.register_blueprint(api_bp)
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
            create_default_assets()
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_static(path):
        """Serve React frontend"""
        if path != "" and os.path.exists(app.static_folder + "/" + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, "index.html")

    @app.errorhandler(404)
    def not_found(error):
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Endpoint not found",
                    "message": "Please check the API documentation for available endpoints",
                }
            ),
            404,
        )

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Internal server error",
                    "message": "An unexpected error occurred",
                }
            ),
            500,
        )

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later.",
                }
            ),
            429,
        )

    return app


def create_default_assets() -> None:
    """Create default assets in the database"""
    try:
        crypto_assets = [
            {"symbol": "BTC", "name": "Bitcoin", "asset_type": AssetType.CRYPTO},
            {"symbol": "ETH", "name": "Ethereum", "asset_type": AssetType.CRYPTO},
            {"symbol": "XRP", "name": "XRP", "asset_type": AssetType.CRYPTO},
            {"symbol": "LTC", "name": "Litecoin", "asset_type": AssetType.CRYPTO},
            {"symbol": "BCH", "name": "Bitcoin Cash", "asset_type": AssetType.CRYPTO},
            {"symbol": "ADA", "name": "Cardano", "asset_type": AssetType.CRYPTO},
            {"symbol": "DOT", "name": "Polkadot", "asset_type": AssetType.CRYPTO},
            {"symbol": "LINK", "name": "Chainlink", "asset_type": AssetType.CRYPTO},
            {"symbol": "XLM", "name": "Stellar", "asset_type": AssetType.CRYPTO},
            {"symbol": "DOGE", "name": "Dogecoin", "asset_type": AssetType.CRYPTO},
        ]
        stock_assets = [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "asset_type": AssetType.STOCK,
                "exchange": "NASDAQ",
            },
            {
                "symbol": "GOOGL",
                "name": "Alphabet Inc.",
                "asset_type": AssetType.STOCK,
                "exchange": "NASDAQ",
            },
            {
                "symbol": "MSFT",
                "name": "Microsoft Corporation",
                "asset_type": AssetType.STOCK,
                "exchange": "NASDAQ",
            },
            {
                "symbol": "AMZN",
                "name": "Amazon.com Inc.",
                "asset_type": AssetType.STOCK,
                "exchange": "NASDAQ",
            },
            {
                "symbol": "TSLA",
                "name": "Tesla Inc.",
                "asset_type": AssetType.STOCK,
                "exchange": "NASDAQ",
            },
            {
                "symbol": "META",
                "name": "Meta Platforms Inc.",
                "asset_type": AssetType.STOCK,
                "exchange": "NASDAQ",
            },
            {
                "symbol": "NVDA",
                "name": "NVIDIA Corporation",
                "asset_type": AssetType.STOCK,
                "exchange": "NASDAQ",
            },
            {
                "symbol": "JPM",
                "name": "JPMorgan Chase & Co.",
                "asset_type": AssetType.STOCK,
                "exchange": "NYSE",
            },
            {
                "symbol": "JNJ",
                "name": "Johnson & Johnson",
                "asset_type": AssetType.STOCK,
                "exchange": "NYSE",
            },
            {
                "symbol": "V",
                "name": "Visa Inc.",
                "asset_type": AssetType.STOCK,
                "exchange": "NYSE",
            },
        ]
        all_assets = crypto_assets + stock_assets
        for asset_data in all_assets:
            existing_asset = Asset.query.filter_by(symbol=asset_data["symbol"]).first()
            if not existing_asset:
                asset = Asset(
                    symbol=asset_data["symbol"],
                    name=asset_data["name"],
                    asset_type=asset_data["asset_type"],
                    exchange=asset_data.get("exchange"),
                    is_active=True,
                    is_tradeable=True,
                )
                db.session.add(asset)
        db.session.commit()
        logger.info("Default assets created successfully")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating default assets: {e}")


app = create_app()
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
