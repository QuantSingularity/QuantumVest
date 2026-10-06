"""
Shared pytest fixtures for the QuantumVest test suite.
"""

import tempfile

import numpy as np
import pandas as pd
import pytest
from app import create_app
from app.core.auth import AuthService
from app.extensions import db as _db
from app.models.financial import Asset, AssetType, Portfolio, User


@pytest.fixture(scope="session")
def app():
    """Session-scoped Flask app in test mode."""
    application = create_app("testing")
    workdir = tempfile.mkdtemp(prefix="qv-test-")
    application.config["MODEL_PATH"] = workdir + "/models"
    application.config["DATA_PATH"] = workdir + "/data"
    application.extensions.pop("quantumvest_ai", None)
    ctx = application.app_context()
    ctx.push()
    yield application
    ctx.pop()


@pytest.fixture(scope="function")
def db(app):
    """Function-scoped DB - fresh tables per test."""
    _db.create_all()
    yield _db
    _db.session.remove()
    _db.drop_all()


@pytest.fixture(scope="function")
def client(app, db):
    return app.test_client()


@pytest.fixture(scope="function")
def test_user(db):
    user = User(
        username="testuser",
        email="test@quantumvest.io",
        first_name="Test",
        last_name="User",
    )
    user.set_password("TestPassword123")
    _db.session.add(user)
    _db.session.commit()
    return user


@pytest.fixture(scope="function")
def admin_user(db):
    from app.models.financial import UserRole

    user = User(
        username="adminuser",
        email="admin@quantumvest.io",
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
    )
    user.set_password("AdminPassword123!")
    _db.session.add(user)
    _db.session.commit()
    return user


@pytest.fixture(scope="function")
def auth_headers(app, test_user):
    """Bearer-token headers for test_user."""
    token = AuthService.generate_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def sample_asset(db):
    asset = Asset(
        symbol="AAPL",
        name="Apple Inc.",
        asset_type=AssetType.STOCK,
        exchange="NASDAQ",
        is_active=True,
        is_tradeable=True,
    )
    _db.session.add(asset)
    _db.session.commit()
    return asset


@pytest.fixture(scope="function")
def sample_portfolio(db, test_user):
    portfolio = Portfolio(
        user_id=test_user.id,
        name="Test Portfolio",
        description="A unit-test portfolio",
    )
    _db.session.add(portfolio)
    _db.session.commit()
    return portfolio


def synthetic_ohlcv(seed: int = 0, n: int = 420, freq: str = "B") -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    idx = pd.date_range(end="2026-09-30", periods=n, freq=freq)
    rets = rng.normal(0.0004, 0.014, n)
    close = 100 * np.exp(np.cumsum(rets))
    open_ = close * np.exp(rng.normal(0, 0.003, n))
    high = np.maximum(open_, close) * 1.004
    low = np.minimum(open_, close) * 0.996
    volume = rng.integers(1_000_000, 4_000_000, n).astype(float)
    return pd.DataFrame(
        {
            "timestamp": idx,
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        }
    )


@pytest.fixture(scope="function")
def market_data(app, monkeypatch):
    from ai_models import DataError
    from app.services.ai import AIService, get_ai_service

    app.extensions.pop("quantumvest_ai", None)
    known = {"AAPL": 1, "MSFT": 2, "GOOGL": 3, "BTC": 4}

    def provider(self, symbol, asset_type, refresh):
        if symbol not in known:
            raise DataError(f"No market data available for {symbol}")
        if symbol == "THIN":
            return synthetic_ohlcv(9, 60)
        return synthetic_ohlcv(
            known[symbol], freq="D" if asset_type == "crypto" else "B"
        )

    monkeypatch.setattr(AIService, "_load_market_data", provider)
    service = get_ai_service()
    yield service
    app.extensions.pop("quantumvest_ai", None)


@pytest.fixture(scope="function")
def manager_user(db):
    from app.models.financial import UserRole

    user = User(
        username="manager",
        email="manager@quantumvest.io",
        first_name="Port",
        last_name="Manager",
        role=UserRole.PORTFOLIO_MANAGER,
    )
    user.set_password("ManagerPass123")
    _db.session.add(user)
    _db.session.commit()
    return user


@pytest.fixture(scope="function")
def manager_headers(app, manager_user):
    return {"Authorization": f"Bearer {AuthService.generate_token(manager_user.id)}"}


@pytest.fixture(scope="function")
def admin_headers(app, admin_user):
    return {"Authorization": f"Bearer {AuthService.generate_token(admin_user.id)}"}
