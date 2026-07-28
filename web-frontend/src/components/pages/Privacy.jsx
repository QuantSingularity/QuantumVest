import React from "react";
import "../../styles/StaticPages.css";

const SECTIONS = [
  {
    title: "Information We Collect",
    body: "We collect information you provide directly (name, email, portfolio data) and information generated through your use of the platform (usage analytics, session data).",
  },
  {
    title: "How We Use Your Information",
    body: "We use collected data to provide and improve the service, run risk and portfolio analytics you request, personalize your experience, and communicate important updates.",
  },
  {
    title: "Data Security",
    body: "Passwords are hashed and access to your account is protected by token-based authentication. We recommend using a strong, unique password for your QuantumVest account.",
  },
  {
    title: "Market & Asset Data",
    body: "Asset and pricing data shown in the app is sourced for informational purposes. QuantumVest does not execute trades on your behalf.",
  },
  {
    title: "Third-Party Services",
    body: "We do not sell personal information to third parties for marketing purposes.",
  },
  {
    title: "Your Rights",
    body: "You can review and update your profile information at any time from your account settings, or contact us to request data deletion.",
  },
];

const Privacy = () => (
  <div className="static-page">
    <div className="container static-page-inner">
      <h1>Privacy Policy</h1>
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
          <a href="mailto:privacy@quantumvest.io">privacy@quantumvest.io</a>
        </p>
      </div>
    </div>
  </div>
);

export default Privacy;
