import React, { useEffect, useMemo, useState } from "react";
import { portfolioAPI, riskAPI } from "../../services/api";
import { toDailyReturns } from "../../utils/finance";
import { getErrorMessage } from "../../utils/helpers";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import "../../styles/RiskAnalytics.css";

const METHODS = [
  { value: "historical", label: "Historical" },
  { value: "parametric", label: "Parametric (Normal)" },
  { value: "monte_carlo", label: "Monte Carlo" },
];
const CONFIDENCE_LEVELS = [0.9, 0.95, 0.99];

const MetricCard = ({ label, value, hint, tone }) => (
  <div className="card risk-metric-card">
    <span className="stat-label">{label}</span>
    <span className={`stat-value mono ${tone || ""}`}>{value}</span>
    {hint && (
      <span className="text-tertiary" style={{ fontSize: "0.78rem" }}>
        {hint}
      </span>
    )}
  </div>
);

const RiskAnalytics = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [returns, setReturns] = useState([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const [loadingReturns, setLoadingReturns] = useState(false);

  const [confidence, setConfidence] = useState(0.95);
  const [method, setMethod] = useState("historical");
  const [horizon, setHorizon] = useState(1);

  const [calculating, setCalculating] = useState(false);
  const [varResult, setVarResult] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoadingPortfolios(true);
      try {
        const { data } = await portfolioAPI.list();
        if (data.success) {
          setPortfolios(data.portfolios);
          if (data.portfolios.length > 0) setSelectedId(data.portfolios[0].id);
        }
      } catch (err) {
        setError(getErrorMessage(err, "Couldn't load portfolios."));
      } finally {
        setLoadingPortfolios(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const loadReturns = async () => {
      setLoadingReturns(true);
      setVarResult(null);
      setMetrics(null);
      try {
        const { data } = await portfolioAPI.getPerformance(selectedId, 365);
        if (data.success) {
          setReturns(toDailyReturns(data.performance.values || []));
        }
      } catch (err) {
        setError(getErrorMessage(err, "Couldn't load return history."));
      } finally {
        setLoadingReturns(false);
      }
    };
    loadReturns();
  }, [selectedId]);

  const hasEnoughData = returns.length >= 10;

  const handleCalculate = async () => {
    setCalculating(true);
    setError("");
    try {
      const [varRes, metricsRes] = await Promise.all([
        riskAPI.calculateVar({
          returns,
          alpha: 1 - confidence,
          method,
          time_horizon: horizon,
        }),
        riskAPI.calculateMetrics({ returns }),
      ]);
      if (varRes.data.success) setVarResult(varRes.data);
      if (metricsRes.data.success) setMetrics(metricsRes.data.metrics);
    } catch (err) {
      setError(getErrorMessage(err, "Could not calculate risk metrics."));
    } finally {
      setCalculating(false);
    }
  };

  const selectedPortfolio = useMemo(
    () => portfolios.find((p) => p.id === selectedId),
    [portfolios, selectedId],
  );

  if (loadingPortfolios)
    return <LoadingSpinner fullScreen message="Loading risk analytics..." />;

  return (
    <div className="risk-analytics-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">Risk Analytics</span>
          <h2>Value-at-Risk &amp; risk metrics</h2>
          <p>
            Institutional-grade risk analysis over your portfolio&apos;s
            historical returns.
          </p>
        </div>
      </div>

      {error && <div className="auth-alert">{error}</div>}

      {portfolios.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No portfolios to analyze"
            description="Create a portfolio and add some holdings first."
          />
        </div>
      ) : (
        <>
          <div className="card">
            <div className="risk-controls">
              <div className="field">
                <label htmlFor="risk-portfolio">Portfolio</label>
                <select
                  id="risk-portfolio"
                  className="select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="risk-method">Method</label>
                <select
                  id="risk-method"
                  className="select"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="risk-confidence">Confidence level</label>
                <select
                  id="risk-confidence"
                  className="select"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                >
                  {CONFIDENCE_LEVELS.map((c) => (
                    <option key={c} value={c}>
                      {(c * 100).toFixed(0)}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="risk-horizon">Time horizon (days)</label>
                <input
                  id="risk-horizon"
                  type="number"
                  min="1"
                  max="30"
                  className="input"
                  value={horizon}
                  onChange={(e) =>
                    setHorizon(parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleCalculate}
                disabled={!hasEnoughData || calculating}
              >
                {calculating ? "Calculating…" : "Calculate"}
              </button>
            </div>

            {loadingReturns ? (
              <LoadingSpinner message="Loading return history..." />
            ) : !hasEnoughData ? (
              <EmptyState
                title="Not enough history yet"
                description={`${selectedPortfolio?.name || "This portfolio"} has ${returns.length} day(s) of return history - at least 10 are needed to run risk calculations. Check back once more daily snapshots accrue.`}
              />
            ) : (
              <p
                className="text-tertiary"
                style={{ marginTop: "var(--space-sm)" }}
              >
                Using {returns.length} days of historical returns for{" "}
                {selectedPortfolio?.name}.
              </p>
            )}
          </div>

          {varResult && (
            <div className="grid grid-3">
              <MetricCard
                label={`Value at Risk (${(varResult.confidence_level * 100).toFixed(0)}%)`}
                value={`${(varResult.var * 100).toFixed(2)}%`}
                hint={`${varResult.method} method, ${horizon}-day horizon`}
                tone="trend-down"
              />
              <MetricCard
                label="Conditional VaR (Expected Shortfall)"
                value={`${(varResult.cvar * 100).toFixed(2)}%`}
                tone="trend-down"
              />
              <MetricCard
                label="Estimated Loss"
                value={
                  selectedPortfolio
                    ? `${(Math.abs(varResult.var) * selectedPortfolio.total_value).toFixed(2)} ${selectedPortfolio.currency}`
                    : "-"
                }
                hint="On current portfolio value"
                tone="trend-down"
              />
            </div>
          )}

          {metrics && (
            <div className="card">
              <div className="section-title">
                <h3>Comprehensive risk metrics</h3>
              </div>
              <div className="grid grid-4">
                <MetricCard
                  label="Annualized Return"
                  value={`${(metrics.annualized_return * 100).toFixed(2)}%`}
                  tone={
                    metrics.annualized_return >= 0 ? "trend-up" : "trend-down"
                  }
                />
                <MetricCard
                  label="Volatility"
                  value={`${(metrics.volatility * 100).toFixed(2)}%`}
                />
                <MetricCard
                  label="Sharpe Ratio"
                  value={metrics.sharpe_ratio.toFixed(2)}
                />
                <MetricCard
                  label="Sortino Ratio"
                  value={
                    Number.isFinite(metrics.sortino_ratio)
                      ? metrics.sortino_ratio.toFixed(2)
                      : "∞"
                  }
                />
                <MetricCard
                  label="Max Drawdown"
                  value={`${(metrics.max_drawdown * 100).toFixed(2)}%`}
                  tone="trend-down"
                />
                <MetricCard
                  label="Skewness"
                  value={metrics.skewness.toFixed(3)}
                />
                <MetricCard
                  label="Kurtosis"
                  value={metrics.kurtosis.toFixed(3)}
                />
                <MetricCard
                  label="VaR 95%"
                  value={`${(metrics.var_95 * 100).toFixed(2)}%`}
                  tone="trend-down"
                />
                <MetricCard
                  label="CVaR 95%"
                  value={`${(metrics.cvar_95 * 100).toFixed(2)}%`}
                  tone="trend-down"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RiskAnalytics;
