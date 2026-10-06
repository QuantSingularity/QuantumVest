import jwt
import pytest
from app.core.auth import AuthService
from app.extensions import db as _db
from app.models.financial import Asset, AssetType, Portfolio
from config import DevelopmentConfig, ProductionConfig, get_config


def test_docker_env_uses_production_config():
    assert get_config("docker") is ProductionConfig


def test_production_config_has_pool_options_for_networked_db():
    assert isinstance(ProductionConfig.SQLALCHEMY_ENGINE_OPTIONS, dict)


def test_development_config_exposes_ai_settings():
    assert DevelopmentConfig.AI_ENABLED is True
    assert DevelopmentConfig.MODEL_PATH.startswith("/")


def test_jwt_signed_with_jwt_secret(app, test_user):
    app.config["JWT_SECRET_KEY"] = "a-distinct-jwt-signing-key-for-tests-only"
    try:
        token = AuthService.generate_token(test_user.id)
        payload = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        assert payload["user_id"] == str(test_user.id)
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        assert AuthService.verify_token(token) == str(test_user.id)
    finally:
        app.config["JWT_SECRET_KEY"] = app.config["SECRET_KEY"]


@pytest.fixture
def portfolio_with_asset(db, test_user):
    portfolio = Portfolio(user_id=test_user.id, name="Tx")
    asset = Asset(symbol="AAPL", name="Apple", asset_type=AssetType.STOCK)
    _db.session.add_all([portfolio, asset])
    _db.session.commit()
    return portfolio


@pytest.mark.parametrize(
    "payload",
    [
        {"quantity": 0, "price": 10},
        {"quantity": -5, "price": 10},
        {"quantity": 1, "price": -10},
        {"quantity": 1, "price": 10, "fees": -1},
    ],
)
def test_invalid_transaction_values_rejected(
    client, auth_headers, portfolio_with_asset, payload
):
    resp = client.post(
        f"/api/v1/portfolios/{portfolio_with_asset.id}/transactions",
        json={"asset_symbol": "AAPL", "transaction_type": "buy", **payload},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_failed_sell_leaves_no_transaction(client, auth_headers, portfolio_with_asset):
    from app.models.financial import Transaction

    resp = client.post(
        f"/api/v1/portfolios/{portfolio_with_asset.id}/transactions",
        json={
            "asset_symbol": "AAPL",
            "transaction_type": "sell",
            "quantity": 1,
            "price": 1,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert Transaction.query.count() == 0
