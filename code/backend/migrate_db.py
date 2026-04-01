"""
Database Migration Script for QuantumVest
Initialize and migrate database schema
"""

import logging
import sys
from typing import Any

from config import get_config
from flask import Flask
from flask_migrate import init, migrate, upgrade
from models import db

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def create_app() -> Any:
    """Create Flask app for migration"""
    app = Flask(__name__)
    config_class = get_config()
    app.config.from_object(config_class)
    db.init_app(app)
    return app


def init_database() -> None:
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
            logger.error(f"Error creating migration: {e}")
        try:
            upgrade()
            logger.info("Database upgraded successfully")
        except Exception as e:
            logger.error(f"Error upgrading database: {e}")


def reset_database() -> None:
    """Drop all tables and recreate (development only!)"""
    app = create_app()
    with app.app_context():
        env = app.config.get("ENV", "development")
        if env == "production":
            logger.error("Cannot reset database in production!")
            sys.exit(1)
        logger.warning("Dropping all database tables...")
        db.drop_all()
        db.create_all()
        logger.info("Database reset successfully")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        reset_database()
    else:
        init_database()
