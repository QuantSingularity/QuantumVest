import pytest
from app.extensions import db as _db
from app.models.financial import (
    Asset,
    AssetType,
    Portfolio,
    PortfolioHolding,
)


@pytest.fixture
def seeded_portfolio(db, manager_user, market_data):
    portfolio = Portfolio(user_id=manager_user.id, name="AI Test")
    _db.session.add(portfolio)
    assets = {}
    for symbol, kind in (
        ("AAPL", AssetType.STOCK),
        ("MSFT", AssetType.STOCK),
        ("GOOGL", AssetType.STOCK),
    ):
        asset = Asset(symbol=symbol, name=symbol, asset_type=kind)
        _db.session.add(asset)
        assets[symbol] = asset
    _db.session.flush()
    for symbol, qty in (("AAPL", 10), ("MSFT", 5), ("GOOGL", 20)):
        _db.session.add(
            PortfolioHolding(
                portfolio_id=portfolio.id,
                asset_id=assets[symbol].id,
                quantity=qty,
                average_cost=100,
            )
        )
    _db.session.commit()
    return portfolio


class TestPredictions:
    def test_requires_auth(self, client, market_data):
        assert client.get("/api/v1/predictions/AAPL").status_code == 401

    def test_forecast_success(self, client, auth_headers, market_data):
        resp = client.get("/api/v1/predictions/AAPL?days=5", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert body["symbol"] == "AAPL"
        assert len(body["forecast"]) == 5
        first = body["forecast"][0]
        assert first["lower"] < first["predicted_price"] < first["upper"]
        assert body["direction"] in ("up", "down", "neutral")
        assert "directional_accuracy" in body["model"]["metrics"]
        assert isinstance(body["model"]["beats_naive"], bool)

    def test_model_reused_on_second_request(self, client, auth_headers, market_data):
        a = client.get("/api/v1/predictions/MSFT", headers=auth_headers).get_json()
        b = client.get("/api/v1/predictions/MSFT", headers=auth_headers).get_json()
        assert a["model"]["trained_at"] == b["model"]["trained_at"]

    def test_crypto_type_inferred_from_asset_table(self, client, auth_headers, market_data):
        _db.session.add(Asset(symbol="BTC", name="Bitcoin", asset_type=AssetType.CRYPTO))
        _db.session.commit()
        body = client.get("/api/v1/predictions/BTC?days=10", headers=auth_headers).get_json()
        assert body["asset_type"] == "crypto"

    def test_unknown_symbol_404(self, client, auth_headers, market_data):
        resp = client.get("/api/v1/predictions/ZZZZ", headers=auth_headers)
        assert resp.status_code == 404
        assert resp.get_json()["code"] == "no_data"

    def test_invalid_symbol_400(self, client, auth_headers, market_data):
        assert client.get("/api/v1/predictions/BAD$", headers=auth_headers).status_code == 400

    @pytest.mark.parametrize("days", ["0", "31", "abc"])
    def test_invalid_days_400(self, client, auth_headers, market_data, days):
        resp = client.get(f"/api/v1/predictions/AAPL?days={days}", headers=auth_headers)
        assert resp.status_code == 400

    def test_invalid_asset_type_400(self, client, auth_headers, market_data):
        resp = client.get("/api/v1/predictions/AAPL?asset_type=bond", headers=auth_headers)
        assert resp.status_code == 400

    def test_list_models_after_prediction(self, client, auth_headers, market_data):
        client.get("/api/v1/predictions/AAPL", headers=auth_headers)
        body = client.get("/api/v1/predictions/models?symbol=AAPL", headers=auth_headers).get_json()
        assert body["success"] is True
        assert [m["symbol"] for m in body["models"]] == ["AAPL"]

    def test_train_requires_admin(self, client, auth_headers, market_data):
        resp = client.post("/api/v1/predictions/AAPL/train", json={}, headers=auth_headers)
        assert resp.status_code == 403

    def test_admin_can_train(self, client, admin_headers, market_data):
        resp = client.post(
            "/api/v1/predictions/AAPL/train",
            json={"model_type": "xgboost"},
            headers=admin_headers,
        )
        assert resp.status_code == 201
        assert resp.get_json()["model"]["type"] == "xgboost"

    def test_train_rejects_deep_model_online(self, client, admin_headers, market_data):
        resp = client.post(
            "/api/v1/predictions/AAPL/train",
            json={"model_type": "lstm"},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_ai_disabled(self, app, client, auth_headers, market_data):
        app.config["AI_ENABLED"] = False
        try:
            assert client.get("/api/v1/predictions/AAPL", headers=auth_headers).status_code == 503
        finally:
            app.config["AI_ENABLED"] = True

    def test_health_reports_ai(self, client, market_data):
        body = client.get("/api/v1/health").get_json()
        assert body["services"]["ai_models"] is True


class TestOptimization:
    def test_optimize_returns_valid_allocation(self, client, manager_headers, seeded_portfolio):
        resp = client.post(
            f"/api/v1/portfolios/{seeded_portfolio.id}/optimize",
            json={"objective": "max_sharpe", "max_weight": 0.6},
            headers=manager_headers,
        )
        assert resp.status_code == 200
        opt = resp.get_json()["optimization"]
        weights = [r["optimal_weight"] for r in opt["recommendations"]]
        assert len(weights) == 3
        assert sum(weights) == pytest.approx(1.0, abs=0.01)
        assert max(weights) <= 0.6 + 1e-3
        assert opt["volatility"] > 0
        assert "var_95" in opt["risk"]
        current = sum(r["current_weight"] for r in opt["recommendations"])
        assert current == pytest.approx(1.0, abs=0.01)

    def test_default_objective_uses_risk_tolerance(self, client, manager_headers, seeded_portfolio):
        resp = client.post(
            f"/api/v1/portfolios/{seeded_portfolio.id}/optimize",
            json={"risk_tolerance": 0.1},
            headers=manager_headers,
        )
        assert resp.status_code == 200
        assert resp.get_json()["optimization"]["objective"] == "mean_variance"

    def test_unreachable_target_is_400(self, client, manager_headers, seeded_portfolio):
        resp = client.post(
            f"/api/v1/portfolios/{seeded_portfolio.id}/optimize",
            json={"target_return": 10},
            headers=manager_headers,
        )
        assert resp.status_code == 400
        assert "exceeds" in resp.get_json()["error"]

    def test_unknown_objective_is_400(self, client, manager_headers, seeded_portfolio):
        resp = client.post(
            f"/api/v1/portfolios/{seeded_portfolio.id}/optimize",
            json={"objective": "magic"},
            headers=manager_headers,
        )
        assert resp.status_code == 400

    def test_blends_ml_forecasts(self, client, manager_headers, seeded_portfolio):
        resp = client.post(
            f"/api/v1/portfolios/{seeded_portfolio.id}/optimize",
            json={"objective": "max_sharpe", "use_forecasts": True},
            headers=manager_headers,
        )
        assert resp.status_code == 200
        assert isinstance(resp.get_json()["optimization"]["forecast_assets"], list)

    def test_non_premium_forbidden(self, client, auth_headers, seeded_portfolio):
        resp = client.post(
            f"/api/v1/portfolios/{seeded_portfolio.id}/optimize", json={}, headers=auth_headers
        )
        assert resp.status_code == 403

    def test_other_users_portfolio_not_found(self, client, admin_headers, seeded_portfolio):
        resp = client.post(
            f"/api/v1/portfolios/{seeded_portfolio.id}/optimize", json={}, headers=admin_headers
        )
        assert resp.status_code == 404

    def test_single_holding_rejected(self, client, manager_headers, manager_user, market_data):
        portfolio = Portfolio(user_id=manager_user.id, name="Solo")
        asset = Asset(symbol="AAPL", name="AAPL", asset_type=AssetType.STOCK)
        _db.session.add_all([portfolio, asset])
        _db.session.flush()
        _db.session.add(
            PortfolioHolding(
                portfolio_id=portfolio.id, asset_id=asset.id, quantity=1, average_cost=1
            )
        )
        _db.session.commit()
        resp = client.post(
            f"/api/v1/portfolios/{portfolio.id}/optimize", json={}, headers=manager_headers
        )
        assert resp.status_code == 400


class TestPortfolioRisk:
    def test_risk_analysis(self, client, manager_headers, seeded_portfolio):
        resp = client.get(
            f"/api/v1/portfolios/{seeded_portfolio.id}/risk", headers=manager_headers
        )
        assert resp.status_code == 200
        risk = resp.get_json()["risk"]
        assert sum(risk["weights"].values()) == pytest.approx(1.0)
        assert risk["summary"]["var_95"] < 0
        assert "market_crash" in risk["stress_test"]
        assert sum(risk["risk_contributions"].values()) == pytest.approx(1.0)

    def test_missing_portfolio_404(self, client, manager_headers, market_data):
        resp = client.get("/api/v1/portfolios/nope/risk", headers=manager_headers)
        assert resp.status_code == 404

    def test_empty_portfolio_400(self, client, manager_headers, manager_user, market_data):
        portfolio = Portfolio(user_id=manager_user.id, name="Empty")
        _db.session.add(portfolio)
        _db.session.commit()
        resp = client.get(f"/api/v1/portfolios/{portfolio.id}/risk", headers=manager_headers)
        assert resp.status_code == 400
