import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { portfolioAPI } from "../../services/api";
import {
  formatCurrency,
  formatNumber,
  formatSignedPercent,
  trendClass,
} from "../../utils/finance";
import { getErrorMessage, showToast } from "../../utils/helpers";
import { useNotifications } from "../../contexts/NotificationContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import Modal from "../ui/Modal";
import AssetSearchBox from "../ui/AssetSearchBox";
import PerformanceChart from "../charts/PerformanceChart";
import AllocationChart from "../charts/AllocationChart";
import "../../styles/PortfolioDetail.css";

const TX_TYPES = [
  "buy",
  "sell",
  "dividend",
  "deposit",
  "withdrawal",
  "split",
  "merger",
  "spinoff",
];

const PortfolioDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [portfolio, setPortfolio] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [txForm, setTxForm] = useState({
    transaction_type: "buy",
    quantity: "",
    price: "",
    fees: "",
    notes: "",
  });
  const [savingTx, setSavingTx] = useState(false);

  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [optimizeError, setOptimizeError] = useState("");

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [portfolioRes, perfRes] = await Promise.all([
        portfolioAPI.get(id),
        portfolioAPI.getPerformance(id, 90),
      ]);
      if (portfolioRes.data.success) setPortfolio(portfolioRes.data.portfolio);
      else setError(portfolioRes.data.error || "Portfolio not found");
      if (perfRes.data.success) setPerformance(perfRes.data.performance);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load this portfolio."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTransactions = useCallback(
    async (page = 1) => {
      try {
        const { data } = await portfolioAPI.getTransactions(id, page, 8);
        if (data.success) {
          setTransactions(data.transactions);
          setTxPages(data.pages || 1);
          setTxPage(page);
        }
      } catch (err) {
        // Non-fatal — the rest of the page still works.
      }
    },
    [id],
  );

  useEffect(() => {
    loadCore();
    loadTransactions(1);
  }, [loadCore, loadTransactions]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!selectedAsset)
      return showToast("Search for and select an asset first.", "warning");
    if (!txForm.quantity || !txForm.price)
      return showToast("Quantity and price are required.", "warning");

    setSavingTx(true);
    try {
      const { data } = await portfolioAPI.addTransaction(id, {
        asset_symbol: selectedAsset.symbol,
        transaction_type: txForm.transaction_type,
        quantity: parseFloat(txForm.quantity),
        price: parseFloat(txForm.price),
        fees: txForm.fees ? parseFloat(txForm.fees) : 0,
        notes: txForm.notes || undefined,
      });
      if (data.success) {
        showToast(
          `${txForm.transaction_type.toUpperCase()} recorded for ${selectedAsset.symbol}`,
          "success",
        );
        addNotification({
          type: "success",
          title: "Transaction added",
          message: `${txForm.transaction_type.toUpperCase()} ${txForm.quantity} ${selectedAsset.symbol} @ ${formatCurrency(txForm.price)}`,
        });
        setTxModalOpen(false);
        setSelectedAsset(null);
        setTxForm({
          transaction_type: "buy",
          quantity: "",
          price: "",
          fees: "",
          notes: "",
        });
        loadCore();
        loadTransactions(1);
      } else {
        showToast(data.error || "Could not save transaction", "error");
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Could not save transaction."), "error");
    } finally {
      setSavingTx(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimizeError("");
    setOptimization(null);
    try {
      const { data } = await portfolioAPI.optimize(id, {});
      if (data.success) {
        setOptimization(data.optimization);
      } else {
        setOptimizeError(data.error || "Optimization failed");
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        setOptimizeError(
          "Portfolio optimization is a premium feature on this account. Contact support to upgrade your plan.",
        );
      } else if (err?.response?.status === 400) {
        setOptimizeError(
          err.response.data?.error ||
            "This portfolio needs at least 2 holdings with price history to optimize.",
        );
      } else {
        setOptimizeError(getErrorMessage(err, "Could not run optimization."));
      }
    } finally {
      setOptimizing(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!window.confirm(`Delete "${portfolio.name}"? This cannot be undone.`))
      return;
    try {
      const { data } = await portfolioAPI.remove(id);
      if (data.success) {
        showToast("Portfolio deleted", "success");
        navigate("/portfolios");
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Could not delete portfolio."), "error");
    }
  };

  if (loading)
    return <LoadingSpinner fullScreen message="Loading portfolio..." />;

  if (error && !portfolio) {
    return (
      <div className="card">
        <EmptyState
          title="Portfolio not found"
          description={error}
          action={
            <Link to="/portfolios" className="btn btn-primary">
              Back to Portfolios
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="portfolio-detail-page">
      <div className="page-header">
        <div>
          <Link
            to="/portfolios"
            className="auth-link"
            style={{ fontSize: "0.85rem" }}
          >
            ← All portfolios
          </Link>
          <h2 style={{ marginTop: "0.4rem" }}>{portfolio.name}</h2>
          {portfolio.description && <p>{portfolio.description}</p>}
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-danger" onClick={handleDeletePortfolio}>
            Delete
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setTxModalOpen(true)}
          >
            + Add Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-4 dashboard-stats">
        <div className="card stat-card">
          <span className="stat-label">Total Value</span>
          <span className="stat-value mono">
            {formatCurrency(portfolio.total_value, portfolio.currency)}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Invested</span>
          <span className="stat-value mono">
            {formatCurrency(portfolio.invested_amount, portfolio.currency)}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Unrealized P&amp;L</span>
          <span
            className={`stat-value mono ${trendClass(portfolio.unrealized_pnl)}`}
          >
            {formatCurrency(portfolio.unrealized_pnl, portfolio.currency)}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Sharpe Ratio</span>
          <span className="stat-value mono">
            {portfolio.sharpe_ratio
              ? formatNumber(portfolio.sharpe_ratio)
              : "—"}
          </span>
        </div>
      </div>

      <div className="grid dashboard-main-grid">
        <div className="card">
          <div className="section-title">
            <h3>Performance (90 days)</h3>
          </div>
          <PerformanceChart
            dates={performance?.dates || []}
            values={performance?.values || []}
          />
        </div>
        <div className="card">
          <div className="section-title">
            <h3>Allocation</h3>
          </div>
          <AllocationChart holdings={portfolio.holdings || []} />
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>Holdings</h3>
          <span className="text-tertiary">
            {portfolio.holdings?.length || 0} position
            {portfolio.holdings?.length !== 1 ? "s" : ""}
          </span>
        </div>
        {!portfolio.holdings || portfolio.holdings.length === 0 ? (
          <EmptyState
            title="No holdings yet"
            description="Add a buy transaction to start building this portfolio."
          />
        ) : (
          <div className="table-scroll">
            <table className="qv-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Quantity</th>
                  <th>Avg Cost</th>
                  <th>Price</th>
                  <th>Market Value</th>
                  <th>P&amp;L</th>
                  <th>Allocation</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <strong>{h.asset?.symbol}</strong>
                      <span
                        className="text-tertiary"
                        style={{ display: "block", fontSize: "0.78rem" }}
                      >
                        {h.asset?.name}
                      </span>
                    </td>
                    <td className="mono">{formatNumber(h.quantity, 4)}</td>
                    <td className="mono">{formatCurrency(h.average_cost)}</td>
                    <td className="mono">{formatCurrency(h.current_price)}</td>
                    <td className="mono">{formatCurrency(h.market_value)}</td>
                    <td className={`mono ${trendClass(h.unrealized_pnl)}`}>
                      {formatCurrency(h.unrealized_pnl)} (
                      {formatSignedPercent(h.unrealized_pnl_percent)})
                    </td>
                    <td className="mono">
                      {formatNumber(h.current_allocation, 1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">
          <h3>AI Portfolio Optimization</h3>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleOptimize}
            disabled={optimizing}
          >
            {optimizing ? "Optimizing…" : "Run Optimization"}
          </button>
        </div>
        <p
          className="text-secondary"
          style={{ marginBottom: "var(--space-sm)" }}
        >
          Uses mean-variance optimization over 1 year of historical returns to
          suggest a minimum-variance allocation.
        </p>
        {optimizeError && <div className="auth-alert">{optimizeError}</div>}
        {optimization && (
          <>
            <div
              className="grid grid-3"
              style={{ marginBottom: "var(--space-sm)" }}
            >
              <div className="badge badge-info">
                Expected Return: {formatNumber(optimization.expected_return)}%
              </div>
              <div className="badge badge-info">
                Volatility: {formatNumber(optimization.volatility)}%
              </div>
              <div className="badge badge-info">
                Sharpe: {formatNumber(optimization.sharpe_ratio)}
              </div>
            </div>
            <div className="table-scroll">
              <table className="qv-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Current Weight</th>
                    <th>Optimal Weight</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {optimization.recommendations.map((r) => (
                    <tr key={r.symbol}>
                      <td>
                        <strong>{r.symbol}</strong>
                      </td>
                      <td className="mono">
                        {(r.current_weight * 100).toFixed(1)}%
                      </td>
                      <td className="mono">
                        {(r.optimal_weight * 100).toFixed(1)}%
                      </td>
                      <td>
                        <span
                          className={`badge ${r.recommendation === "buy" ? "badge-success" : r.recommendation === "sell" ? "badge-danger" : ""}`}
                        >
                          {r.recommendation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="section-title">
          <h3>Transactions</h3>
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions recorded"
            description="Transactions you add will show up here."
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="qv-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.executed_at).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${t.transaction_type === "sell" ? "badge-danger" : "badge-success"}`}
                        >
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className="mono">{formatNumber(t.quantity, 4)}</td>
                      <td className="mono">{formatCurrency(t.price)}</td>
                      <td className="mono">{formatCurrency(t.total_amount)}</td>
                      <td className="mono">{formatCurrency(t.fees)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {txPages > 1 && (
              <div
                className="flex-center gap-sm"
                style={{ marginTop: "var(--space-sm)" }}
              >
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={txPage <= 1}
                  onClick={() => loadTransactions(txPage - 1)}
                >
                  Previous
                </button>
                <span className="text-tertiary">
                  Page {txPage} of {txPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={txPage >= txPages}
                  onClick={() => loadTransactions(txPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setSelectedAsset(null);
        }}
        title="Add transaction"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setTxModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddTransaction}
              disabled={savingTx}
            >
              {savingTx ? "Saving…" : "Save Transaction"}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddTransaction}>
          <div className="field">
            <label>Asset</label>
            {selectedAsset ? (
              <div className="selected-asset-chip">
                <span>
                  <strong>{selectedAsset.symbol}</strong> — {selectedAsset.name}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedAsset(null)}
                >
                  Change
                </button>
              </div>
            ) : (
              <AssetSearchBox
                onSelect={setSelectedAsset}
                placeholder="Search e.g. AAPL, BTC, TSLA…"
                autoFocus
              />
            )}
          </div>

          <div className="grid grid-2" style={{ gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="tx-type">Type</label>
              <select
                id="tx-type"
                className="select"
                value={txForm.transaction_type}
                onChange={(e) =>
                  setTxForm((f) => ({ ...f, transaction_type: e.target.value }))
                }
              >
                {TX_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tx-quantity">Quantity</label>
              <input
                id="tx-quantity"
                type="number"
                step="any"
                min="0"
                className="input"
                value={txForm.quantity}
                onChange={(e) =>
                  setTxForm((f) => ({ ...f, quantity: e.target.value }))
                }
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="tx-price">Price per unit</label>
              <input
                id="tx-price"
                type="number"
                step="any"
                min="0"
                className="input"
                value={txForm.price}
                onChange={(e) =>
                  setTxForm((f) => ({ ...f, price: e.target.value }))
                }
                placeholder="150.25"
              />
            </div>
            <div className="field">
              <label htmlFor="tx-fees">Fees (optional)</label>
              <input
                id="tx-fees"
                type="number"
                step="any"
                min="0"
                className="input"
                value={txForm.fees}
                onChange={(e) =>
                  setTxForm((f) => ({ ...f, fees: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="tx-notes">Notes (optional)</label>
            <input
              id="tx-notes"
              className="input"
              value={txForm.notes}
              onChange={(e) =>
                setTxForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Rebalancing trade"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PortfolioDetail;
