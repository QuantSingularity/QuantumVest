from typing import Any

import pytest
from app import app


@pytest.fixture
def client() -> Any:
    app.config["TESTING"] = True
    return app.test_client()


def test_prediction_endpoint(client: Any) -> Any:
    response = client.post(
        "/api/predict",
        json={"open": 150.25, "high": 152.3, "low": 149.5, "volume": 5000000},
    )
    assert response.status_code == 200
    assert "prediction" in response.json


def test_optimization_endpoint(client: Any) -> Any:
    response = client.post(
        "/api/optimize",
        json={
            "assets": ["BTC", "ETH", "SOL"],
            "returns": [0.05, 0.07, 0.09],
            "volatilities": [0.2, 0.25, 0.3],
            "risk_tolerance": 0.5,
        },
    )
    assert response.status_code == 200
    assert "optimized_weights" in response.json


def test_prediction_endpoint_invalid_input(client: Any) -> Any:
    response = client.post(
        "/api/predict",
        json={"open": "invalid", "high": 152.3, "low": 149.5, "volume": 5000000},
    )
    assert response.status_code == 400
