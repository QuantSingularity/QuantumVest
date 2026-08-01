"""
Shared pytest fixtures for the QuantumVest test suite.
"""

import pytest
from app import create_app
from app.core.auth import AuthService
from app.extensions import db as _db
from app.models.financial import Asset, AssetType, Portfolio, User


@pytest.fixture(scope="session")
def app():
    """Session-scoped Flask app in test mode."""
    application = create_app("testing")
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
