import React, { useMemo } from "react";
import "chart.js/auto";
import { Line } from "react-chartjs-2";
import EmptyState from "../ui/EmptyState";

// Renders a portfolio value history line chart. Gracefully shows an empty
// state when the backend has no PortfolioPerformance snapshots yet (common
// for brand-new portfolios - daily snapshots accrue over time).
const PerformanceChart = ({ dates = [], values = [], height = 260 }) => {
  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";

  const data = useMemo(() => {
    const positive =
      values.length < 2 || values[values.length - 1] >= values[0];
    const lineColor = positive ? "#22c55e" : "#f43f5e";
    return {
      labels: dates.map((d) =>
        new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      ),
      datasets: [
        {
          label: "Portfolio value",
          data: values,
          borderColor: lineColor,
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const { ctx: canvasCtx, chartArea } = chart;
            if (!chartArea) return "transparent";
            const gradient = canvasCtx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom,
            );
            gradient.addColorStop(
              0,
              positive ? "rgba(34,197,94,0.25)" : "rgba(244,63,94,0.25)",
            );
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            return gradient;
          },
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
      ],
    };
  }, [dates, values]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#12141f" : "#ffffff",
        titleColor: isDark ? "#f5f6fb" : "#12131f",
        bodyColor: isDark ? "#a6acc4" : "#4a4f6a",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,17,33,0.1)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) =>
            ` $${Number(ctx.parsed.y).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? "#6b7191" : "#7b809c", maxTicksLimit: 7 },
      },
      y: {
        grid: {
          color: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,17,33,0.06)",
        },
        ticks: {
          color: isDark ? "#6b7191" : "#7b809c",
          callback: (v) =>
            `$${Number(v).toLocaleString(undefined, { notation: "compact" })}`,
        },
      },
    },
  };

  if (!values || values.length < 2) {
    return (
      <div style={{ height }}>
        <EmptyState
          title="No performance history yet"
          description="Daily value snapshots will appear here once your portfolio has been tracked for a few days."
        />
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default PerformanceChart;
