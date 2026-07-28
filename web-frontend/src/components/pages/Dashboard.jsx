import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { portfolioAPI, watchlistAPI } from "../../services/api";
import { getAssetMap } from "../../utils/assetCache";
import {
  formatCurrency,
  formatSignedPercent,
  trendClass,
} from "../../utils/finance";
import { getErrorMessage } from "../../utils/helpers";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import PerformanceChart from "../charts/PerformanceChart";
import "../../styles/Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portfolios, setPortfolios] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [featuredPerf, setFeaturedPerf] = useState(null);
  const [recentTx, setRecentTx] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [portfoliosRes, watchlistsRes] = await Promise.all([
          portfolioAPI.list(),
          watchlistAPI.list(),
        ]);
        if (cancelled) return;

        const portfolioList = portfoliosRes.data.success
          ? portfoliosRes.data.portfolios
          : [];
        const watchlistList = watchlistsRes.data.success
          ? watchlistsRes.data.watchlists
          : [];
        setPortfolios(portfolioList);
        setWatchlists(watchlistList);

        if (portfolioList.length > 0) {
          const featured = [...portfolioList].sort(
            (a, b) => (b.total_value || 0) - (a.total_value || 0),
          )[0];

          const [perfRes, ...txResults] = await Promise.all([
            portfolioAPI.getPerformance(featured.id, 90),
            ...portfolioList
              .slice(0, 5)
              .map((p) => portfolioAPI.getTransactions(p.id, 1, 5)),
          ]);
          if (cancelled) return;

          if (perfRes.data.success)
            setFeaturedPerf({
              ...perfRes.data.performance,
              name: featured.name,
            });

          const assetMap = await getAssetMap();
          const allTx = txResults
            .flatMap((res, idx) =>
              res.data.success
                ? res.data.transactions.map((t) => ({
                    ...t,
                    portfolioName: portfolioList[idx].name,
                  }))
                : [],
            )
            .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))
            .slice(0, 6)
            .map((t) => ({ ...t, asset: assetMap[t.asset_id] }));

          if (!cancelled) setRecentTx(allTx);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            getErrorMessage(err, "Couldn't load your dashboard right now."),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const totalValue = portfolios.reduce(
      (sum, p) => sum + (p.total_value || 0),
      0,
    );
    const invested = portfolios.reduce(
      (sum, p) => sum + (p.invested_amount || 0),
      0,
    );
    const unrealizedPnl = portfolios.reduce(
      (sum, p) => sum + (p.unrealized_pnl || 0),
      0,
    );
    const holdingsCount = portfolios.reduce(
      (sum, p) => sum + (p.holdings_count || 0),
      0,
    );
    const returnPct = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;
    return { totalValue, invested, unrealizedPnl, holdingsCount, returnPct };
  }, [portfolios]);

  const watchlistItemCount = watchlists.reduce(
    (sum, w) => sum + (w.items_count || 0),
    0,
  );
  const firstName = user?.first_name || user?.username || "there";

  if (loading)
    return <LoadingSpinner fullScreen message="Loading your dashboard..." />;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">Overview</span>
          <h2>Welcome back, {firstName}</h2>
          <p>Here&apos;s how your investments are doing today.</p>
        </div>
        <div className="flex gap-sm">
          <Link to="/portfolios" className="btn btn-secondary">
            Manage Portfolios
          </Link>
          <Link to="/risk-analytics" className="btn btn-primary">
            Run Risk Analysis
          </Link>
        </div>
      </div>

      {error && (
        <div className="auth-alert" style={{ marginBottom: "var(--space-md)" }}>
          {error}
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<span style={{ fontSize: "1.6rem" }}>💼</span>}
            title="Create your first portfolio"
            description="Track holdings, run risk analytics, and get AI-optimized allocations once you set up a portfolio."
            action={
              <Link to="/portfolios" className="btn btn-primary">
                Create Portfolio
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-4 dashboard-stats">
            <div className="card stat-card">
              <span className="stat-label">Total Value</span>
              <span className="stat-value mono">
                {formatCurrency(totals.totalValue)}
              </span>
              <span className={`stat-delta ${trendClass(totals.returnPct)}`}>
                {formatSignedPercent(totals.returnPct)} all-time
              </span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Unrealized P&amp;L</span>
              <span
                className={`stat-value mono ${trendClass(totals.unrealizedPnl)}`}
              >
                {formatCurrency(totals.unrealizedPnl)}
              </span>
              <span className="stat-delta text-tertiary">
                Across {portfolios.length} portfolio
                {portfolios.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Holdings</span>
              <span className="stat-value mono">{totals.holdingsCount}</span>
              <span className="stat-delta text-tertiary">
                Positions under management
              </span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Watchlist</span>
              <span className="stat-value mono">{watchlistItemCount}</span>
              <span className="stat-delta text-tertiary">Assets tracked</span>
            </div>
          </div>

          <div className="grid dashboard-main-grid">
            <div className="card">
              <div className="section-title">
                <h3>{featuredPerf?.name || "Portfolio"} performance</h3>
                <Link to="/portfolios" className="auth-link">
                  View all →
                </Link>
              </div>
              {featuredPerf ? (
                <>
                  <PerformanceChart
                    dates={featuredPerf.dates || []}
                    values={featuredPerf.values || []}
                  />
                  <div className="dashboard-perf-meta">
                    <div>
                      <span className="text-tertiary">Volatility</span>
                      <strong>
                        {(featuredPerf.volatility || 0).toFixed(2)}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-tertiary">Sharpe</span>
                      <strong>
                        {(featuredPerf.sharpe_ratio || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-tertiary">Max Drawdown</span>
                      <strong>
                        {(featuredPerf.max_drawdown || 0).toFixed(2)}%
                      </strong>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No performance data yet"
                  description="Check back after your portfolio accrues a few days of history."
                />
              )}
            </div>

            <div className="card">
              <div className="section-title">
                <h3>Recent activity</h3>
                <Link to="/portfolios" className="auth-link">
                  View all →
                </Link>
              </div>
              {recentTx.length === 0 ? (
                <EmptyState
                  title="No transactions yet"
                  description="Buy, sell, or deposit into a portfolio to see activity here."
                />
              ) : (
                <ul className="activity-list">
                  {recentTx.map((tx) => (
                    <li key={tx.id} className="activity-item">
                      <span
                        className={`badge ${tx.transaction_type === "sell" ? "badge-danger" : "badge-success"}`}
                      >
                        {tx.transaction_type}
                      </span>
                      <div className="activity-item-body">
                        <p>
                          <strong>{tx.asset?.symbol || "Asset"}</strong> ·{" "}
                          {tx.quantity} @ {formatCurrency(tx.price)}
                        </p>
                        <span className="text-tertiary">
                          {tx.portfolioName} ·{" "}
                          {new Date(tx.executed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="mono">
                        {formatCurrency(tx.total_amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
