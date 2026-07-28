import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { watchlistAPI } from "../../services/api";
import { assetTypeLabel } from "../../utils/finance";
import { getErrorMessage, showToast } from "../../utils/helpers";
import { useNotifications } from "../../contexts/NotificationContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import Modal from "../ui/Modal";
import AssetSearchBox from "../ui/AssetSearchBox";
import "../../styles/Watchlist.css";

const Watchlist = () => {
  const [searchParams] = useSearchParams();
  const { addNotification } = useNotifications();

  const [watchlists, setWatchlists] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState(null);

  const loadWatchlists = useCallback(async (selectId) => {
    setLoadingList(true);
    try {
      const { data } = await watchlistAPI.list();
      if (data.success) {
        setWatchlists(data.watchlists);
        const pick = selectId || data.watchlists[0]?.id || null;
        setActiveId(pick);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load your watchlists."));
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (watchlistId) => {
    if (!watchlistId) {
      setActiveDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const { data } = await watchlistAPI.get(watchlistId);
      if (data.success) setActiveDetail(data.watchlist);
    } catch (err) {
      showToast(getErrorMessage(err, "Couldn't load this watchlist."), "error");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlists();
  }, [loadWatchlists]);
  useEffect(() => {
    loadDetail(activeId);
  }, [activeId, loadDetail]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await watchlistAPI.create({ name: newName.trim() });
      if (data.success) {
        showToast(`Watchlist "${newName}" created`, "success");
        setCreateOpen(false);
        setNewName("");
        loadWatchlists(data.watchlist.id);
      } else {
        showToast(data.error || "Could not create watchlist", "error");
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Could not create watchlist."), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWatchlist = async (wl) => {
    if (!window.confirm(`Delete watchlist "${wl.name}"?`)) return;
    try {
      const { data } = await watchlistAPI.remove(wl.id);
      if (data.success) {
        showToast("Watchlist deleted", "success");
        loadWatchlists();
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Could not delete watchlist."), "error");
    }
  };

  const handleAddAsset = async (asset) => {
    setAddingSymbol(asset.symbol);
    try {
      const { data } = await watchlistAPI.addItem(activeId, {
        asset_symbol: asset.symbol,
      });
      if (data.success) {
        showToast(`${asset.symbol} added to watchlist`, "success");
        addNotification({
          type: "success",
          title: "Watchlist updated",
          message: `${asset.symbol} added to "${activeDetail?.name}"`,
        });
        loadDetail(activeId);
        loadWatchlists(activeId);
      } else {
        showToast(data.error || "Could not add asset", "error");
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        showToast(`${asset.symbol} is already in this watchlist`, "warning");
      } else {
        showToast(getErrorMessage(err, "Could not add asset."), "error");
      }
    } finally {
      setAddingSymbol(null);
    }
  };

  const handleRemoveItem = async (item) => {
    try {
      const { data } = await watchlistAPI.removeItem(activeId, item.id);
      if (data.success) {
        showToast(`${item.asset?.symbol} removed`, "success");
        loadDetail(activeId);
        loadWatchlists(activeId);
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Could not remove asset."), "error");
    }
  };

  if (loadingList)
    return <LoadingSpinner fullScreen message="Loading watchlists..." />;

  return (
    <div className="watchlist-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">Watchlists</span>
          <h2>Track the assets you care about</h2>
          <p>
            Organize assets into watchlists and act the moment an opportunity
            appears.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + New Watchlist
        </button>
      </div>

      {error && <div className="auth-alert">{error}</div>}

      {watchlists.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<span style={{ fontSize: "1.6rem" }}>⭐</span>}
            title="No watchlists yet"
            description="Create a watchlist to start tracking assets across markets."
            action={
              <button
                className="btn btn-primary"
                onClick={() => setCreateOpen(true)}
              >
                Create Watchlist
              </button>
            }
          />
        </div>
      ) : (
        <div className="watchlist-layout">
          <div className="card watchlist-sidebar">
            {watchlists.map((wl) => (
              <div
                key={wl.id}
                className={`watchlist-tab ${wl.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(wl.id)}
              >
                <div>
                  <p className="watchlist-tab-name">{wl.name}</p>
                  <span className="text-tertiary">
                    {wl.items_count} asset{wl.items_count !== 1 ? "s" : ""}
                  </span>
                </div>
                {wl.is_default && (
                  <span className="badge badge-primary">Default</span>
                )}
                <button
                  type="button"
                  className="watchlist-tab-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWatchlist(wl);
                  }}
                  aria-label={`Delete ${wl.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="card watchlist-main">
            {loadingDetail ? (
              <LoadingSpinner message="Loading assets..." />
            ) : (
              <>
                <div className="section-title">
                  <h3>{activeDetail?.name}</h3>
                </div>

                <AssetSearchBox
                  onSelect={handleAddAsset}
                  placeholder={
                    searchParams.get("q")
                      ? `Search for "${searchParams.get("q")}"…`
                      : "Add an asset (e.g. AAPL, BTC)…"
                  }
                />
                {addingSymbol && (
                  <p
                    className="text-tertiary"
                    style={{ marginTop: "0.4rem", fontSize: "0.8rem" }}
                  >
                    Adding {addingSymbol}…
                  </p>
                )}

                <div style={{ marginTop: "var(--space-md)" }}>
                  {!activeDetail?.items || activeDetail.items.length === 0 ? (
                    <EmptyState
                      title="No assets yet"
                      description="Search above to add your first asset to this watchlist."
                    />
                  ) : (
                    <ul className="watchlist-items">
                      {activeDetail.items.map((item) => (
                        <li key={item.id} className="watchlist-item">
                          <div>
                            <span className="asset-symbol">
                              {item.asset?.symbol}
                            </span>
                            <span className="asset-name">
                              {item.asset?.name}
                            </span>
                          </div>
                          <span className="badge badge-primary">
                            {assetTypeLabel(item.asset?.asset_type)}
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRemoveItem(item)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a new watchlist"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="watchlist-name">Name</label>
            <input
              id="watchlist-name"
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tech Growth Stocks"
              autoFocus
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Watchlist;
