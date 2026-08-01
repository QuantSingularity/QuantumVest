import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../layout/AuthLayout";
import { authAPI } from "../../services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | done
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const e = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setStatus("done");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setServerError(
        err?.response?.data?.error ||
          "This reset link is invalid or has expired. Please request a new one.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout eyebrow="Account recovery">
        <h1 className="auth-title">Invalid reset link</h1>
        <p className="auth-subtitle">
          This password reset link is missing or malformed. Request a new one
          below.
        </p>
        <Link
          to="/forgot-password"
          className="btn btn-primary btn-block auth-submit"
        >
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  if (status === "done") {
    return (
      <AuthLayout eyebrow="Account recovery">
        <h1 className="auth-title">Password updated</h1>
        <p className="auth-subtitle">
          Your password has been reset. Redirecting you to sign in…
        </p>
        <Link to="/login" className="btn btn-primary btn-block auth-submit">
          Back to Sign In
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="Account recovery">
      <h1 className="auth-title">Set a new password</h1>
      <p className="auth-subtitle">
        Choose a new password for your QuantumVest account.
      </p>
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            className={`input ${errors.password ? "has-error" : ""}`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            autoComplete="new-password"
            autoFocus
          />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            className={`input ${errors.confirm ? "has-error" : ""}`}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors((prev) => ({ ...prev, confirm: undefined }));
            }}
            autoComplete="new-password"
          />
          {errors.confirm && <p className="field-error">{errors.confirm}</p>}
        </div>
        {serverError && <p className="field-error">{serverError}</p>}
        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={loading}
        >
          {loading ? "Updating…" : "Reset Password"}
        </button>
      </form>
      <p className="auth-switch">
        <Link to="/login" className="auth-link">
          Back to Sign In
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPassword;
