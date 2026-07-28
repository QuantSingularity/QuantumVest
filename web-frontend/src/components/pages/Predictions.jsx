import React, { useState } from "react";
import AssetSearchBox from "../ui/AssetSearchBox";
import "../../styles/Predictions.css";

const ROADMAP = [
  {
    title: "GE-LSTM-Attn forecasting",
    description:
      "Graph-enhanced LSTM with attention and GraphSHAP explainability, currently in research.",
  },
  {
    title: "Quantum Graph Reinforcement Learning",
    description:
      "QGRL-based liquidity and allocation research, theoretical pending quantum hardware access.",
  },
  {
    title: "Live inference API",
    description:
      "Once validated, models will be exposed through a versioned /predictions endpoint.",
  },
];

const Predictions = () => {
  const [asset, setAsset] = useState(null);

  return (
    <div className="predictions-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">AI Predictions</span>
          <h2>Market forecasting</h2>
          <p>Search any asset to check forecast availability.</p>
        </div>
      </div>

      <div className="card">
        <AssetSearchBox
          onSelect={setAsset}
          placeholder="Search an asset to check forecast availability…"
        />

        <div className="predictions-empty">
          <div
            className="empty-state-icon"
            style={{ margin: "0 auto var(--space-sm)" }}
          >
            <span style={{ fontSize: "1.5rem" }}>🧠</span>
          </div>
          {asset ? (
            <>
              <h4>No live forecast for {asset.symbol} yet</h4>
              <p>
                QuantumVest&apos;s prediction models are still in research and
                haven&apos;t been connected to a production inference endpoint.
                We&apos;d rather show nothing than a number we can&apos;t stand
                behind.
              </p>
            </>
          ) : (
            <>
              <h4>Prediction engine — in research</h4>
              <p>
                This page will show real, model-backed forecasts once the
                inference API ships. Until then we won&apos;t fabricate numbers
                here.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>Research roadmap</h3>
        </div>
        <div className="predictions-roadmap">
          {ROADMAP.map((r) => (
            <div className="predictions-roadmap-item" key={r.title}>
              <div className="auth-highlight-dot" />
              <div>
                <h4>{r.title}</h4>
                <p>{r.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Predictions;
