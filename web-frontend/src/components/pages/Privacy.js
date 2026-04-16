import React from "react";
import { motion } from "framer-motion";
import "../../styles/NotFound.css";

const sections = [
  {
    title: "Information We Collect",
    body: "We collect information you provide directly (name, email, portfolio data) and information generated through your use of our platform (analytics, usage patterns).",
  },
  {
    title: "How We Use Your Information",
    body: "We use collected data to provide and improve our services, generate AI-powered predictions, personalize your experience, and communicate important updates.",
  },
  {
    title: "Data Security",
    body: "We employ industry-standard encryption (AES-256) and secure authentication protocols. All portfolio data is stored in compliance with SOC 2 Type II standards.",
  },
  {
    title: "Blockchain Data",
    body: "Blockchain transaction data referenced by QuantumVest is publicly available on-chain. We do not store private keys or wallet credentials.",
  },
  {
    title: "Third-Party Services",
    body: "We may share anonymized, aggregated data with analytics partners. We never sell personal information to third parties for marketing purposes.",
  },
  {
    title: "Your Rights",
    body: "You have the right to access, correct, or delete your personal data at any time. Contact us at privacy@quantumvest.io to exercise these rights.",
  },
];

const Privacy = () => (
  <div className="profile-page">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h1 className="section-title">Privacy Policy</h1>
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
          Questions? Email us at{" "}
          <a href="mailto:privacy@quantumvest.io" style={{ color: "var(--primary-color)" }}>
            privacy@quantumvest.io
          </a>
        </p>
      </div>
    </motion.div>
  </div>
);

export default Privacy;
