from typing import Any

import pytest
from app import app


@pytest.fixture
def client() -> Any:
    app.config["TESTING"] = True
    return app.test_client()


def test_health_endpoint(client: Any) -> Any:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json["status"] == "healthy"


def test_prediction_endpoint_integration(client: Any) -> Any:
    response = client.post(
        "/api/predict",
        json={"open": 150.25, "high": 152.3, "low": 149.5, "volume": 5000000},
    )
    assert response.status_code == 200
    assert "prediction" in response.json
