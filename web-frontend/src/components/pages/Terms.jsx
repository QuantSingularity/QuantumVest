import React from "react";
import "../../styles/StaticPages.css";

const SECTIONS = [
  {
    title: "Acceptance of Terms",
    body: "By creating an account and using QuantumVest, you agree to these Terms of Service and our Privacy Policy.",
  },
  {
    title: "Not Financial Advice",
    body: "QuantumVest provides analytics, risk metrics, and optimization tooling for informational purposes only. Nothing in the platform constitutes financial, investment, or legal advice.",
  },
  {
    title: "Account Responsibilities",
    body: "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.",
  },
  {
    title: "Portfolio & Transaction Data",
    body: "Data you enter (portfolios, transactions, watchlists) is stored to power the features you use. You can delete portfolios and watchlists at any time from the app.",
  },
  {
    title: "Service Availability",
    body: 'QuantumVest is provided "as is" without warranty of any kind. Features such as AI predictions may be in active research and are clearly labeled as such.',
  },
  {
    title: "Changes to These Terms",
    body: "We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.",
  },
];

const Terms = () => (
  <div className="static-page">
    <div className="container static-page-inner">
      <h1>Terms of Service</h1>
      <p className="static-page-meta">Last updated: January 1, 2026</p>
      <div className="card static-page-card">
        {SECTIONS.map(({ title, body }) => (
          <div key={title} className="static-page-section">
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
        <hr className="divider" />
        <p className="text-secondary" style={{ fontSize: "0.9rem" }}>
          Questions? Email us at{" "}
          <a href="mailto:legal@quantumvest.io">legal@quantumvest.io</a>
        </p>
      </div>
    </div>
  </div>
);

export default Terms;
