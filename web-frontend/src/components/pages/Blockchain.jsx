import React, { useCallback, useEffect, useState } from "react";
import { blockchainAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { getErrorMessage, cx } from "../../utils/helpers";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
// stat-label/stat-value are defined in Dashboard.css. Vite code-splits CSS
// per lazily-loaded route, so importing this explicitly (rather than
// relying on the user having already visited /dashboard in this session)
// keeps this page's styling correct regardless of navigation history.
import "../../styles/Dashboard.css";
import "../../styles/Blockchain.css";

const CONTRACT_LABELS = {
  DataTracking: "Data Tracking",
  TrendAnalysis: "Trend Analysis",
  QuantumVestToken: "QuantumVest Token (QVT)",
  QuantumVestOracle: "Price Oracle",
};

const truncateAddress = (address) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

const ContractRow = ({ name, address }) => (
  <div className="blockchain-contract-row">
    <span>{CONTRACT_LABELS[name] || name}</span>
    {address ? (
      <span className="badge badge-success mono" title={address}>
        {truncateAddress(address)}
      </span>
    ) : (
      <span className="badge badge-warning">Not deployed</span>
    )}
  </div>
);

const Blockchain = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError("");
    try {
      const { data } = await blockchainAPI.status();
      setStatus(data);
    } catch (err) {
      setStatusError(
        getErrorMessage(err, "Couldn't reach the blockchain gateway."),
      );
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Price trend / moving average (TrendAnalysis) ─────────────────────
  const [window_, setWindow] = useState(7);
  const [trend, setTrend] = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendError, setTrendError] = useState("");

  const loadTrend = useCallback(async () => {
    setLoadingTrend(true);
    setTrendError("");
    try {
      const { data } = await blockchainAPI.getTrend(window_);
      setTrend(data);
    } catch (err) {
      setTrend(null);
      setTrendError(getErrorMessage(err, "Couldn't load the price trend."));
    } finally {
      setLoadingTrend(false);
    }
  }, [window_]);

  const trendAvailable = Boolean(status?.contracts?.TrendAnalysis);
  useEffect(() => {
    if (trendAvailable) loadTrend();
  }, [trendAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── On-chain market data (DataTracking) ───────────────────────────────
  const [ticker, setTicker] = useState("ETH");
  const [marketData, setMarketData] = useState(null);
  const [loadingMarketData, setLoadingMarketData] = useState(false);
  const [marketDataError, setMarketDataError] = useState("");

  const lookupMarketData = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setLoadingMarketData(true);
    setMarketDataError("");
    try {
      const { data } = await blockchainAPI.getMarketData(ticker.trim());
      setMarketData(data);
    } catch (err) {
      setMarketData(null);
      setMarketDataError(getErrorMessage(err, "Couldn't load market data."));
    } finally {
      setLoadingMarketData(false);
    }
  };

  const [recordForm, setRecordForm] = useState({
    ticker: "",
    price: "",
    volume: "",
  });
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [recordSuccess, setRecordSuccess] = useState("");

  const submitRecord = async (e) => {
    e.preventDefault();
    setRecording(true);
    setRecordError("");
    setRecordSuccess("");
    try {
      const { data } = await blockchainAPI.recordMarketData({
        ticker: recordForm.ticker.trim(),
        price: Number(recordForm.price),
        volume: Number(recordForm.volume),
      });
      setRecordSuccess(`Recorded on-chain in block ${data.block_number}.`);
      setRecordForm({ ticker: "", price: "", volume: "" });
      if (
        recordForm.ticker.trim().toUpperCase() === ticker.trim().toUpperCase()
      ) {
        lookupMarketData({ preventDefault: () => {} });
      }
    } catch (err) {
      setRecordError(getErrorMessage(err, "Couldn't record this data point."));
    } finally {
      setRecording(false);
    }
  };

  // ── Token balance (QuantumVestToken) ──────────────────────────────────
  const [balanceAddress, setBalanceAddress] = useState("");
  const [balanceResult, setBalanceResult] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState("");

  const lookupBalance = async (e) => {
    e.preventDefault();
    if (!balanceAddress.trim()) return;
    setLoadingBalance(true);
    setBalanceError("");
    try {
      const { data } = await blockchainAPI.getTokenBalance(
        balanceAddress.trim(),
      );
      setBalanceResult(data);
    } catch (err) {
      setBalanceResult(null);
      setBalanceError(getErrorMessage(err, "Couldn't look up that balance."));
    } finally {
      setLoadingBalance(false);
    }
  };

  // ── Oracle price (QuantumVestOracle) ──────────────────────────────────
  const [oracleAddress, setOracleAddress] = useState("");
  const [oracleResult, setOracleResult] = useState(null);
  const [loadingOracle, setLoadingOracle] = useState(false);
  const [oracleError, setOracleError] = useState("");

  const lookupOracle = async (e) => {
    e.preventDefault();
    if (!oracleAddress.trim()) return;
    setLoadingOracle(true);
    setOracleError("");
    try {
      const { data } = await blockchainAPI.getOraclePrice(oracleAddress.trim());
      setOracleResult(data);
    } catch (err) {
      setOracleResult(null);
      setOracleError(
        getErrorMessage(err, "No price available for that asset."),
      );
    } finally {
      setLoadingOracle(false);
    }
  };

  if (loadingStatus) {
    return (
      <LoadingSpinner fullScreen message="Connecting to the blockchain..." />
    );
  }

  return (
    <div className="blockchain-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">Blockchain</span>
          <h2>On-chain data &amp; contracts</h2>
          <p>
            Live view of the QuantumVest smart contract suite via the
            backend&apos;s Web3 gateway.
          </p>
        </div>
        <span
          className={cx(
            "badge",
            status?.connected ? "badge-success" : "badge-danger",
          )}
        >
          {status?.connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {!status?.connected ? (
        <div className="card">
          <EmptyState
            title="No blockchain connection"
            description={
              statusError ||
              "The backend isn't connected to a Web3 provider right now. This is an optional feature — start it locally with `docker compose --profile blockchain up`, or set WEB3_PROVIDER_URI to point at a running chain."
            }
          />
        </div>
      ) : (
        <>
          <div className="card">
            <div className="section-title">
              <h3>Network</h3>
            </div>
            <div className="grid grid-3">
              <div>
                <span className="stat-label">Chain ID</span>
                <span className="stat-value mono">{status.chain_id}</span>
              </div>
              <div>
                <span className="stat-label">Block Number</span>
                <span className="stat-value mono">{status.block_number}</span>
              </div>
              <div>
                <span className="stat-label">Provider</span>
                <span
                  className="stat-value mono"
                  style={{ fontSize: "0.85rem" }}
                >
                  {status.provider}
                </span>
              </div>
            </div>
            <div className="blockchain-contract-list">
              {Object.entries(status.contracts || {}).map(([name, address]) => (
                <ContractRow key={name} name={name} address={address} />
              ))}
            </div>
          </div>

          {/* ── TrendAnalysis ─────────────────────────────────────── */}
          <div className="card">
            <div className="section-title">
              <h3>Price trend</h3>
            </div>
            {!trendAvailable ? (
              <EmptyState
                title="TrendAnalysis not deployed"
                description="This contract isn't deployed on the connected network yet."
              />
            ) : (
              <>
                <div className="blockchain-inline-controls">
                  <div className="field">
                    <label htmlFor="ma-window">Moving average window</label>
                    <input
                      id="ma-window"
                      type="number"
                      min="1"
                      className="input"
                      value={window_}
                      onChange={(e) =>
                        setWindow(parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={loadTrend}
                    disabled={loadingTrend}
                  >
                    {loadingTrend ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {trendError && <div className="auth-alert">{trendError}</div>}
                {trend && (
                  <div
                    className="grid grid-2"
                    style={{ marginTop: "var(--space-sm)" }}
                  >
                    <div>
                      <span className="stat-label">
                        Latest price (raw feed value)
                      </span>
                      <span className="stat-value mono">
                        {trend.price?.toLocaleString?.() ?? trend.price}
                      </span>
                    </div>
                    {trend.moving_average !== undefined && (
                      <div>
                        <span className="stat-label">
                          {trend.window}-round moving average
                        </span>
                        <span className="stat-value mono">
                          {trend.moving_average?.toLocaleString?.() ??
                            trend.moving_average}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── DataTracking ──────────────────────────────────────── */}
          <div className="card">
            <div className="section-title">
              <h3>On-chain market data</h3>
            </div>
            {!status?.contracts?.DataTracking ? (
              <EmptyState
                title="DataTracking not deployed"
                description="This contract isn't deployed on the connected network yet."
              />
            ) : (
              <>
                <form
                  className="blockchain-inline-controls"
                  onSubmit={lookupMarketData}
                >
                  <div className="field">
                    <label htmlFor="md-ticker">Ticker</label>
                    <input
                      id="md-ticker"
                      className="input"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      placeholder="ETH"
                    />
                  </div>
                  <button
                    className="btn btn-secondary"
                    type="submit"
                    disabled={loadingMarketData}
                  >
                    {loadingMarketData ? "Looking up…" : "Look up"}
                  </button>
                </form>
                {marketDataError && (
                  <div className="auth-alert">{marketDataError}</div>
                )}
                {marketData && (
                  <div style={{ marginTop: "var(--space-sm)" }}>
                    {marketData.data.length === 0 ? (
                      <EmptyState
                        title={`No data recorded for ${marketData.ticker}`}
                        description="Nothing has been written on-chain for this ticker yet."
                      />
                    ) : (
                      <table className="blockchain-table">
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Price</th>
                            <th>Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketData.data.map((point, idx) => (
                            <tr key={idx}>
                              <td className="mono">
                                {new Date(
                                  point.timestamp * 1000,
                                ).toLocaleString()}
                              </td>
                              <td className="mono">
                                {point.price.toLocaleString()}
                              </td>
                              <td className="mono">
                                {point.volume.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <div className="blockchain-record-form">
                    <div className="section-title">
                      <h4>Record a data point</h4>
                      <span className="badge badge-info">
                        Admin — sends an on-chain transaction
                      </span>
                    </div>
                    <form onSubmit={submitRecord}>
                      <div className="blockchain-inline-controls">
                        <div className="field">
                          <label htmlFor="rec-ticker">Ticker</label>
                          <input
                            id="rec-ticker"
                            className="input"
                            required
                            value={recordForm.ticker}
                            onChange={(e) =>
                              setRecordForm((f) => ({
                                ...f,
                                ticker: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="ETH"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="rec-price">Price</label>
                          <input
                            id="rec-price"
                            type="number"
                            className="input"
                            required
                            min="0"
                            value={recordForm.price}
                            onChange={(e) =>
                              setRecordForm((f) => ({
                                ...f,
                                price: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="rec-volume">Volume</label>
                          <input
                            id="rec-volume"
                            type="number"
                            className="input"
                            required
                            min="0"
                            value={recordForm.volume}
                            onChange={(e) =>
                              setRecordForm((f) => ({
                                ...f,
                                volume: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <button
                          className="btn btn-primary"
                          type="submit"
                          disabled={recording}
                        >
                          {recording ? "Recording…" : "Record on-chain"}
                        </button>
                      </div>
                    </form>
                    {recordError && (
                      <div className="auth-alert">{recordError}</div>
                    )}
                    {recordSuccess && (
                      <div className="auth-alert auth-alert-success">
                        {recordSuccess}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── QuantumVestToken + QuantumVestOracle ─────────────────── */}
          <div className="grid grid-2">
            <div className="card">
              <div className="section-title">
                <h3>Token balance</h3>
              </div>
              {!status?.contracts?.QuantumVestToken ? (
                <EmptyState
                  title="QuantumVestToken not deployed"
                  description="This contract isn't deployed on the connected network yet."
                />
              ) : (
                <>
                  <form onSubmit={lookupBalance}>
                    <div className="field">
                      <label htmlFor="balance-address">Wallet address</label>
                      <input
                        id="balance-address"
                        className="input mono"
                        value={balanceAddress}
                        onChange={(e) => setBalanceAddress(e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <button
                      className="btn btn-secondary"
                      type="submit"
                      disabled={loadingBalance}
                    >
                      {loadingBalance ? "Looking up…" : "Look up"}
                    </button>
                  </form>
                  {balanceError && (
                    <div className="auth-alert">{balanceError}</div>
                  )}
                  {balanceResult && (
                    <div style={{ marginTop: "var(--space-sm)" }}>
                      <span className="stat-label">Balance</span>
                      <span className="stat-value mono">
                        {parseFloat(balanceResult.balance).toLocaleString()} QVT
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <div className="section-title">
                <h3>Oracle price</h3>
              </div>
              {!status?.contracts?.QuantumVestOracle ? (
                <EmptyState
                  title="QuantumVestOracle not deployed"
                  description="This contract isn't deployed on the connected network yet."
                />
              ) : (
                <>
                  <form onSubmit={lookupOracle}>
                    <div className="field">
                      <label htmlFor="oracle-address">Asset address</label>
                      <input
                        id="oracle-address"
                        className="input mono"
                        value={oracleAddress}
                        onChange={(e) => setOracleAddress(e.target.value)}
                        placeholder="0x..."
                      />
                    </div>
                    <button
                      className="btn btn-secondary"
                      type="submit"
                      disabled={loadingOracle}
                    >
                      {loadingOracle ? "Looking up…" : "Look up"}
                    </button>
                  </form>
                  {oracleError && (
                    <div className="auth-alert">{oracleError}</div>
                  )}
                  {oracleResult && (
                    <div style={{ marginTop: "var(--space-sm)" }}>
                      <span className="stat-label">Price</span>
                      <span className="stat-value mono">
                        {oracleResult.price?.toLocaleString?.() ??
                          oracleResult.price}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Blockchain;
