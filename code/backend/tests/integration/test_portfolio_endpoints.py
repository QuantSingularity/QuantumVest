"""Integration tests - portfolio, transaction, watchlist endpoints."""

import json

from app.extensions import db as _db
from app.models.financial import Portfolio


class TestPortfolioEndpoints:
    def test_create_portfolio(self, client, auth_headers):
        resp = client.post(
            "/api/v1/portfolios",
            data=json.dumps({"name": "My Portfolio", "description": "Test"}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["success"] is True
        assert body["portfolio"]["name"] == "My Portfolio"

    def test_create_portfolio_missing_name(self, client, auth_headers):
        resp = client.post(
            "/api/v1/portfolios",
            data=json.dumps({"description": "No name"}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_create_portfolio_unauthenticated(self, client):
        resp = client.post(
            "/api/v1/portfolios",
            data=json.dumps({"name": "Unauthorized"}),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_get_portfolios_empty(self, client, auth_headers):
        resp = client.get("/api/v1/portfolios", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert isinstance(body["portfolios"], list)

    def test_get_portfolios_with_data(self, client, auth_headers, sample_portfolio):
        resp = client.get("/api/v1/portfolios", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert len(body["portfolios"]) >= 1

    def test_get_portfolio_details(self, client, auth_headers, sample_portfolio):
        resp = client.get(
            f"/api/v1/portfolios/{sample_portfolio.id}", headers=auth_headers
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert body["portfolio"]["name"] == "Test Portfolio"
        assert "holdings" in body["portfolio"]

    def test_get_portfolio_not_found(self, client, auth_headers):
        resp = client.get(
            "/api/v1/portfolios/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_delete_portfolio(self, client, auth_headers, app, test_user):
        with app.app_context():
            p = Portfolio(user_id=test_user.id, name="To Delete")
            _db.session.add(p)
            _db.session.commit()
            pid = str(p.id)

        resp = client.delete(f"/api/v1/portfolios/{pid}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.get_json()["success"] is True

    def test_delete_nonexistent_portfolio(self, client, auth_headers):
        resp = client.delete(
            "/api/v1/portfolios/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestTransactionEndpoints:
    def test_add_buy_transaction(
        self, client, auth_headers, sample_portfolio, sample_asset
    ):
        resp = client.post(
            f"/api/v1/portfolios/{sample_portfolio.id}/transactions",
            data=json.dumps(
                {
                    "asset_symbol": "AAPL",
                    "transaction_type": "buy",
                    "quantity": 10,
                    "price": 150.0,
                    "fees": 5.0,
                }
            ),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["success"] is True
        assert body["transaction"]["transaction_type"] == "buy"
        assert body["transaction"]["quantity"] == 10.0

    def test_add_transaction_missing_fields(
        self, client, auth_headers, sample_portfolio
    ):
        resp = client.post(
            f"/api/v1/portfolios/{sample_portfolio.id}/transactions",
            data=json.dumps({"asset_symbol": "AAPL"}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_add_transaction_unknown_asset(
        self, client, auth_headers, sample_portfolio
    ):
        resp = client.post(
            f"/api/v1/portfolios/{sample_portfolio.id}/transactions",
            data=json.dumps(
                {
                    "asset_symbol": "ZZZZ",
                    "transaction_type": "buy",
                    "quantity": 1,
                    "price": 50.0,
                }
            ),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_get_transactions_empty(self, client, auth_headers, sample_portfolio):
        resp = client.get(
            f"/api/v1/portfolios/{sample_portfolio.id}/transactions",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert isinstance(body["transactions"], list)

    def test_get_transactions_pagination(self, client, auth_headers, sample_portfolio):
        resp = client.get(
            f"/api/v1/portfolios/{sample_portfolio.id}/transactions?page=1&per_page=5",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert "page" in body
        assert "per_page" in body

    def test_sell_without_holdings_fails(
        self, client, auth_headers, sample_portfolio, sample_asset
    ):
        resp = client.post(
            f"/api/v1/portfolios/{sample_portfolio.id}/transactions",
            data=json.dumps(
                {
                    "asset_symbol": "AAPL",
                    "transaction_type": "sell",
                    "quantity": 10,
                    "price": 150.0,
                }
            ),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_invalid_transaction_type(
        self, client, auth_headers, sample_portfolio, sample_asset
    ):
        resp = client.post(
            f"/api/v1/portfolios/{sample_portfolio.id}/transactions",
            data=json.dumps(
                {
                    "asset_symbol": "AAPL",
                    "transaction_type": "borrow",
                    "quantity": 5,
                    "price": 100.0,
                }
            ),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_portfolio_performance(self, client, auth_headers, sample_portfolio):
        resp = client.get(
            f"/api/v1/portfolios/{sample_portfolio.id}/performance",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "performance" in body


class TestAssetEndpoints:
    def test_list_assets(self, client, auth_headers):
        resp = client.get("/api/v1/assets", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert "assets" in body
        assert "total" in body

    def test_list_assets_pagination(self, client, auth_headers):
        resp = client.get("/api/v1/assets?page=1&per_page=5", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["per_page"] == 5

    def test_search_assets(self, client, auth_headers):
        resp = client.get("/api/v1/assets/search?q=Apple", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert isinstance(body["assets"], list)

    def test_search_assets_empty_query(self, client, auth_headers):
        resp = client.get("/api/v1/assets/search", headers=auth_headers)
        assert resp.status_code == 400

    def test_list_assets_unauthenticated(self, client):
        resp = client.get("/api/v1/assets")
        assert resp.status_code == 401


class TestWatchlistEndpoints:
    def test_create_watchlist(self, client, auth_headers):
        resp = client.post(
            "/api/v1/watchlists",
            data=json.dumps({"name": "Tech Picks"}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["success"] is True
        assert body["watchlist"]["name"] == "Tech Picks"

    def test_get_watchlists(self, client, auth_headers):
        resp = client.get("/api/v1/watchlists", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True
        assert isinstance(body["watchlists"], list)

    def test_add_item_to_watchlist(self, client, auth_headers, sample_asset):
        create_resp = client.post(
            "/api/v1/watchlists",
            data=json.dumps({"name": "My List"}),
            content_type="application/json",
            headers=auth_headers,
        )
        wl_id = create_resp.get_json()["watchlist"]["id"]

        resp = client.post(
            f"/api/v1/watchlists/{wl_id}/items",
            data=json.dumps({"asset_symbol": "AAPL"}),
            content_type="application/json",
            headers=auth_headers,
        )
        assert resp.status_code == 201

    def test_add_duplicate_item_returns_409(self, client, auth_headers, sample_asset):
        create_resp = client.post(
            "/api/v1/watchlists",
            data=json.dumps({"name": "Dedup List"}),
            content_type="application/json",
            headers=auth_headers,
        )
        wl_id = create_resp.get_json()["watchlist"]["id"]

        for _ in range(2):
            resp = client.post(
                f"/api/v1/watchlists/{wl_id}/items",
                data=json.dumps({"asset_symbol": "AAPL"}),
                content_type="application/json",
                headers=auth_headers,
            )
        assert resp.status_code == 409

    def test_delete_watchlist(self, client, auth_headers):
        create_resp = client.post(
            "/api/v1/watchlists",
            data=json.dumps({"name": "To Delete"}),
            content_type="application/json",
            headers=auth_headers,
        )
        wl_id = create_resp.get_json()["watchlist"]["id"]
        resp = client.delete(f"/api/v1/watchlists/{wl_id}", headers=auth_headers)
        assert resp.status_code == 200
