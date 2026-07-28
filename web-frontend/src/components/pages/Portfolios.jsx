import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { portfolioAPI } from "../../services/api";
import {
  formatCurrency,
  formatSignedPercent,
  trendClass,
} from "../../utils/finance";
import { getErrorMessage, showToast } from "../../utils/helpers";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import Modal from "../ui/Modal";
import "../../styles/Portfolios.css";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY"];

const Portfolios = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    currency: "USD",
  });
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await portfolioAPI.list();
      if (data.success) setPortfolios(data.portfolios);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load your portfolios."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await portfolioAPI.create(form);
      if (data.success) {
        showToast(`Portfolio "${form.name}" created`, "success");
        setModalOpen(false);
        setForm({ name: "", description: "", currency: "USD" });
        load();
      } else {
        showToast(data.error || "Could not create portfolio", "error");
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Could not create portfolio."), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (portfolio) => {
    if (!window.confirm(`Delete "${portfolio.name}"? This cannot be undone.`))
      return;
    setDeletingId(portfolio.id);
    try {
      const { data } = await portfolioAPI.remove(portfolio.id);
      if (data.success) {
        showToast("Portfolio deleted", "success");
        setPortfolios((prev) => prev.filter((p) => p.id !== portfolio.id));
      } else {
        showToast(data.error || "Could not delete portfolio", "error");
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Could not delete portfolio."), "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading)
    return <LoadingSpinner fullScreen message="Loading portfolios..." />;

  return (
    <div className="portfolios-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">Portfolios</span>
          <h2>Your portfolios</h2>
          <p>
            Create and manage portfolios across stocks, crypto, and other asset
            classes.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + New Portfolio
        </button>
      </div>

      {error && <div className="auth-alert">{error}</div>}

      {portfolios.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<span style={{ fontSize: "1.6rem" }}>💼</span>}
            title="No portfolios yet"
            description="Create your first portfolio to start tracking holdings and transactions."
            action={
              <button
                className="btn btn-primary"
                onClick={() => setModalOpen(true)}
              >
                Create Portfolio
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-3">
          {portfolios.map((p) => (
            <Link
              to={`/portfolios/${p.id}`}
              key={p.id}
              className="card card-hover portfolio-card"
            >
              <div className="flex-between">
                <h4>{p.name}</h4>
                {p.is_default && (
                  <span className="badge badge-primary">Default</span>
                )}
              </div>
              {p.description && (
                <p className="portfolio-card-desc">{p.description}</p>
              )}
              <div className="portfolio-card-value mono">
                {formatCurrency(p.total_value, p.currency)}
              </div>
              <div className="flex-between portfolio-card-footer">
                <span className={`mono ${trendClass(p.unrealized_pnl)}`}>
                  {formatSignedPercent(
                    p.invested_amount > 0
                      ? (p.unrealized_pnl / p.invested_amount) * 100
                      : 0,
                  )}
                </span>
                <span className="text-tertiary">
                  {p.holdings_count} holding{p.holdings_count !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm portfolio-delete-btn"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(p);
                }}
                disabled={deletingId === p.id}
              >
                {deletingId === p.id ? "Removing…" : "Delete"}
              </button>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a new portfolio"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create Portfolio"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="portfolio-name">Name</label>
            <input
              id="portfolio-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Growth Portfolio"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="portfolio-description">
              Description (optional)
            </label>
            <textarea
              id="portfolio-description"
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What is this portfolio for?"
            />
          </div>
          <div className="field">
            <label htmlFor="portfolio-currency">Base currency</label>
            <select
              id="portfolio-currency"
              className="select"
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value }))
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Portfolios;
