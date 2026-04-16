import React from "react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { watchlistAPI } from "../../services/api";
import "../../styles/Watchlist.css";
import LoadingSpinner from "../ui/LoadingSpinner";
import { showToast } from "../ui/ToastManager";

const DEFAULT_WATCHLIST = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 45230.5,
    change: 2.34,
    changeAmt: 1035.2,
    volume: "28.4B",
    mktCap: "886B",
    sector: "Crypto",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3015.8,
    change: 1.75,
    changeAmt: 51.9,
    volume: "14.2B",
    mktCap: "362B",
    sector: "Crypto",
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 187.62,
    change: 0.48,
    changeAmt: 0.89,
    volume: "58.1M",
    mktCap: "2.94T",
    sector: "Technology",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    price: 415.3,
    change: -0.22,
    changeAmt: -0.92,
    volume: "21.3M",
    mktCap: "3.08T",
    sector: "Technology",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    price: 173.45,
    change: 1.12,
    changeAmt: 1.92,
    volume: "19.8M",
    mktCap: "2.17T",
    sector: "Technology",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    price: 196.8,
    change: -0.65,
    changeAmt: -1.29,
    volume: "33.5M",
    mktCap: "2.06T",
    sector: "Technology",
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 148.25,
    change: 3.91,
    changeAmt: 5.58,
    volume: "4.1B",
    mktCap: "68.5B",
    sector: "Crypto",
  },
];

const ASSETS_TO_ADD = [
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "XRP", name: "XRP" },
];

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const [removingSymbol, setRemovingSymbol] = useState(null);
  const [filterSector, setFilterSector] = useState("All");
  const [sortBy, setSortBy] = useState("symbol");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        setLoading(true);
        const response = await watchlistAPI.getWatchlist();
        if (response.data.success && Array.isArray(response.data.watchlist)) {
          setWatchlist(response.data.watchlist);
        } else {
          setWatchlist(DEFAULT_WATCHLIST);
        }
      } catch {
        setWatchlist(DEFAULT_WATCHLIST);
      } finally {
        setLoading(false);
      }
    };
    fetchWatchlist();
  }, []);

  const handleRemove = async (symbol) => {
    try {
      setRemovingSymbol(symbol);
      await watchlistAPI.removeFromWatchlist(symbol);
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
      showToast(`${symbol} removed from watchlist`, "info");
    } catch {
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
      showToast(`${symbol} removed from watchlist`, "info");
    } finally {
      setRemovingSymbol(null);
    }
  };

  const handleAdd = async (asset) => {
    if (watchlist.find((w) => w.symbol === asset.symbol)) {
      showToast(`${asset.symbol} is already in your watchlist`, "warning");
      return;
    }
    try {
      setAddingSymbol(asset.symbol);
      await watchlistAPI.addToWatchlist(asset.symbol);
    } catch {
      // Add locally in demo mode
    } finally {
      const mockPrice = Math.random() * 500 + 50;
      const mockChange = (Math.random() * 6 - 3).toFixed(2);
      setWatchlist((prev) => [
        ...prev,
        {
          symbol: asset.symbol,
          name: asset.name,
          price: parseFloat(mockPrice.toFixed(2)),
          change: parseFloat(mockChange),
          changeAmt: parseFloat((mockPrice * (mockChange / 100)).toFixed(2)),
          volume: "N/A",
          mktCap: "N/A",
          sector: "Other",
        },
      ]);
      showToast(`${asset.symbol} added to watchlist`, "success");
      setAddingSymbol(null);
    }
  };

  const sectors = ["All", ...new Set(watchlist.map((w) => w.sector))];

  const handleSort = (col) => {
    if (sortBy === col) setSortAsc((prev) => !prev);
    else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  const filtered = watchlist
    .filter((w) => filterSector === "All" || w.sector === filterSector)
    .sort((a, b) => {
      let va = a[sortBy],
        vb = b[sortBy];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ col }) =>
    sortBy === col ? (
      <span className="sort-icon">{sortAsc ? "↑" : "↓"}</span>
    ) : (
      <span className="sort-icon sort-icon-inactive">↕</span>
    );

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner text="Loading watchlist" />
      </div>
    );
  }

  return (
    <div className="watchlist-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="section-title">Watchlist</h2>

        {/* Stats row */}
        <div className="watchlist-stats">
          <div className="wl-stat">
            <span className="wl-stat-label">Tracked Assets</span>
            <span className="wl-stat-value">{watchlist.length}</span>
          </div>
          <div className="wl-stat">
            <span className="wl-stat-label">Gaining</span>
            <span className="wl-stat-value positive">
              {watchlist.filter((w) => w.change > 0).length}
            </span>
          </div>
          <div className="wl-stat">
            <span className="wl-stat-label">Declining</span>
            <span className="wl-stat-value negative">
              {watchlist.filter((w) => w.change < 0).length}
            </span>
          </div>
          <div className="wl-stat">
            <span className="wl-stat-label">Flat</span>
            <span className="wl-stat-value">
              {watchlist.filter((w) => w.change === 0).length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="watchlist-filters">
          <div className="wl-filter-group">
            {sectors.map((s) => (
              <button
                key={s}
                className={`wl-filter-btn ${filterSector === s ? "active" : ""}`}
                onClick={() => setFilterSector(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="wl-empty">
            <p>No assets match the selected filter.</p>
          </div>
        ) : (
          <div className="card watchlist-card">
            <div className="watchlist-table-wrap">
              <table className="watchlist-table">
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort("symbol")}
                      className="sortable"
                    >
                      Symbol <SortIcon col="symbol" />
                    </th>
                    <th onClick={() => handleSort("name")} className="sortable">
                      Name <SortIcon col="name" />
                    </th>
                    <th
                      onClick={() => handleSort("price")}
                      className="sortable text-right"
                    >
                      Price <SortIcon col="price" />
                    </th>
                    <th
                      onClick={() => handleSort("change")}
                      className="sortable text-right"
                    >
                      24h % <SortIcon col="change" />
                    </th>
                    <th className="text-right">24h Chg</th>
                    <th className="text-right">Volume</th>
                    <th className="text-right">Mkt Cap</th>
                    <th>Sector</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <motion.tr
                      key={item.symbol}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="watchlist-row"
                    >
                      <td>
                        <span className="wl-symbol">{item.symbol}</span>
                      </td>
                      <td className="wl-name">{item.name}</td>
                      <td className="text-right wl-price">
                        $
                        {typeof item.price === "number"
                          ? item.price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : item.price}
                      </td>
                      <td
                        className={`text-right wl-change ${item.change >= 0 ? "positive" : "negative"}`}
                      >
                        {item.change >= 0 ? "+" : ""}
                        {typeof item.change === "number"
                          ? item.change.toFixed(2)
                          : item.change}
                        %
                      </td>
                      <td
                        className={`text-right ${item.changeAmt >= 0 ? "positive" : "negative"}`}
                      >
                        {item.changeAmt >= 0 ? "+" : ""}
                        {typeof item.changeAmt === "number"
                          ? item.changeAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : item.changeAmt}
                      </td>
                      <td className="text-right wl-meta">{item.volume}</td>
                      <td className="text-right wl-meta">{item.mktCap}</td>
                      <td>
                        <span className="wl-sector-badge">{item.sector}</span>
                      </td>
                      <td>
                        <button
                          className="wl-remove-btn"
                          onClick={() => handleRemove(item.symbol)}
                          disabled={removingSymbol === item.symbol}
                          title="Remove from watchlist"
                        >
                          {removingSymbol === item.symbol ? "…" : "✕"}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Assets */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h3 className="card-title">Add Assets</h3>
          <div className="wl-add-grid">
            {ASSETS_TO_ADD.filter(
              (a) => !watchlist.find((w) => w.symbol === a.symbol),
            ).map((asset) => (
              <div key={asset.symbol} className="wl-add-card">
                <div className="wl-add-info">
                  <span className="wl-symbol">{asset.symbol}</span>
                  <span className="wl-add-name">{asset.name}</span>
                </div>
                <button
                  className="btn btn-outline wl-add-btn"
                  onClick={() => handleAdd(asset)}
                  disabled={addingSymbol === asset.symbol}
                >
                  {addingSymbol === asset.symbol ? "Adding…" : "+ Add"}
                </button>
              </div>
            ))}
            {ASSETS_TO_ADD.every((a) =>
              watchlist.find((w) => w.symbol === a.symbol),
            ) && (
              <p className="text-secondary">
                All suggested assets are already in your watchlist.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
