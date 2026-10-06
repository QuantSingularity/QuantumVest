import React, { useMemo } from "react";
import "chart.js/auto";
import { Line } from "react-chartjs-2";

const ForecastChart = ({
  lastDate,
  lastPrice,
  forecast = [],
  height = 280,
}) => {
  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";

  const data = useMemo(() => {
    const labels = [lastDate, ...forecast.map((f) => f.date)];
    const predicted = [lastPrice, ...forecast.map((f) => f.predicted_price)];
    const upper = [lastPrice, ...forecast.map((f) => f.upper)];
    const lower = [lastPrice, ...forecast.map((f) => f.lower)];
    return {
      labels: labels.map((d) =>
        new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      ),
      datasets: [
        {
          label: "Upper bound",
          data: upper,
          borderColor: "transparent",
          pointRadius: 0,
          fill: false,
        },
        {
          label: "Lower bound",
          data: lower,
          borderColor: "transparent",
          backgroundColor: "rgba(99,102,241,0.15)",
          pointRadius: 0,
          fill: "-1",
        },
        {
          label: "Forecast",
          data: predicted,
          borderColor: "#6366f1",
          backgroundColor: "#6366f1",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 3,
          fill: false,
        },
      ],
    };
  }, [lastDate, lastPrice, forecast]);

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
            ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? "#6b7191" : "#7b809c", maxTicksLimit: 8 },
      },
      y: {
        grid: {
          color: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,17,33,0.06)",
        },
        ticks: { color: isDark ? "#6b7191" : "#7b809c" },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default ForecastChart;
