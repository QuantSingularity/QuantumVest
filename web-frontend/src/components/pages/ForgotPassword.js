import React from "react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { showToast } from "../ui/ToastManager";
import "../../styles/Auth.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address"); return;
    }
    setLoading(true);
    try {
      // Real API call would go here; fall through to demo mode
      await Promise.reject(new Error("demo"));
    } catch {
      // Demo mode
    } finally {
      setLoading(false);
      setSent(true);
      showToast("Reset email sent (demo mode)", "info");
    }
  };

  return (
    <div className="auth-page">
      <motion.div className="auth-card" initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">Q</div>
          <span className="auth-logo-text">QuantumVest</span>
        </div>

        {sent ? (
          <>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle">
              If an account exists for <strong>{email}</strong>, we've sent a
              password reset link.
            </p>
            <Link to="/login" className="btn btn-primary auth-submit" style={{ display: "block", textAlign: "center", marginTop: 16 }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-title">Forgot password?</h1>
            <p className="auth-subtitle">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input id="email" type="email" className={`form-control ${error ? "is-invalid" : ""}`}
                  value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com" autoComplete="email" />
                {error && <p className="field-error">{error}</p>}
              </div>
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <p className="auth-switch">
              <Link to="/login" className="auth-link">Back to Sign In</Link>
            </p>
          </>
        )}
      </motion.div>
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-circle auth-bg-circle-1" />
        <div className="auth-bg-circle auth-bg-circle-2" />
      </div>
    </div>
  );
};

export default ForgotPassword;
