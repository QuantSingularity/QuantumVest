import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../layout/AuthLayout";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/helpers";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.identifier.trim()) e.identifier = "Enter your username or email";
    if (!form.password) e.password = "Password is required";
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
    const result = await login(form);
    setLoading(false);

    if (result.success) {
      showToast(
        `Welcome back, ${result.user?.first_name || result.user?.username}!`,
        "success",
      );
      navigate(location.state?.from || "/dashboard", { replace: true });
    } else {
      setErrors({ form: result.error });
      showToast(result.error, "error");
    }
  };

  return (
    <AuthLayout eyebrow="Sign in">
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your account to continue</p>

      {errors.form && <div className="auth-alert">{errors.form}</div>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="field">
          <label htmlFor="identifier">Username or email</label>
          <input
            id="identifier"
            type="text"
            name="identifier"
            className={`input ${errors.identifier ? "has-error" : ""}`}
            value={form.identifier}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="username"
            autoFocus
          />
          {errors.identifier && (
            <p className="field-error">{errors.identifier}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-group">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              className={`input ${errors.password ? "has-error" : ""}`}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ paddingLeft: "1rem" }}
            />
            <button
              type="button"
              className="input-group-action"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        <div className="auth-forgot">
          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="auth-switch">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="auth-link">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
