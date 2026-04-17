import React from "react";
import { useState } from "react";
import { portfolioAPI } from "../../services/api";
import { showToast } from "../ui/ToastManager";
import "../../styles/PortfolioOptimization.css";

export default function PortfolioOptimization() {
  const [risk, setRisk] = useState(5);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([
    { symbol: "BTC", name: "Bitcoin", allocation: 25, color: "#f7931a" },
    { symbol: "ETH", name: "Ethereum", allocation: 20, color: "#627eea" },
    { symbol: "AAPL", name: "Apple", allocation: 15, color: "#999999" },
    { symbol: "MSFT", name: "Microsoft", allocation: 15, color: "#00a1f1" },
    { symbol: "GOOGL", name: "Google", allocation: 10, color: "#4285f4" },
    { symbol: "AMZN", name: "Amazon", allocation: 10, color: "#ff9900" },
    { symbol: "CASH", name: "Cash", allocation: 5, color: "#85bb65" },
  ]);

  const handleRiskChange = (e) => {
    setRisk(parseInt(e.target.value, 10));
  };

  const handleAssetAllocationChange = (index, newValue) => {
    const updatedAssets = [...assets];
    const newAllocation = parseInt(newValue, 10);

    updatedAssets[index].allocation = newAllocation;

    // Recalculate to ensure total is 100%
    const total = updatedAssets.reduce(
      (sum, asset) => sum + asset.allocation,
      0,
    );

    if (total !== 100) {
      const diff = total - 100;
      // Distribute the difference among other assets proportionally
      const otherAssets = updatedAssets.filter((_, i) => i !== index);
      const otherTotal = otherAssets.reduce((sum, a) => sum + a.allocation, 0);

      if (otherTotal > 0) {
        otherAssets.forEach((asset) => {
          const assetIndex = updatedAssets.findIndex(
            (a) => a.symbol === asset.symbol,
          );
          const proportion = asset.allocation / otherTotal;
          const adjustment = Math.round(diff * proportion);
          updatedAssets[assetIndex].allocation = Math.max(
            0,
            asset.allocation - adjustment,
          );
        });
      }
    }

    // Final adjustment to ensure exactly 100%
    const finalTotal = updatedAssets.reduce(
      (sum, asset) => sum + asset.allocation,
      0,
    );
    if (finalTotal !== 100) {
      const adjustment = 100 - finalTotal;
      const lastAssetIndex = updatedAssets.findIndex((_, i) => i !== index);
      if (lastAssetIndex >= 0) {
        updatedAssets[lastAssetIndex].allocation += adjustment;
      }
    }

    setAssets(updatedAssets);
  };

  const optimize = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestData = {
        assets: assets.map((a) => a.symbol),
        weights: assets.map((a) => a.allocation / 100),
        riskLevel: risk,
      };

      try {
        const response = await portfolioAPI.optimizePortfolio(requestData);

        if (response.data.success) {
          // Transform the response into a more usable format
          const optimizedAssets = [...assets];
          const optimalWeights = response.data.optimal_weights;

          optimalWeights.forEach((weight, index) => {
            if (index < optimizedAssets.length) {
              optimizedAssets[index].allocation = Math.round(weight * 100);
            }
          });

          setResult({
            assets: optimizedAssets,
            expectedReturn: response.data.expected_return,
            volatility: response.data.volatility,
            sharpeRatio: response.data.sharpe_ratio,
          });

          showToast("Portfolio optimized successfully!", "success");
        } else {
          throw new Error(response.data.error || "Optimization failed");
        }
      } catch (apiError) {
        console.warn(
          "API optimization unavailable, using fallback:",
          apiError.message,
        );
        // Use fallback optimization
        optimizeFallback();
      }
    } catch (err) {
      console.error("Optimization error:", err);
      setError(`Error during optimization: ${err.message}`);
      showToast("Optimization failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const optimizeFallback = () => {
    // Create optimized allocation based on risk level
    const optimizedAssets = [...assets];

    if (risk <= 3) {
      // Low risk - more conservative allocation
      optimizedAssets[0].allocation = 15; // BTC
      optimizedAssets[1].allocation = 10; // ETH
      optimizedAssets[2].allocation = 20; // AAPL
      optimizedAssets[3].allocation = 20; // MSFT
      optimizedAssets[4].allocation = 15; // GOOGL
      optimizedAssets[5].allocation = 10; // AMZN
      optimizedAssets[6].allocation = 10; // CASH
    } else if (risk <= 7) {
      // Medium risk
      optimizedAssets[0].allocation = 25; // BTC
      optimizedAssets[1].allocation = 20; // ETH
      optimizedAssets[2].allocation = 15; // AAPL
      optimizedAssets[3].allocation = 15; // MSFT
      optimizedAssets[4].allocation = 10; // GOOGL
      optimizedAssets[5].allocation = 10; // AMZN
      optimizedAssets[6].allocation = 5; // CASH
    } else {
      // High risk - more aggressive allocation
      optimizedAssets[0].allocation = 35; // BTC
      optimizedAssets[1].allocation = 30; // ETH
      optimizedAssets[2].allocation = 10; // AAPL
      optimizedAssets[3].allocation = 10; // MSFT
      optimizedAssets[4].allocation = 5; // GOOGL
      optimizedAssets[5].allocation = 8; // AMZN
      optimizedAssets[6].allocation = 2; // CASH
    }

    setResult({
      assets: optimizedAssets,
      expectedReturn: (7 + risk * 0.8).toFixed(2),
      volatility: (5 + risk * 0.7).toFixed(2),
      sharpeRatio: (1.2 + risk * 0.1).toFixed(2),
    });

    showToast("Portfolio optimized (demo mode)!", "info");
  };

  const getTotalAllocation = () => {
    return assets.reduce((sum, asset) => sum + asset.allocation, 0);
  };

  return (
    <div className="portfolio-container">
      <h1 className="section-title">Portfolio Optimization</h1>

      <div className="portfolio-content">
        <div className="current-allocation">
          <h2>Current Allocation</h2>

          <div className="allocation-total">
            <p>
              Total:{" "}
              <strong
                className={getTotalAllocation() === 100 ? "valid" : "invalid"}
              >
                {getTotalAllocation()}%
              </strong>
              {getTotalAllocation() !== 100 && (
                <span className="allocation-warning"> (Must equal 100%)</span>
              )}
            </p>
          </div>

          <div className="asset-list">
            {assets.map((asset, index) => (
              <div className="asset-item" key={index}>
                <div className="asset-header">
                  <div
                    className="asset-symbol"
                    style={{ backgroundColor: asset.color }}
                  >
                    {asset.symbol}
                  </div>
                  <div className="asset-name">{asset.name}</div>
                  <div className="asset-allocation">{asset.allocation}%</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={asset.allocation}
                  onChange={(e) =>
                    handleAssetAllocationChange(index, e.target.value)
                  }
                  className="allocation-slider"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="optimization-controls">
          <h2>Risk Tolerance</h2>
          <div className="risk-slider-container">
            <span className="risk-label">Conservative</span>
            <input
              type="range"
              min="1"
              max="10"
              value={risk}
              onChange={handleRiskChange}
              className="risk-slider"
            />
            <span className="risk-label">Aggressive</span>
            <div className="risk-value">Level: {risk}</div>
          </div>

          <p className="risk-description">
            {risk <= 3 &&
              "Conservative: Focus on stable, low-volatility assets with lower returns."}
            {risk > 3 &&
              risk <= 7 &&
              "Moderate: Balanced approach with mix of stable and growth assets."}
            {risk > 7 &&
              "Aggressive: Higher allocation to volatile assets with potential for higher returns."}
          </p>

          <button
            className="optimize-button"
            onClick={optimize}
            disabled={loading || getTotalAllocation() !== 100}
          >
            {loading ? "Optimizing..." : "Optimize Portfolio"}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>

        {result && (
          <div className="optimization-result">
            <h2>Optimized Portfolio</h2>

            <div className="result-metrics">
              <div className="metric-card">
                <h3>Expected Return</h3>
                <p className="metric-value positive">
                  +{result.expectedReturn}%
                </p>
                <p className="metric-label">Annual</p>
              </div>
              <div className="metric-card">
                <h3>Volatility</h3>
                <p className="metric-value">{result.volatility}%</p>
                <p className="metric-label">Standard Deviation</p>
              </div>
              <div className="metric-card">
                <h3>Sharpe Ratio</h3>
                <p className="metric-value">{result.sharpeRatio}</p>
                <p className="metric-label">Risk-Adjusted Return</p>
              </div>
            </div>

            <div className="optimized-allocation">
              <h3>Recommended Allocation</h3>

              <div className="asset-list optimized-list">
                {result.assets.map((asset, index) => (
                  <div className="asset-item optimized-item" key={index}>
                    <div className="asset-header">
                      <div
                        className="asset-symbol"
                        style={{ backgroundColor: asset.color }}
                      >
                        {asset.symbol}
                      </div>
                      <div className="asset-name">{asset.name}</div>
                      <div className="asset-allocation">
                        {asset.allocation}%
                      </div>
                      {Math.abs(asset.allocation - assets[index].allocation) >
                        0 && (
                        <div
                          className={`allocation-change ${asset.allocation > assets[index].allocation ? "positive" : "negative"}`}
                        >
                          {asset.allocation > assets[index].allocation
                            ? "+"
                            : ""}
                          {asset.allocation - assets[index].allocation}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
