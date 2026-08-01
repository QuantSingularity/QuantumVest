import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "../../../styles/Homepage.css";

const FEATURES = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    title: "Multi-Portfolio Management",
    description:
      "Track holdings and transactions across as many portfolios as you need, in multiple currencies.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Institutional Risk Analytics",
    description:
      "Historical, parametric, and Monte Carlo Value-at-Risk alongside Sharpe, Sortino, and drawdown metrics.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
        <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" />
      </svg>
    ),
    title: "Mean-Variance Optimization",
    description:
      "Get data-driven allocation recommendations built on modern portfolio theory.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Real-Time Watchlists",
    description:
      "Organize any stock, crypto, ETF, or bond into watchlists and act the moment an opportunity appears.",
  },
];

const STEPS = [
  {
    title: "Create your account",
    description: "Sign up in under a minute - no credit card required.",
  },
  {
    title: "Build a portfolio",
    description:
      "Create a portfolio and log buy, sell, and dividend transactions.",
  },
  {
    title: "Analyze your risk",
    description:
      "Run VaR, CVaR, and volatility analysis on your real return history.",
  },
  {
    title: "Optimize allocations",
    description:
      "Get mean-variance optimized weight recommendations for your holdings.",
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const Homepage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="homepage-container">
      <section className="hero-section">
        <div className="hero-content">
          <motion.span
            className="section-eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            AI-Powered Investment Platform
          </motion.span>
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Invest with clarity, backed by{" "}
            <span className="text-gradient">real data</span>.
          </motion.h1>
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Portfolio construction, institutional-grade risk analytics, and
            mean-variance optimization - all in one platform built for serious
            investors.
          </motion.p>
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Free Account
            </Link>
            <button
              className="btn btn-outline btn-lg"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              See Features
            </button>
          </motion.div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-glow" />
          <svg
            width="480"
            height="360"
            viewBox="0 0 480 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="hero-svg"
          >
            <path
              d="M20,240 C120,120 160,300 240,180 C320,60 360,220 460,140"
              stroke="url(#grad1)"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M20,280 C120,200 200,320 280,220 C360,120 400,260 460,200"
              stroke="url(#grad2)"
              strokeWidth="2"
              strokeDasharray="6,6"
              fill="none"
              opacity="0.6"
            />
            <circle cx="120" cy="160" r="5" fill="#7c6cff" />
            <circle cx="240" cy="180" r="7" fill="#22d3ee" />
            <circle cx="360" cy="100" r="5" fill="#7c6cff" />
            <defs>
              <linearGradient id="grad1" x1="0" y1="0" x2="480" y2="0">
                <stop offset="0%" stopColor="#7c6cff" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="grad2" x1="0" y1="0" x2="480" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#7c6cff" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <span className="section-eyebrow">Features</span>
          <h2>Everything you need to manage risk</h2>
        </div>
        <motion.div
          className="features-grid"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {FEATURES.map((f) => (
            <motion.div
              className="card card-hover feature-card"
              variants={fadeInUp}
              key={f.title}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-description">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="how-it-works-section" id="how-it-works">
        <div className="section-heading">
          <span className="section-eyebrow">How it works</span>
          <h2>From sign-up to insight in minutes</h2>
        </div>
        <div className="steps-container">
          {STEPS.map((step, i) => (
            <motion.div
              className="step-item"
              key={step.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="step-number">{i + 1}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-container glass-panel">
          <h2 className="cta-title">Start managing risk like a professional</h2>
          <p className="cta-description">
            Create a free account and connect your first portfolio in minutes.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
