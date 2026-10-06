import React, { useCallback, useEffect, useState } from "react";
import AssetSearchBox from "../ui/AssetSearchBox";
import LoadingSpinner from "../ui/LoadingSpinner";
import ForecastChart from "../charts/ForecastChart";
import { predictionAPI } from "../../services/api";
import { getErrorMessage } from "../../utils/helpers";
import {
  assetTypeLabel,
  formatCurrency,
  formatNumber,
  formatSignedPercent,
  trendClass,
} from "../../utils/finance";
import "../../styles/Predictions.css";

const HORIZONS = [5, 7, 14, 30];

const DIRECTION_LABEL = { up: "Upward", down: "Downward", neutral: "Neutral" };

const pct = (value) =>
  value === null || value === undefined
    ? "-"
    : `${(Number(value) * 100).toFixed(1)}%`;

const Predictions = () => {
  const [asset, setAsset] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const load = useCallback(async (selected, horizon) => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await predictionAPI.get(selected.symbol, {
        asset_type: selected.asset_type,
        days: horizon,
      });
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Forecast unavailable");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate a forecast."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(asset, days);
  }, [asset, days, load]);

  const metrics = result?.model?.metrics || {};
  const beatsNaive = result?.model?.beats_naive;

  return (
    <div className="predictions-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">AI Predictions</span>
          <h2>Market forecasting</h2>
          <p>
            Model-backed price forecasts with uncertainty bands and held-out
            accuracy.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="predictions-controls">
          <div className="predictions-search">
            <AssetSearchBox
              onSelect={setAsset}
              placeholder="Search an asset to forecast"
            />
          </div>
          <div className="predictions-horizons" role="group" aria-label="Horizon">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                className={`btn btn-sm ${days === h ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDays(h)}
                disabled={loading}
              >
                {h}d
              </button>
            ))}
          </div>
        </div>

        {!asset && !loading && (
          <div className="predictions-empty">
            <h4>Select an asset</h4>
            <p>
              Pick a stock or crypto asset to generate a forecast. The first
              request for an asset trains a model, which can take a few
              seconds.
            </p>
          </div>
        )}

        {loading && (
          <div className="predictions-empty">
            <LoadingSpinner />
            <p>Preparing forecast for {asset?.symbol}</p>
          </div>
        )}

        {error && !loading && <div className="auth-alert">{error}</div>}

        {result && !loading && (
          <div className="predictions-result">
            <div className="predictions-summary">
              <div>
                <span className="text-secondary">
                  {result.symbol} ({assetTypeLabel(result.asset_type)})
                </span>
                <h3>{formatCurrency(result.last_price)}</h3>
                <span className="text-secondary">
                  Last close {result.last_timestamp}
                </span>
              </div>
              <div>
                <span className="text-secondary">
                  Expected move over {result.steps} days
                </span>
                <h3 className={trendClass(result.expected_return)}>
                  {formatSignedPercent(result.expected_return * 100)}
                </h3>
                <span className="badge badge-info">
                  {DIRECTION_LABEL[result.direction] || result.direction}
                </span>
              </div>
              <div>
                <span className="text-secondary">Held-out accuracy</span>
                <h3>{pct(metrics.directional_accuracy)}</h3>
                <span className="text-secondary">
                  direction hit rate on {metrics.samples ?? 0} days
                </span>
              </div>
            </div>

            {!beatsNaive && (
              <div className="auth-alert">
                This model did not beat a no-change baseline on held-out data.
                Treat the forecast as indicative only.
              </div>
            )}

            <ForecastChart
              lastDate={result.last_timestamp}
              lastPrice={result.last_price}
              forecast={result.forecast}
            />

            <div className="table-scroll">
              <table className="qv-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Predicted price</th>
                    <th>95% range</th>
                    <th>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {result.forecast.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td className="mono">{formatCurrency(row.predicted_price)}</td>
                      <td className="mono">
                        {formatCurrency(row.lower)} to {formatCurrency(row.upper)}
                      </td>
                      <td className={`mono ${trendClass(row.cumulative_return)}`}>
                        {formatSignedPercent(row.cumulative_return * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-secondary predictions-footnote">
              Model: {result.model.type}
              {result.model.components?.length > 1
                ? ` (${result.model.components.join(", ")})`
                : ""}
              , skill vs naive {formatNumber((metrics.skill_vs_naive ?? 0) * 100, 1)}%.
              Forecasts are statistical estimates, not financial advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Predictions;
