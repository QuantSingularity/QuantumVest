"""Integration tests - blockchain endpoints.

No live chain is assumed to run in CI, so most of these exercise the (very
real) graceful-degradation behavior over HTTP, plus auth/role enforcement.
WEB3_PROVIDER_URI is explicitly pointed at an unreachable port for the
"disconnected" cases so the outcome doesn't depend on whether a chain
happens to be running wherever the suite executes (e.g. a developer's own
local ganache instance). See tests/unit/test_blockchain.py for mocked
"connected" success-path coverage.
"""

import json

import pytest


@pytest.fixture
def no_chain(app):
    """Guarantees BlockchainService sees no reachable provider."""
    original = app.config.get("WEB3_PROVIDER_URI")
    app.config["WEB3_PROVIDER_URI"] = "http://127.0.0.1:1"
    yield
    app.config["WEB3_PROVIDER_URI"] = original


class TestBlockchainStatus:
    def test_requires_auth(self, client):
        resp = client.get("/api/v1/blockchain/status")
        assert resp.status_code == 401

    def test_reports_disconnected_without_a_live_chain(
        self, client, auth_headers, no_chain
    ):
        resp = client.get("/api/v1/blockchain/status", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert body["connected"] is False


class TestBlockchainTrend:
    def test_requires_auth(self, client):
        resp = client.get("/api/v1/blockchain/trend")
        assert resp.status_code == 401

    def test_returns_502_without_a_live_chain(self, client, auth_headers, no_chain):
        resp = client.get("/api/v1/blockchain/trend", headers=auth_headers)
        assert resp.status_code == 502
        assert resp.get_json()["success"] is False


class TestBlockchainMarketData:
    def test_get_requires_auth(self, client):
        resp = client.get("/api/v1/blockchain/market-data/ETH")
        assert resp.status_code == 401

    def test_get_returns_502_without_a_live_chain(self, client, auth_headers, no_chain):
        resp = client.get("/api/v1/blockchain/market-data/ETH", headers=auth_headers)
        assert resp.status_code == 502

    def test_post_requires_auth(self, client):
        resp = client.post(
            "/api/v1/blockchain/market-data",
            data=json.dumps({"ticker": "ETH", "price": 2500, "volume": 10}),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_post_requires_admin(self, client, auth_headers):
        """test_user (conftest.py) has the default, non-admin role."""
        resp = client.post(
            "/api/v1/blockchain/market-data",
            data=json.dumps({"ticker": "ETH", "price": 2500, "volume": 10}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 403

    def test_post_missing_fields(self, app, client, admin_user):
        from app.core.auth import AuthService

        token = AuthService.generate_token(admin_user.id)
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.post(
            "/api/v1/blockchain/market-data",
            data=json.dumps({"ticker": "ETH"}),
            content_type="application/json",
            headers=headers,
        )
        assert resp.status_code == 400

    def test_post_as_admin_without_a_live_chain(
        self, app, client, admin_user, no_chain
    ):
        from app.core.auth import AuthService

        token = AuthService.generate_token(admin_user.id)
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.post(
            "/api/v1/blockchain/market-data",
            data=json.dumps({"ticker": "ETH", "price": 2500, "volume": 10}),
            content_type="application/json",
            headers=headers,
        )
        # Graceful degradation, not a 500 crash.
        assert resp.status_code == 502


class TestBlockchainTokenBalance:
    def test_requires_auth(self, client):
        resp = client.get(
            "/api/v1/blockchain/token/balance/0x0000000000000000000000000000000000dEaD"
        )
        assert resp.status_code == 401

    def test_returns_400_without_a_live_chain(self, client, auth_headers, no_chain):
        # Contract unavailable is surfaced the same way as any other
        # lookup failure for this address-keyed read.
        resp = client.get(
            "/api/v1/blockchain/token/balance/0x0000000000000000000000000000000000dEaD",
            headers=auth_headers,
        )
        assert resp.status_code == 400


class TestBlockchainOraclePrice:
    def test_requires_auth(self, client):
        resp = client.get(
            "/api/v1/blockchain/oracle/0x0000000000000000000000000000000000dEaD"
        )
        assert resp.status_code == 401

    def test_returns_404_without_a_live_chain(self, client, auth_headers, no_chain):
        resp = client.get(
            "/api/v1/blockchain/oracle/0x0000000000000000000000000000000000dEaD",
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestHealthIncludesBlockchain:
    def test_health_has_blockchain_flag(self, client, no_chain):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        body = resp.get_json()
        assert "blockchain" in body["services"]
        # No live chain - must not affect overall health status.
        assert body["status"] == "healthy"
