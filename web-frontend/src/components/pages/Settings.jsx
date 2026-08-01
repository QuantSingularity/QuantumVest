import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { showToast, storage } from "../../utils/helpers";
import "../../styles/Settings.css";

const DEFAULT_PREFS = {
  emailDigest: true,
  priceAlerts: true,
  transactionAlerts: true,
};

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(() =>
    storage.get("qv_notification_prefs", DEFAULT_PREFS),
  );

  const updatePref = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      storage.set("qv_notification_prefs", next);
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    showToast("Signed out", "info");
    navigate("/");
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">Preferences</span>
          <h2>Settings</h2>
        </div>
      </div>

      <div className="card settings-section">
        <div className="section-title">
          <h3>Appearance</h3>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Theme</p>
            <p className="settings-row-desc">
              Choose how QuantumVest looks on this device.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={toggleTheme}>
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
      </div>

      <div className="card settings-section">
        <div className="section-title">
          <h3>Notifications</h3>
          <span className="badge">Saved on this device</span>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Email digest</p>
            <p className="settings-row-desc">
              Weekly summary of portfolio performance.
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.emailDigest}
              onChange={() => updatePref("emailDigest")}
            />
            <span className="switch-track" />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Price alerts</p>
            <p className="settings-row-desc">
              Notify me about significant moves in my watchlists.
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.priceAlerts}
              onChange={() => updatePref("priceAlerts")}
            />
            <span className="switch-track" />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Transaction alerts</p>
            <p className="settings-row-desc">
              Notify me when a transaction is recorded on my portfolios.
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.transactionAlerts}
              onChange={() => updatePref("transactionAlerts")}
            />
            <span className="switch-track" />
          </label>
        </div>
        <p className="field-hint">
          These preferences are stored locally in your browser. The backend
          doesn&apos;t yet send notification emails, so this controls in-app
          behavior only.
        </p>
      </div>

      <div className="card settings-section">
        <div className="section-title">
          <h3>Security</h3>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Password</p>
            <p className="settings-row-desc">
              Change your password from your Profile page.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/profile")}
          >
            Go to Profile
          </button>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Two-factor authentication</p>
            <p className="settings-row-desc">
              {user?.two_factor_enabled
                ? "Enabled on your account."
                : "Not yet available - coming soon."}
            </p>
          </div>
          <span
            className={`badge ${user?.two_factor_enabled ? "badge-success" : ""}`}
          >
            {user?.two_factor_enabled ? "Enabled" : "Unavailable"}
          </span>
        </div>
      </div>

      <div className="card settings-section danger-zone">
        <div className="section-title">
          <h3>Session</h3>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Sign out</p>
            <p className="settings-row-desc">
              End your session on this device.
            </p>
          </div>
          <button className="btn btn-danger" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
