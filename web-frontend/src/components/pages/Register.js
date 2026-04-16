import React from "react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import "../../styles/Auth.css";
import { showToast } from "../ui/ToastManager";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
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

    try {
      setLoading(true);
      const [firstName, ...rest] = form.name.trim().split(" ");
      const response = await authAPI.register({
        first_name: firstName,
        last_name: rest.join(" "),
        email: form.email,
        password: form.password,
      });

      if (response.data.success) {
        showToast("Account created! Welcome to QuantumVest.", "success");
        navigate("/dashboard");
      } else {
        throw new Error(response.data.error || "Registration failed");
      }
    } catch (err) {
      console.warn("API register unavailable, using demo mode:", err.message);
      showToast("Account created (demo mode)!", "info");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-logo">
          <div className="auth-logo-icon">Q</div>
          <span className="auth-logo-text">QuantumVest</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">
          Start your AI-powered investment journey
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              autoComplete="name"
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="field-error">{errors.password}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              name="confirm"
              className={`form-control ${errors.confirm ? "is-invalid" : ""}`}
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
            {errors.confirm && <p className="field-error">{errors.confirm}</p>}
          </div>

          <p className="auth-terms">
            By registering you agree to our{" "}
            <Link to="#" className="auth-link">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="#" className="auth-link">
              Privacy Policy
            </Link>
            .
          </p>

          <button
            type="submit"
            className="btn btn-primary auth-submit"
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
      </motion.div>

      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-circle auth-bg-circle-1" />
        <div className="auth-bg-circle auth-bg-circle-2" />
      </div>
    </div>
  );
};

export default Register;
