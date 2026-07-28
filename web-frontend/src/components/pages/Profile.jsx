import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getInitials } from "../../utils/helpers";
import { showToast } from "../../utils/helpers";
import "../../styles/Profile.css";

const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "expert"];

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    risk_tolerance: 0.5,
    investment_experience: "beginner",
  });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        risk_tolerance: user.risk_tolerance ?? 0.5,
        investment_experience: user.investment_experience || "beginner",
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    if (result.success) showToast("Profile updated", "success");
    else showToast(result.error, "error");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.new_password.length < 8)
      return setPwError("New password must be at least 8 characters");
    if (pwForm.new_password !== pwForm.confirm)
      return setPwError("Passwords do not match");

    setPwSaving(true);
    const result = await changePassword(
      pwForm.current_password,
      pwForm.new_password,
    );
    setPwSaving(false);
    if (result.success) {
      showToast("Password changed", "success");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } else {
      setPwError(result.error);
    }
  };

  const displayName =
    [form.first_name, form.last_name].filter(Boolean).join(" ") ||
    user?.username;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : "—";

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">Account</span>
          <h2>My Profile</h2>
        </div>
      </div>

      <div className="card profile-header-card">
        <div className="profile-avatar">{getInitials(user)}</div>
        <div>
          <h3 style={{ margin: 0 }}>{displayName}</h3>
          <p style={{ margin: 0 }}>
            <span className="badge badge-primary">
              {user?.role?.replace(/_/g, " ")}
            </span>{" "}
            <span className="text-tertiary">Member since {memberSince}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-2 profile-grid">
        <div className="card">
          <div className="section-title">
            <h3>Personal information</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
              <input className="input" value={user?.username || ""} disabled />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" value={user?.email || ""} disabled />
            </div>
            <div className="grid grid-2" style={{ gap: "0.75rem" }}>
              <div className="field">
                <label htmlFor="first_name">First name</label>
                <input
                  id="first_name"
                  className="input"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="last_name">Last name</label>
                <input
                  id="last_name"
                  className="input"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="investment_experience">
                Investment experience
              </label>
              <select
                id="investment_experience"
                className="select"
                value={form.investment_experience}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    investment_experience: e.target.value,
                  }))
                }
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="risk_tolerance">
                Risk tolerance{" "}
                <span className="text-tertiary">
                  ({Math.round(form.risk_tolerance * 100)}%)
                </span>
              </label>
              <input
                id="risk_tolerance"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.risk_tolerance}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    risk_tolerance: parseFloat(e.target.value),
                  }))
                }
              />
              <span className="field-hint">
                Used as the default for portfolio optimization when not
                specified.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Change password</h3>
          </div>
          {pwError && <div className="auth-alert">{pwError}</div>}
          <form onSubmit={handlePasswordSubmit}>
            <div className="field">
              <label htmlFor="current_password">Current password</label>
              <input
                id="current_password"
                type="password"
                className="input"
                value={pwForm.current_password}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, current_password: e.target.value }))
                }
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="new_password">New password</label>
              <input
                id="new_password"
                type="password"
                className="input"
                value={pwForm.new_password}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, new_password: e.target.value }))
                }
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label htmlFor="confirm_password">Confirm new password</label>
              <input
                id="confirm_password"
                type="password"
                className="input"
                value={pwForm.confirm}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, confirm: e.target.value }))
                }
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={pwSaving}
            >
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </form>

          <hr className="divider" />

          <div className="section-title">
            <h3>Compliance</h3>
          </div>
          <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
            <span
              className={`badge ${user?.kyc_status === "approved" ? "badge-success" : "badge-warning"}`}
            >
              KYC: {user?.kyc_status || "pending"}
            </span>
            <span
              className={`badge ${user?.aml_status === "approved" ? "badge-success" : "badge-warning"}`}
            >
              AML: {user?.aml_status || "pending"}
            </span>
            <span
              className={`badge ${user?.is_verified ? "badge-success" : "badge-warning"}`}
            >
              {user?.is_verified ? "Email verified" : "Email unverified"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
