import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "../../styles/Auth.css";

const HIGHLIGHTS = [
  {
    title: "AI-driven portfolio intelligence",
    description:
      "Optimize allocations across stocks, crypto, bonds, and more with Markowitz mean-variance optimization.",
  },
  {
    title: "Institutional-grade risk analytics",
    description:
      "Historical, parametric, and Monte Carlo Value-at-Risk, plus Sharpe, Sortino, and drawdown metrics.",
  },
  {
    title: "Real-time watchlists",
    description:
      "Track any asset across markets and act the moment an opportunity appears.",
  },
];

const AuthLayout = ({ children, eyebrow = "Welcome to QuantumVest" }) => {
  return (
    <div className="auth-page">
      <div className="auth-showcase">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">Q</div>
          <span className="auth-logo-text">QuantumVest</span>
        </Link>

        <div className="auth-showcase-copy">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1>Invest with clarity, backed by data.</h1>
          <p>
            One platform for portfolio construction, risk management, and market
            intelligence - built for serious investors.
          </p>

          <div className="auth-highlights">
            {HIGHLIGHTS.map((h) => (
              <div className="auth-highlight" key={h.title}>
                <div className="auth-highlight-dot" />
                <div>
                  <h4>{h.title}</h4>
                  <p>{h.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-bg" aria-hidden="true">
          <div className="auth-bg-circle auth-bg-circle-1" />
          <div className="auth-bg-circle auth-bg-circle-2" />
        </div>
      </div>

      <div className="auth-form-side">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Link to="/" className="auth-logo auth-logo-mobile">
            <div className="auth-logo-icon">Q</div>
            <span className="auth-logo-text">QuantumVest</span>
          </Link>
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
