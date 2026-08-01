"""Integration tests - health check and risk endpoints."""

import json

import numpy as np


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200

    def test_health_body_structure(self, client):
        body = client.get("/api/v1/health").get_json()
        assert "status" in body
        assert "version" in body
        assert "timestamp" in body
        assert "services" in body

    def test_health_status_value(self, client):
        body = client.get("/api/v1/health").get_json()
        assert body["status"] in ("healthy", "degraded")

    def test_health_version(self, client):
        body = client.get("/api/v1/health").get_json()
        assert body["version"] == "2.0.0"


class TestRiskEndpoints:
    def _returns_payload(self, n: int = 300):
        np.random.seed(42)
        returns = np.random.normal(0.001, 0.02, n).tolist()
        return returns

    def test_var_endpoint_historical(self, client, auth_headers):
        resp = client.post(
            "/api/v1/risk/var",
            data=json.dumps(
                {"returns": self._returns_payload(), "method": "historical"}
            ),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert body["var"] < 0
        assert body["cvar"] <= body["var"]

    def test_var_endpoint_parametric(self, client, auth_headers):
        resp = client.post(
            "/api/v1/risk/var",
            data=json.dumps(
                {"returns": self._returns_payload(), "method": "parametric"}
            ),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["var"] < 0

    def test_var_endpoint_monte_carlo(self, client, auth_headers):
        resp = client.post(
            "/api/v1/risk/var",
            data=json.dumps(
                {"returns": self._returns_payload(), "method": "monte_carlo"}
            ),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["var"] < 0

    def test_var_missing_returns(self, client, auth_headers):
        resp = client.post(
            "/api/v1/risk/var",
            data=json.dumps({"method": "historical"}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_var_too_few_points(self, client, auth_headers):
        resp = client.post(
            "/api/v1/risk/var",
            data=json.dumps({"returns": [0.01, 0.02, -0.01]}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_metrics_endpoint(self, client, auth_headers):
        resp = client.post(
            "/api/v1/risk/metrics",
            data=json.dumps({"returns": self._returns_payload()}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        metrics = body["metrics"]
        assert "annualized_return" in metrics
        assert "volatility" in metrics
        assert "sharpe_ratio" in metrics
        assert "max_drawdown" in metrics

    def test_metrics_with_benchmark(self, client, auth_headers):
        returns = self._returns_payload()
        benchmark = self._returns_payload(300)
        resp = client.post(
            "/api/v1/risk/metrics",
            data=json.dumps({"returns": returns, "benchmark_returns": benchmark}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        metrics = resp.get_json()["metrics"]
        assert "beta" in metrics
        assert "alpha" in metrics

    def test_metrics_unauthenticated(self, client):
        resp = client.post(
            "/api/v1/risk/metrics",
            data=json.dumps({"returns": self._returns_payload()}),
            content_type="application/json",
        )
        assert resp.status_code == 401
