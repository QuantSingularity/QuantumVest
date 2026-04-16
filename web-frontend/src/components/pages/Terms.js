import React from "react";
import { motion } from "framer-motion";

const sections = [
  {
    title: "Acceptance of Terms",
    body: "By accessing or using QuantumVest, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our platform.",
  },
  {
    title: "Investment Disclaimer",
    body: "QuantumVest provides AI-generated predictions and analytics for informational purposes only. Nothing on this platform constitutes financial advice. All investment decisions are solely your responsibility.",
  },
  {
    title: "Account Responsibilities",
    body: "You are responsible for maintaining the confidentiality of your credentials and all activities under your account. Notify us immediately of any unauthorized access.",
  },
  {
    title: "Prohibited Use",
    body: "You may not use QuantumVest to engage in market manipulation, money laundering, or any activity that violates applicable laws or regulations.",
  },
  {
    title: "Intellectual Property",
    body: "All platform content, including AI models, algorithms, and UI, is the exclusive property of QuantumVest, Inc. and is protected by applicable IP laws.",
  },
  {
    title: "Limitation of Liability",
    body: "QuantumVest shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform or reliance on any predictions.",
  },
  {
    title: "Termination",
    body: "We reserve the right to suspend or terminate your account for violations of these terms, with or without notice, at our sole discretion.",
  },
];

const Terms = () => (
  <div className="profile-page">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h1 className="section-title">Terms of Service</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
        Last updated: January 1, 2025
      </p>
      <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
        {sections.map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 28 }}>
            <h3 style={{ marginBottom: 8 }}>{title}</h3>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>{body}</p>
          </div>
        ))}
        <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid var(--border-color)" }} />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Questions? Contact{" "}
          <a href="mailto:legal@quantumvest.io" style={{ color: "var(--primary-color)" }}>
            legal@quantumvest.io
          </a>
        </p>
      </div>
    </motion.div>
  </div>
);

export default Terms;
