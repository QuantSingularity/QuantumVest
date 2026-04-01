"""
Configuration for QuantumVest Backend
Comprehensive configuration management with environment-specific settings
"""

import os
from datetime import timedelta
from typing import Any, Optional


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL") or "sqlite:///quantumvest_dev.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "pool_recycle": 120,
        "pool_pre_ping": True,
    }
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    API_RATE_LIMIT = os.environ.get("API_RATE_LIMIT", "1000 per hour")
    API_PAGINATION_DEFAULT = 20
    API_PAGINATION_MAX = 100
    ALPHA_VANTAGE_API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY")
    COINAPI_KEY = os.environ.get("COINAPI_KEY")
    YAHOO_FINANCE_API_KEY = os.environ.get("YAHOO_FINANCE_API_KEY")
    WEB3_PROVIDER_URL = os.environ.get(
        "WEB3_PROVIDER_URL", "https://mainnet.infura.io/v3/your-project-id"
    )
    ETHEREUM_NETWORK = os.environ.get("ETHEREUM_NETWORK", "mainnet")
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = REDIS_URL
    CACHE_DEFAULT_TIMEOUT = 300
    CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
    CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", REDIS_URL)
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() in ["true", "on", "1"]
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
    BCRYPT_LOG_ROUNDS = int(os.environ.get("BCRYPT_LOG_ROUNDS", "12"))
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
    LOG_FILE = os.environ.get("LOG_FILE", "quantumvest.log")
    MODEL_PATH = os.environ.get("MODEL_PATH", "../ai_models/")
    PREDICTION_CACHE_TTL = int(os.environ.get("PREDICTION_CACHE_TTL", "3600"))
    ENABLE_PROFILING = os.environ.get("ENABLE_PROFILING", "false").lower() == "true"
    SLOW_QUERY_THRESHOLD = float(os.environ.get("SLOW_QUERY_THRESHOLD", "0.5"))
    ENABLE_PORTFOLIO_OPTIMIZATION = (
        os.environ.get("ENABLE_PORTFOLIO_OPTIMIZATION", "true").lower() == "true"
    )
    ENABLE_REAL_TIME_DATA = (
        os.environ.get("ENABLE_REAL_TIME_DATA", "true").lower() == "true"
    )
    ENABLE_BLOCKCHAIN_FEATURES = (
        os.environ.get("ENABLE_BLOCKCHAIN_FEATURES", "false").lower() == "true"
    )
    ENABLE_ADVANCED_ANALYTICS = (
        os.environ.get("ENABLE_ADVANCED_ANALYTICS", "true").lower() == "true"
    )
    MAX_LOGIN_ATTEMPTS = int(os.environ.get("MAX_LOGIN_ATTEMPTS", "5"))
    ACCOUNT_LOCKOUT_MINUTES = int(os.environ.get("ACCOUNT_LOCKOUT_MINUTES", "30"))


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DEV_DATABASE_URL") or "sqlite:///quantumvest_dev.db"
    )
    SQLALCHEMY_ENGINE_OPTIONS = {}
    BCRYPT_LOG_ROUNDS = 4
    CACHE_TYPE = "SimpleCache"
    ENABLE_PORTFOLIO_OPTIMIZATION = True
    ENABLE_REAL_TIME_DATA = True
    ENABLE_BLOCKCHAIN_FEATURES = True
    ENABLE_ADVANCED_ANALYTICS = True


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    WTF_CSRF_ENABLED = False
    BCRYPT_LOG_ROUNDS = 4
    CACHE_TYPE = "SimpleCache"
    API_RATE_LIMIT: Optional[str] = None


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False

    @classmethod
    def init_app(cls, app: Any) -> None:
        import logging
        from logging.handlers import SysLogHandler

        syslog_handler = SysLogHandler()
        syslog_handler.setLevel(logging.WARNING)
        app.logger.addHandler(syslog_handler)


class DockerConfig(ProductionConfig):
    @classmethod
    def init_app(cls, app: Any) -> None:
        ProductionConfig.init_app(app)
        import logging
        import sys

        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        app.logger.addHandler(handler)


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "docker": DockerConfig,
    "default": DevelopmentConfig,
}


def get_config() -> type:
    env = os.environ.get("FLASK_ENV", "development")
    return config.get(env, config["default"])
