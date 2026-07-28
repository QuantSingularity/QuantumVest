"""
QuantumVest Flask application factory.
"""

import logging
import os
import time

from config import get_config
from flask import Flask, jsonify, request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def create_app(config_name: str = None) -> Flask:
    """Application factory — accepts an optional config name."""
    app = Flask(__name__, static_folder=None)

    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    config_class = get_config(config_name)
    app.config.from_object(config_class)

    # Initialise extensions
    from app.extensions import cache, cors, db, migrate

    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app)
    cors.init_app(app, origins=app.config.get("CORS_ORIGINS", ["*"]))

    # Register blueprints
    from app.api.v1.routes import api_bp

    app.register_blueprint(api_bp)

    # ---------- Prometheus metrics ----------
    # infrastructure/monitoring/prometheus-config.yaml and
    # prometheus-local.yml both scrape this backend for metrics, and its
    # alert rules reference http_requests_total / http_request_duration_seconds
    # by name, so these need to match exactly.
    from prometheus_client import (
        CONTENT_TYPE_LATEST,
        Counter,
        Histogram,
        generate_latest,
    )

    http_requests_total = Counter(
        "http_requests_total",
        "Total HTTP requests",
        ["method", "endpoint", "status"],
    )
    http_request_duration_seconds = Histogram(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        ["method", "endpoint"],
    )

    @app.before_request
    def _start_timer():
        request._metrics_start_time = time.time()

    @app.after_request
    def _record_metrics(response):
        endpoint = request.url_rule.rule if request.url_rule else "unmatched"
        if endpoint != "/metrics":
            http_requests_total.labels(
                method=request.method, endpoint=endpoint, status=response.status_code
            ).inc()
            start = getattr(request, "_metrics_start_time", None)
            if start is not None:
                http_request_duration_seconds.labels(
                    method=request.method, endpoint=endpoint
                ).observe(time.time() - start)
        return response

    @app.route("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

    # Create tables & seed default assets
    with app.app_context():
        try:
            db.create_all()
            _seed_default_assets()
        except Exception as exc:
            logger.error("DB initialisation error: %s", exc)

    # ---------- error handlers ----------
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        from app.extensions import db as _db

        _db.session.rollback()
        return jsonify({"success": False, "error": "Internal server error"}), 500

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({"success": False, "error": "Rate limit exceeded"}), 429

    return app


# ---------------------------------------------------------------------------


def _seed_default_assets() -> None:
    from app.extensions import db
    from app.models.financial import Asset, AssetType

    crypto = [
        ("BTC", "Bitcoin"),
        ("ETH", "Ethereum"),
        ("XRP", "XRP"),
        ("LTC", "Litecoin"),
        ("ADA", "Cardano"),
        ("DOT", "Polkadot"),
        ("LINK", "Chainlink"),
        ("DOGE", "Dogecoin"),
    ]
    stocks = [
        ("AAPL", "Apple Inc.", "NASDAQ"),
        ("GOOGL", "Alphabet Inc.", "NASDAQ"),
        ("MSFT", "Microsoft Corporation", "NASDAQ"),
        ("AMZN", "Amazon.com Inc.", "NASDAQ"),
        ("TSLA", "Tesla Inc.", "NASDAQ"),
        ("META", "Meta Platforms Inc.", "NASDAQ"),
        ("NVDA", "NVIDIA Corporation", "NASDAQ"),
        ("JPM", "JPMorgan Chase & Co.", "NYSE"),
    ]

    try:
        for symbol, name in crypto:
            if not Asset.query.filter_by(symbol=symbol).first():
                db.session.add(
                    Asset(
                        symbol=symbol,
                        name=name,
                        asset_type=AssetType.CRYPTO,
                        is_active=True,
                        is_tradeable=True,
                    )
                )
        for symbol, name, exchange in stocks:
            if not Asset.query.filter_by(symbol=symbol).first():
                db.session.add(
                    Asset(
                        symbol=symbol,
                        name=name,
                        asset_type=AssetType.STOCK,
                        exchange=exchange,
                        is_active=True,
                        is_tradeable=True,
                    )
                )
        db.session.commit()
        logger.info("Default assets seeded.")
    except Exception as exc:
        db.session.rollback()
        logger.error("Error seeding assets: %s", exc)
