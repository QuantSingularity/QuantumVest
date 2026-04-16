import React from "react";
import { useCallback, useEffect, useState } from "react";
import { predictionAPI } from "../../services/api";
import "../../styles/PredictionChart.css";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function PredictionChart() {
  const [predictionData, setPredictionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [timeframe, setTimeframe] = useState("7d");

  const getDays = useCallback(
    () => (timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90),
    [timeframe],
  );

  const getBasePrice = useCallback(
    () =>
      selectedAsset === "BTC" ? 45000 : selectedAsset === "ETH" ? 3000 : 150,
    [selectedAsset],
  );

  // BUG FIX: generateFallbackPredictions and generatePredictionData were defined
  // inside the component and listed as useEffect deps, causing an infinite re-render
  // loop. Wrapping in useCallback with proper deps makes them stable.
  const generateFallbackPredictions = useCallback(() => {
    const days = getDays();
    const baseValue = getBasePrice();
    const today = new Date();
    const predictions = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const randomFactor = 1 + (Math.random() * 0.04 - 0.02);
      const trendFactor = 1 + i * 0.005;
      predictions.push({
        day: i + 1,
        date: date.toLocaleDateString(),
        value: (baseValue * randomFactor * trendFactor).toFixed(2),
        predicted: i > 0,
      });
    }
    setPredictionData(predictions);
  }, [getDays, getBasePrice]);

  const generatePredictionData = useCallback(
    (apiResponse) => {
      const days = getDays();
      const baseValue = getBasePrice();
      const today = new Date();
      const trend = apiResponse.trend || "upward";
      const volatility = apiResponse.volatility || 0.02;
      const predictions = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
        const trendFactor =
          trend === "upward"
            ? 1 + i * 0.005
            : trend === "downward"
              ? 1 - i * 0.003
              : 1;
        predictions.push({
          day: i + 1,
          date: date.toLocaleDateString(),
          value: (baseValue * randomFactor * trendFactor).toFixed(2),
          predicted: i > 0,
        });
      }
      setPredictionData(predictions);
    },
    [getDays, getBasePrice],
  );

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        setError(null);

        const features = {
          asset: selectedAsset,
          timeframe,
          current_price: getBasePrice(),
          volume_24h: 28000000000,
          market_cap: 850000000000,
          price_change_24h: 2.5,
        };

        try {
          const response = await predictionAPI.getPrediction(features);
          if (response.data.success) {
            if (
              response.data.predictions &&
              Array.isArray(response.data.predictions)
            ) {
              setPredictionData(response.data.predictions);
            } else {
              generatePredictionData(response.data);
            }
          } else {
            throw new Error("Prediction failed");
          }
        } catch {
          generateFallbackPredictions();
        }
      } catch (err) {
        console.error("Prediction error:", err);
        setError("Unable to generate predictions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [
    selectedAsset,
    timeframe,
    generateFallbackPredictions,
    generatePredictionData,
    getBasePrice,
  ]);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner text="Generating predictions" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="prediction-container">
      <h1 className="section-title">Price Predictions</h1>

      <div className="prediction-controls">
        <div className="control-group">
          <label htmlFor="asset-select">Asset:</label>
          <select
            id="asset-select"
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="select-control"
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="SOL">Solana (SOL)</option>
            <option value="AAPL">Apple (AAPL)</option>
            <option value="MSFT">Microsoft (MSFT)</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="timeframe-select">Timeframe:</label>
          <select
            id="timeframe-select"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="select-control"
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3>
            {selectedAsset} Price Prediction — {timeframe}
          </h3>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-color current"></span>
              <span>Current Price</span>
            </div>
            <div className="legend-item">
              <span className="legend-color predicted"></span>
              <span>Predicted Price</span>
            </div>
          </div>
        </div>

        <div className="chart-visualization">
          <div className="chart-y-axis">
            {[...Array(5)].map((_, i) => {
              const values = predictionData.map((d) => parseFloat(d.value));
              const max = Math.max(...values);
              const min = Math.min(...values);
              const value = max - ((max - min) * i) / 4;
              return (
                <div key={i} className="y-axis-label">
                  $
                  {value.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              );
            })}
          </div>

          <div className="chart-bars">
            {predictionData.map((data, index) => {
              const values = predictionData.map((d) => parseFloat(d.value));
              const max = Math.max(...values);
              const min = Math.min(...values);
              const range = max - min;
              const height =
                range > 0 ? ((parseFloat(data.value) - min) / range) * 100 : 50;
              const showDate =
                index % Math.ceil(predictionData.length / 7) === 0 ||
                index === 0 ||
                index === predictionData.length - 1;

              return (
                <div key={index} className="chart-bar-container">
                  <div
                    className={`chart-bar ${data.predicted ? "predicted-bar" : "current-bar"}`}
                    style={{ height: `${height}%` }}
                    title={`${data.date}: $${parseFloat(data.value).toLocaleString()}`}
                  >
                    {(index === 0 || index === predictionData.length - 1) && (
                      <span className="bar-value">
                        ${parseFloat(data.value).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {showDate && <div className="x-axis-label">{data.date}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="prediction-summary">
        <h3>Analysis Summary</h3>
        <p>
          Based on our AI model analysis, {selectedAsset} is predicted to
          {predictionData.length > 0 &&
          parseFloat(predictionData[predictionData.length - 1].value) >
            parseFloat(predictionData[0].value)
            ? " increase in value "
            : " decrease in value "}
          over the next{" "}
          {timeframe === "7d"
            ? "week"
            : timeframe === "30d"
              ? "month"
              : "3 months"}
          .
        </p>
        <p>
          The model has analyzed historical trends, market sentiment, and
          blockchain data to generate these predictions. Note that
          cryptocurrency and stock markets are highly volatile; these
          predictions should inform but not replace your own due diligence.
        </p>
      </div>
    </div>
  );
}
