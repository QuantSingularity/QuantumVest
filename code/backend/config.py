"""
Configuration for QuantumVest Backend.
"""

import os
from datetime import timedelta
from typing import Any, Dict, Optional


def _engine_options(db_url: str) -> Dict[str, Any]:
    if db_url.startswith("sqlite"):
        return {}
    return {"pool_size": 10, "pool_recycle": 120, "pool_pre_ping": True}


class Config:
    SECRET_KEY: str = os.environ.get(
        "SECRET_KEY", "dev-secret-key-change-in-production"
    )
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL", "sqlite:///quantumvest.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: Dict[str, Any] = {}

    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(days=7)

    API_RATE_LIMIT: str = os.environ.get("API_RATE_LIMIT", "1000 per hour")
    API_PAGINATION_DEFAULT: int = 20
    API_PAGINATION_MAX: int = 100

    ALPHA_VANTAGE_API_KEY: Optional[str] = os.environ.get("ALPHA_VANTAGE_API_KEY")
    COINAPI_KEY: Optional[str] = os.environ.get("COINAPI_KEY")

    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    CACHE_TYPE: str = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT: int = 300

    UPLOAD_FOLDER: str = os.environ.get("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
    BCRYPT_LOG_ROUNDS: int = int(os.environ.get("BCRYPT_LOG_ROUNDS", "12"))

    MAX_LOGIN_ATTEMPTS: int = int(os.environ.get("MAX_LOGIN_ATTEMPTS", "5"))
    ACCOUNT_LOCKOUT_MINUTES: int = int(os.environ.get("ACCOUNT_LOCKOUT_MINUTES", "30"))

    MODEL_PATH: str = os.environ.get("MODEL_PATH", "resources/models")
    DATA_PATH: str = os.environ.get("DATA_PATH", "resources/data")

    # ─── Blockchain (Web3 gateway to ../blockchain) ─────────────────────
    # See app/services/blockchain.py. Everything here is optional: with no
    # WEB3_PROVIDER_URI reachable, BlockchainService degrades gracefully
    # and the rest of the app is unaffected.
    BLOCKCHAIN_ENABLED: bool = (
        os.environ.get("BLOCKCHAIN_ENABLED", "true").lower() == "true"
    )
    WEB3_PROVIDER_URI: str = os.environ.get(
        "WEB3_PROVIDER_URI", "http://localhost:8545"
    )

    # Directory of Truffle build artifacts (ABI + per-network deployed
    # address), as produced by `truffle compile` / `truffle migrate` in
    # ../blockchain. Defaults to the sibling blockchain/build/contracts
    # directory for local (non-Docker) development; docker-compose.yml
    # overrides this to a shared volume populated by the blockchain-migrate
    # service.
    BLOCKCHAIN_ARTIFACTS_DIR: str = os.environ.get(
        "BLOCKCHAIN_ARTIFACTS_DIR",
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..",
            "blockchain",
            "build",
            "contracts",
        ),
    )

    # Explicit contract address overrides. Take precedence over whatever a
    # Truffle artifact says for the connected network - required for any
    # network the artifacts weren't built against (e.g. a real testnet/
    # mainnet deployment where build/ isn't shipped alongside the backend).
    DATA_TRACKING_CONTRACT_ADDRESS: Optional[str] = os.environ.get(
        "DATA_TRACKING_CONTRACT_ADDRESS"
    )
    TREND_ANALYSIS_CONTRACT_ADDRESS: Optional[str] = os.environ.get(
        "TREND_ANALYSIS_CONTRACT_ADDRESS"
    )
    QUANTUMVEST_TOKEN_CONTRACT_ADDRESS: Optional[str] = os.environ.get(
        "QUANTUMVEST_TOKEN_CONTRACT_ADDRESS"
    )
    QUANTUMVEST_ORACLE_CONTRACT_ADDRESS: Optional[str] = os.environ.get(
        "QUANTUMVEST_ORACLE_CONTRACT_ADDRESS"
    )

    # Private key for the account that signs write transactions (e.g.
    # DataTracking.addDataPoint). Must be the DataTracking contract's
    # owner account. Never set this to a real-funds key outside a secrets
    # manager; unset by default so write operations are disabled until
    # deliberately configured.
    BLOCKCHAIN_PRIVATE_KEY: Optional[str] = os.environ.get("BLOCKCHAIN_PRIVATE_KEY")


class DevelopmentConfig(Config):
    DEBUG: bool = True
    TESTING: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DEV_DATABASE_URL", "sqlite:///quantumvest_dev.db"
    )
    BCRYPT_LOG_ROUNDS: int = 4


class TestingConfig(Config):
    TESTING: bool = True
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    WTF_CSRF_ENABLED: bool = False
    BCRYPT_LOG_ROUNDS: int = 4
    API_RATE_LIMIT: Optional[str] = None


class ProductionConfig(Config):
    DEBUG: bool = False
    TESTING: bool = False

    @classmethod
    def init_app(cls, app: Any) -> None:
        import logging
        from logging.handlers import SysLogHandler

        handler = SysLogHandler()
        handler.setLevel(logging.WARNING)
        app.logger.addHandler(handler)


_config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config(env: Optional[str] = None) -> type:
    if env is None:
        env = os.environ.get("FLASK_ENV", "development")
    return _config_map.get(env, _config_map["default"])
