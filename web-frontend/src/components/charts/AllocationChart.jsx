import React, { useMemo } from "react";
import "chart.js/auto";
import { Doughnut } from "react-chartjs-2";
import EmptyState from "../ui/EmptyState";

const PALETTE = [
  "#7c6cff",
  "#22d3ee",
  "#22c55e",
  "#f59e0b",
  "#f43f5e",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
];

const AllocationChart = ({ holdings = [], height = 260 }) => {
  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";

  const data = useMemo(() => {
    const sorted = [...holdings].sort(
      (a, b) => (b.market_value || 0) - (a.market_value || 0),
    );
    return {
      labels: sorted.map((h) => h.asset?.symbol || "-"),
      datasets: [
        {
          data: sorted.map((h) => Number(h.market_value) || 0),
          backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: isDark ? "#12141f" : "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  }, [holdings, isDark]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: isDark ? "#a6acc4" : "#4a4f6a",
          boxWidth: 10,
          usePointStyle: true,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` ${ctx.label}: $${Number(ctx.parsed).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        },
      },
    },
  };

  if (!holdings || holdings.length === 0) {
    return (
      <div style={{ height }}>
        <EmptyState
          title="No holdings yet"
          description="Add a transaction to start building this portfolio's allocation."
        />
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default AllocationChart;
