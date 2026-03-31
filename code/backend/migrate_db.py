"""
Database Migration Script for QuantumVest
Initialize and migrate database schema
"""

import logging
import sys

from config import get_config
from flask import Flask
from flask_migrate import init, migrate, upgrade

logger = logging.getLogger(__name__)
from typing import Any

logger = get_logger(__name__)


def create_app() -> Any:
    """Create Flask app for migration"""
    app = Flask(__name__)
    config_class = get_config()
    app.config.from_object(config_class)
    db.init_app(app)
    return app


def init_database() -> Any:
    """Initialize database and migration repository"""
    app = create_app()
    with app.app_context():
        try:
            init()
            logger.info("Migration repository initialized successfully")
        except Exception as e:
            logger.info(f"Migration repository already exists or error: {e}")
        try:
            migrate(message="Initial migration")
            logger.info("Initial migration created successfully")
        except Exception as e:
            logger.info(f"Error creating migration: {e}")
        try:
            upgrade()
            logger.info("Database upgraded successfully")
        except Exception as e:
            logger.info(f"Error upgrading database: {e}")


def create_sample_data() -> Any:
    """Create sample data for development"""
    app = create_app()
    with app.app_context():
        from models import Asset, User

        try:
            if not User.query.filter_by(username="admin").first():
                admin_user = User(
                    username="admin",
                    email="admin@quantumvest.com",
                    first_name="Admin",
                    last_name="User",
                    subscription_tier="admin",
                    is_verified=True,
                )
                admin_user.set_password("AdminPassword123")
                db.session.add(admin_user)
            sample_assets = [
                {
                    "symbol": "SPY",
                    "name": "SPDR S&P 500 ETF",
                    "asset_type": "etf",
                    "exchange": "NYSE",
                },
                {
                    "symbol": "QQQ",
                    "name": "Invesco QQQ Trust",
                    "asset_type": "etf",
                    "exchange": "NASDAQ",
                },
                {
                    "symbol": "GLD",
                    "name": "SPDR Gold Shares",
                    "asset_type": "etf",
                    "exchange": "NYSE",
                },
                {
                    "symbol": "VTI",
                    "name": "Vanguard Total Stock Market ETF",
                    "asset_type": "etf",
                    "exchange": "NYSE",
                },
                {
                    "symbol": "BND",
                    "name": "Vanguard Total Bond Market ETF",
                    "asset_type": "etf",
                    "exchange": "NYSE",
                },
            ]
            for asset_data in sample_assets:
                if not Asset.query.filter_by(symbol=asset_data["symbol"]).first():
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
            logger.info("Sample data created successfully")
        except Exception as e:
            db.session.rollback()
            logger.info(f"Error creating sample data: {e}")


def reset_database() -> Any:
    """Reset database (WARNING: This will delete all data)"""
    app = create_app()
    with app.app_context():
        try:
            db.drop_all()
            db.create_all()
            logger.info("Database reset successfully")
            create_sample_data()
        except Exception as e:
            logger.info(f"Error resetting database: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.info("Usage: python migrate_db.py [init|sample|reset]")
        sys.exit(1)
    command = sys.argv[1]
    if command == "init":
        init_database()
    elif command == "sample":
        create_sample_data()
    elif command == "reset":
        confirm = input("This will delete all data. Are you sure? (yes/no): ")
        if confirm.lower() == "yes":
            reset_database()
        else:
            logger.info("Operation cancelled")
    else:
        logger.info("Unknown command. Use: init, sample, or reset")
