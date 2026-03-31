"""
Test Suite for QuantumVest Backend
Comprehensive tests for all backend components
"""

import json
from typing import Any

import pytest
from app import create_app
from auth import AuthService
from models import Asset, Portfolio, User, db
from portfolio_service import PortfolioService


@pytest.fixture
def app() -> Any:
    """Create test Flask application"""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app: Any) -> Any:
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers(app: Any) -> Any:
    """Create authentication headers for testing"""
    with app.app_context():
        user = User(
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
        )
        user.set_password("TestPassword123")
        db.session.add(user)
        db.session.commit()
        token = AuthService.generate_token(user.id)
        return {"Authorization": f"Bearer {token}"}


class TestAuthentication:
    """Test authentication functionality"""

    def test_user_registration(self, client: Any) -> Any:
        """Test user registration"""
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "NewPassword123",
            "first_name": "New",
            "last_name": "User",
        }
        response = client.post(
            "/api/v1/auth/register",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert response.status_code == 201
        result = json.loads(response.data)
        assert result["success"] is True
        assert "access_token" in result
        assert "user" in result

    def test_user_login(self, app: Any, client: Any) -> Any:
        """Test user login"""
        with app.app_context():
            user = User(username="logintest", email="login@example.com")
            user.set_password("LoginPassword123")
            db.session.add(user)
            db.session.commit()
        data = {"username": "logintest", "password": "LoginPassword123"}
        response = client.post(
            "/api/v1/auth/login", data=json.dumps(data), content_type="application/json"
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["success"] is True
        assert "access_token" in result

    def test_invalid_login(self, client: Any) -> Any:
        """Test invalid login credentials"""
        data = {"username": "nonexistent", "password": "wrongpassword"}
        response = client.post(
            "/api/v1/auth/login", data=json.dumps(data), content_type="application/json"
        )
        assert response.status_code == 401
        result = json.loads(response.data)
        assert result["success"] is False

    def test_protected_endpoint_without_token(self, client: Any) -> Any:
        """Test accessing protected endpoint without token"""
        response = client.get("/api/v1/auth/profile")
        assert response.status_code == 401

    def test_protected_endpoint_with_token(self, client: Any, auth_headers: Any) -> Any:
        """Test accessing protected endpoint with valid token"""
        response = client.get("/api/v1/auth/profile", headers=auth_headers)
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["success"] is True
        assert "user" in result


class TestPortfolioManagement:
    """Test portfolio management functionality"""

    def test_create_portfolio(self, client: Any, auth_headers: Any) -> Any:
        """Test portfolio creation"""
        data = {
            "name": "Test Portfolio",
            "description": "A test portfolio",
            "currency": "USD",
        }
        response = client.post(
            "/api/v1/portfolios",
            data=json.dumps(data),
            content_type="application/json",
            headers=auth_headers,
        )
        assert response.status_code == 201
        result = json.loads(response.data)
        assert result["success"] is True
        assert result["portfolio"]["name"] == "Test Portfolio"

    def test_get_portfolios(self, app: Any, client: Any, auth_headers: Any) -> Any:
        """Test getting user portfolios"""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            portfolio = Portfolio(
                user_id=user.id, name="Test Portfolio", description="Test description"
            )
            db.session.add(portfolio)
            db.session.commit()
        response = client.get("/api/v1/portfolios", headers=auth_headers)
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["success"] is True
        assert len(result["portfolios"]) >= 1

    def test_add_transaction(self, app: Any, client: Any, auth_headers: Any) -> Any:
        """Test adding transaction to portfolio"""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            asset = Asset(
                symbol="AAPL", name="Apple Inc.", asset_type="stock", is_active=True
            )
            db.session.add(asset)
            portfolio = Portfolio(user_id=user.id, name="Test Portfolio")
            db.session.add(portfolio)
            db.session.commit()
            portfolio_id = str(portfolio.id)
        data = {
            "asset_symbol": "AAPL",
            "transaction_type": "buy",
            "quantity": 10,
            "price": 150.0,
            "fees": 5.0,
        }
        response = client.post(
            f"/api/v1/portfolios/{portfolio_id}/transactions",
            data=json.dumps(data),
            content_type="application/json",
            headers=auth_headers,
        )
        assert response.status_code == 201
        result = json.loads(response.data)
        assert result["success"] is True


class TestDataEndpoints:
    """Test data fetching endpoints"""

    def test_health_check(self, client: Any) -> Any:
        """Test health check endpoint"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["status"] == "healthy"

    def test_search_assets(self, app: Any, client: Any, auth_headers: Any) -> Any:
        """Test asset search"""
        with app.app_context():
            assets = [
                Asset(
                    symbol="AAPL", name="Apple Inc.", asset_type="stock", is_active=True
                ),
                Asset(
                    symbol="BTC", name="Bitcoin", asset_type="crypto", is_active=True
                ),
                Asset(
                    symbol="ETH", name="Ethereum", asset_type="crypto", is_active=True
                ),
            ]
            for asset in assets:
                db.session.add(asset)
            db.session.commit()
        response = client.get("/api/v1/assets/search?q=Apple", headers=auth_headers)
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["success"] is True
        assert len(result["assets"]) >= 1
        assert any((asset["symbol"] == "AAPL" for asset in result["assets"]))


class TestRiskManagement:
    """Test risk management functionality"""

    def test_portfolio_service_creation(self, app: Any) -> Any:
        """Test portfolio service basic functionality"""
        with app.app_context():
            user = User(username="risktest", email="risk@example.com")
            user.set_password("RiskPassword123")
            db.session.add(user)
            db.session.commit()
            result = PortfolioService.create_portfolio(
                user_id=str(user.id),
                name="Risk Test Portfolio",
                description="Portfolio for risk testing",
            )
            assert result["success"] is True
            assert result["portfolio"]["name"] == "Risk Test Portfolio"


class TestValidation:
    """Test input validation"""

    def test_invalid_email_registration(self, client: Any) -> Any:
        """Test registration with invalid email"""
        data = {
            "username": "testuser",
            "email": "invalid-email",
            "password": "ValidPassword123",
        }
        response = client.post(
            "/api/v1/auth/register",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result["success"] is False
        assert "email" in result["error"].lower()

    def test_weak_password_registration(self, client: Any) -> Any:
        """Test registration with weak password"""
        data = {"username": "testuser", "email": "test@example.com", "password": "123"}
        response = client.post(
            "/api/v1/auth/register",
            data=json.dumps(data),
            content_type="application/json",
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result["success"] is False
        assert "password" in result["error"].lower()


class TestErrorHandling:
    """Test error handling"""

    def test_404_endpoint(self, client: Any) -> Any:
        """Test 404 error handling"""
        response = client.get("/api/v1/nonexistent")
        assert response.status_code == 404
        result = json.loads(response.data)
        assert result["success"] is False

    def test_invalid_json(self, client: Any) -> Any:
        """Test invalid JSON handling"""
        response = client.post(
            "/api/v1/auth/register",
            data="invalid json",
            content_type="application/json",
        )
        assert response.status_code == 400


class TestLegacyEndpoints:
    """Test legacy endpoint compatibility"""

    def test_legacy_health_check(self, client: Any) -> Any:
        """Test legacy health check endpoint"""
        response = client.get("/api/health")
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["status"] == "healthy"
        assert "message" in result

    def test_legacy_predict_endpoint(self, client: Any) -> Any:
        """Test legacy prediction endpoint"""
        data = {"asset": "BTC", "timeframe": "7d"}
        response = client.post(
            "/api/predict", data=json.dumps(data), content_type="application/json"
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["success"] is True
        assert "message" in result
        assert "new API endpoint" in result["message"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
