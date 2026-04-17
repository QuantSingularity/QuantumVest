import React from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { motion } from "framer-motion";
import "../../styles/Analytics.css";
import { Bar, Line, Pie } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const Analytics = () => {
  // Sample data for charts
  const lineChartData = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Portfolio Performance",
        data: [65, 59, 80, 81, 56, 55, 72, 78, 80, 85, 91, 95],
        fill: false,
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        borderColor: "rgba(37, 99, 235, 1)",
        tension: 0.4,
      },
      {
        label: "Market Index",
        data: [70, 62, 75, 70, 50, 58, 69, 74, 78, 80, 85, 88],
        fill: false,
        backgroundColor: "rgba(124, 58, 237, 0.2)",
        borderColor: "rgba(124, 58, 237, 1)",
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: ["Stocks", "Bonds", "Real Estate", "Commodities", "Crypto", "Cash"],
    datasets: [
      {
        label: "Current Allocation",
        data: [35, 20, 15, 10, 15, 5],
        backgroundColor: [
          "rgba(37, 99, 235, 0.7)",
          "rgba(124, 58, 237, 0.7)",
          "rgba(14, 165, 233, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(245, 158, 11, 0.7)",
          "rgba(239, 68, 68, 0.7)",
        ],
      },
      {
        label: "Recommended Allocation",
        data: [30, 25, 20, 5, 10, 10],
        backgroundColor: [
          "rgba(37, 99, 235, 0.3)",
          "rgba(124, 58, 237, 0.3)",
          "rgba(14, 165, 233, 0.3)",
          "rgba(16, 185, 129, 0.3)",
          "rgba(245, 158, 11, 0.3)",
          "rgba(239, 68, 68, 0.3)",
        ],
      },
    ],
  };

  const pieChartData = {
    labels: ["North America", "Europe", "Asia", "Emerging Markets", "Other"],
    datasets: [
      {
        data: [45, 25, 15, 10, 5],
        backgroundColor: [
          "rgba(37, 99, 235, 0.7)",
          "rgba(124, 58, 237, 0.7)",
          "rgba(14, 165, 233, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(245, 158, 11, 0.7)",
        ],
        borderColor: [
          "rgba(37, 99, 235, 1)",
          "rgba(124, 58, 237, 1)",
          "rgba(14, 165, 233, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(245, 158, 11, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Portfolio Performance vs Market Index",
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Asset Allocation",
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
      },
      title: {
        display: true,
        text: "Geographic Distribution",
      },
    },
  };

  // Stats data
  const stats = [
    {
      label: "Total Return",
      value: "+24.8%",
      change: "+2.3%",
      isPositive: true,
    },
    { label: "Annual Yield", value: "3.2%", change: "+0.4%", isPositive: true },
    { label: "Risk Score", value: "68/100", change: "-5", isPositive: false },
    { label: "Sharpe Ratio", value: "1.8", change: "+0.2", isPositive: true },
  ];

  return (
    <div className="analytics-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="section-title">Analytics Dashboard</h2>

        {/* Stats Cards */}
        <div className="grid grid-4 mb-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="card-title mb-0">{stat.label}</h3>
                <span
                  className={`badge ${stat.isPositive ? "badge-success" : "badge-danger"}`}
                >
                  {stat.change}
                </span>
              </div>
              <p
                className="text-primary"
                style={{ fontSize: "2rem", fontWeight: "600" }}
              >
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Performance Chart */}
        <motion.div
          className="card mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h3 className="card-title">Performance Analysis</h3>
          <div style={{ height: "300px" }}>
            <Line data={lineChartData} options={lineOptions} />
          </div>
        </motion.div>

        {/* Asset Allocation and Geographic Distribution */}
        <div className="grid grid-2 mb-4">
          <motion.div
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <h3 className="card-title">Asset Allocation</h3>
            <div style={{ height: "300px" }}>
              <Bar data={barChartData} options={barOptions} />
            </div>
          </motion.div>

          <motion.div
            className="card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <h3 className="card-title">Geographic Distribution</h3>
            <div style={{ height: "300px" }}>
              <Pie data={pieChartData} options={pieOptions} />
            </div>
          </motion.div>
        </div>

        {/* Risk Analysis */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <h3 className="card-title">Risk Analysis</h3>
          <div className="grid grid-3 mb-3">
            <div className="d-flex flex-column">
              <span className="text-secondary mb-1">Volatility</span>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: "80%",
                    height: "8px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "65%",
                      height: "100%",
                      backgroundColor: "var(--warning-color)",
                      borderRadius: "4px",
                    }}
                  ></div>
                </div>
                <span className="ml-2" style={{ marginLeft: "8px" }}>
                  65%
                </span>
              </div>
            </div>
            <div className="d-flex flex-column">
              <span className="text-secondary mb-1">Drawdown</span>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: "80%",
                    height: "8px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "42%",
                      height: "100%",
                      backgroundColor: "var(--success-color)",
                      borderRadius: "4px",
                    }}
                  ></div>
                </div>
                <span className="ml-2" style={{ marginLeft: "8px" }}>
                  42%
                </span>
              </div>
            </div>
            <div className="d-flex flex-column">
              <span className="text-secondary mb-1">Beta</span>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: "80%",
                    height: "8px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "78%",
                      height: "100%",
                      backgroundColor: "var(--danger-color)",
                      borderRadius: "4px",
                    }}
                  ></div>
                </div>
                <span className="ml-2" style={{ marginLeft: "8px" }}>
                  78%
                </span>
              </div>
            </div>
          </div>
          <p className="text-secondary">
            Your portfolio shows moderate volatility with a beta of 0.78
            relative to the market. The maximum drawdown over the past year was
            12.3%, which is within acceptable limits for your risk profile.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Analytics;
