import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../layout/AuthLayout";
import api from "../../services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sent | unavailable
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return setError("Email is required");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address");

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setStatus("sent");
    } catch (err) {
      if (err?.response?.status === 404) {
        setStatus("unavailable");
      } else {
        // For any other outcome we intentionally don't reveal whether the
        // email exists - but we also won't claim success we can't back up.
        setStatus("sent");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="Account recovery">
      {status === "sent" && (
        <>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            If an account exists for <strong>{email}</strong>, a password reset
            link is on its way.
          </p>
          <Link to="/login" className="btn btn-primary btn-block auth-submit">
            Back to Sign In
          </Link>
        </>
      )}

      {status === "unavailable" && (
        <>
          <h1 className="auth-title">Recovery isn&apos;t enabled yet</h1>
          <p className="auth-subtitle">
            This QuantumVest deployment doesn&apos;t have self-service password
            reset configured yet. Please reach out through the{" "}
            <Link to="/contact" className="auth-link">
              contact page
            </Link>{" "}
            and our team will help you regain access.
          </p>
          <Link to="/login" className="btn btn-secondary btn-block auth-submit">
            Back to Sign In
          </Link>
        </>
      )}

      {status === "idle" && (
        <>
          <h1 className="auth-title">Forgot password?</h1>
          <p className="auth-subtitle">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className={`input ${error ? "has-error" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
              {error && <p className="field-error">{error}</p>}
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block auth-submit"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
          <p className="auth-switch">
            <Link to="/login" className="auth-link">
              Back to Sign In
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
