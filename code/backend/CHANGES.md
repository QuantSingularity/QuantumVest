# Backend changes for frontend integration

While rebuilding the web and mobile frontends, we found that the watchlist
feature had no way to retrieve a watchlist's contents: `GET /api/v1/watchlists`
only returned an `items_count`, and there was no endpoint returning the
actual items (asset details, item ids). Without item ids, `DELETE
/api/v1/watchlists/<id>/items/<item_id>` was unreachable from any client,
and a watchlist's assets could never be displayed after adding them.

Two small, additive changes close that gap:

1. **`app/models/financial.py`** — added `WatchlistItem.to_dict()` (it had
   none before).
2. **`app/api/v1/routes.py`** —
   - added `GET /api/v1/watchlists/<watchlist_id>`, returning the watchlist
     with its items and each item's nested asset details.
   - `POST /api/v1/watchlists/<watchlist_id>/items` now returns the created
     item (with its asset) instead of just a success message, so a client
     can update its UI without an extra round-trip.

No existing endpoints, request formats, or response fields were changed —
these are purely additive. Both frontends' watchlist screens depend on
`GET /watchlists/<id>` to function.

## Infrastructure integration (MySQL driver + /metrics)

While reviewing `infrastructure/`, we found two more gaps that made the
Docker/Kubernetes/Terraform deployment paths non-functional:

1. **No database driver at all.** `requirements.txt` had `SQLAlchemy` but
   no DBAPI driver — `DATABASE_URL=mysql://...` (used by docker-compose,
   the Kubernetes StatefulSet, and the Terraform RDS module) would fail at
   startup with `ModuleNotFoundError`. Added `PyMySQL` (pure-Python, no
   system libmysqlclient needed) and updated the infra's connection strings
   to the `mysql+pymysql://` dialect.
2. **No `/metrics` endpoint.** `infrastructure/monitoring/prometheus-config.yaml`
   and `prometheus-local.yml` both scrape the backend for Prometheus
   metrics, and reference `http_requests_total` / `http_request_duration_seconds`
   by name in alert rules, but nothing emitted them. Added `prometheus-client`
   and a `/metrics` route (`app/__init__.py`) with those two standard
   request-count/latency series.

Neither change alters any existing request/response contract — they're
additive, same as the watchlist fix above.
