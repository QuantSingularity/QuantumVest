import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layout/AuthLayout";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/helpers";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.username.trim()) e.username = "Choose a username";
    else if (!USERNAME_RE.test(form.username.trim()))
      e.username = "3-30 characters: letters, numbers, underscore only";
    if (!form.email) e.email = "Email is required";
    else if (!EMAIL_RE.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (!form.confirm) e.confirm = "Please confirm your password";
    else if (form.confirm !== form.password)
      e.confirm = "Passwords do not match";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    const result = await register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || undefined,
    });
    setLoading(false);

    if (result.success) {
      showToast("Account created - welcome to QuantumVest!", "success");
      navigate("/dashboard", { replace: true });
    } else {
      setErrors({ form: result.error });
      showToast(result.error, "error");
    }
  };

  return (
    <AuthLayout eyebrow="Create account">
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-subtitle">Start your AI-powered investment journey</p>

      {errors.form && <div className="auth-alert">{errors.form}</div>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="grid grid-2" style={{ gap: "0.75rem" }}>
          <div className="field">
            <label htmlFor="first_name">First name</label>
            <input
              id="first_name"
              type="text"
              name="first_name"
              className={`input ${errors.first_name ? "has-error" : ""}`}
              value={form.first_name}
              onChange={handleChange}
              placeholder="Jane"
              autoComplete="given-name"
              autoFocus
            />
            {errors.first_name && (
              <p className="field-error">{errors.first_name}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="last_name">Last name</label>
            <input
              id="last_name"
              type="text"
              name="last_name"
              className="input"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Doe"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            className={`input ${errors.username ? "has-error" : ""}`}
            value={form.username}
            onChange={handleChange}
            placeholder="janedoe"
            autoComplete="username"
          />
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            name="email"
            className={`input ${errors.email ? "has-error" : ""}`}
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div className="grid grid-2" style={{ gap: "0.75rem" }}>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              className={`input ${errors.password ? "has-error" : ""}`}
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="field-error">{errors.password}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              name="confirm"
              className={`input ${errors.confirm ? "has-error" : ""}`}
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
            {errors.confirm && <p className="field-error">{errors.confirm}</p>}
          </div>
        </div>

        <p className="auth-terms">
          By registering you agree to our{" "}
          <Link to="/terms" className="auth-link">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="auth-link">
            Privacy Policy
          </Link>
          .
        </p>

        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{" "}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
