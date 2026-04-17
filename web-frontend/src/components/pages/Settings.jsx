import React from "react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { authAPI, settingsAPI } from "../../services/api";
import "../../styles/Settings.css";
import LoadingSpinner from "../ui/LoadingSpinner";
import { showToast } from "../ui/ToastManager";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("english");
  const [currency, setCurrency] = useState("usd");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // BUG FIX: fetchUserData was listed as a useEffect dependency but was
  // redefined on every render, causing an infinite fetch loop.
  // Wrapping in useCallback gives it a stable identity.
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      try {
        const profileResponse = await authAPI.getProfile();
        if (profileResponse.data.success && profileResponse.data.user) {
          const user = profileResponse.data.user;
          setPersonalInfo({
            name:
              `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
              user.username,
            email: user.email || "",
            phone: user.phone || "",
          });
          if (user.preferred_currency) {
            setCurrency(user.preferred_currency.toLowerCase());
          }
        }
      } catch {
        setPersonalInfo({
          name: "John Doe",
          email: "john.doe@example.com",
          phone: "+1 (555) 123-4567",
        });
      }

      try {
        const settingsResponse = await settingsAPI.getSettings();
        if (settingsResponse.data.success && settingsResponse.data.settings) {
          const s = settingsResponse.data.settings;
          setNotifications({
            email: s.email_notifications !== false,
            push: s.push_notifications !== false,
            sms: s.sms_notifications !== false,
          });
          setTwoFactorEnabled(s.two_factor_enabled || false);
        }
      } catch {
        // Use defaults silently
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      showToast("Could not load settings. Using defaults.", "warning");
    } finally {
      setLoading(false);
    }
  }, []); // stable — no external deps; API functions are module-level constants

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleNotificationToggle = (type) => {
    setNotifications((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (formType === "Account") {
        const [firstName, ...lastNameParts] = personalInfo.name.split(" ");
        const lastName = lastNameParts.join(" ");
        const response = await authAPI.updateProfile({
          first_name: firstName,
          last_name: lastName,
          phone: personalInfo.phone,
        });
        if (response.data.success) {
          showToast("Account settings updated successfully!", "success");
        } else {
          throw new Error(response.data.error || "Update failed");
        }
      } else if (formType === "Password") {
        if (passwordForm.new !== passwordForm.confirm) {
          showToast("New passwords do not match", "error");
          setSaving(false);
          return;
        }
        if (passwordForm.new.length < 8) {
          showToast("Password must be at least 8 characters long", "error");
          setSaving(false);
          return;
        }
        const response = await settingsAPI.changePassword({
          current_password: passwordForm.current,
          new_password: passwordForm.new,
        });
        if (response.data.success) {
          showToast("Password updated successfully!", "success");
          setPasswordForm({ current: "", new: "", confirm: "" });
        } else {
          throw new Error(response.data.error || "Password update failed");
        }
      } else if (formType === "Preferences") {
        const response = await settingsAPI.updateSettings({
          theme,
          language,
          preferred_currency: currency.toUpperCase(),
        });
        if (response.data.success) {
          showToast("Preferences saved successfully!", "success");
        } else {
          throw new Error(response.data.error || "Update failed");
        }
      } else if (formType === "Notifications") {
        const response = await settingsAPI.updateSettings({
          email_notifications: notifications.email,
          push_notifications: notifications.push,
          sms_notifications: notifications.sms,
        });
        if (response.data.success) {
          showToast("Notification settings updated successfully!", "success");
        } else {
          throw new Error(response.data.error || "Update failed");
        }
      }
    } catch (error) {
      console.error(`Error updating ${formType}:`, error);
      showToast(
        error.response?.data?.error ||
          error.message ||
          `Failed to update ${formType.toLowerCase()} settings`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    try {
      setSaving(true);
      const newValue = !twoFactorEnabled;
      const response = newValue
        ? await settingsAPI.enable2FA()
        : await settingsAPI.disable2FA();
      if (response.data.success) {
        setTwoFactorEnabled(newValue);
        showToast(
          `Two-factor authentication ${newValue ? "enabled" : "disabled"} successfully!`,
          "success",
        );
      } else {
        throw new Error(response.data.error || "2FA toggle failed");
      }
    } catch (error) {
      console.error("Error toggling 2FA:", error);
      showToast(
        error.response?.data?.error ||
          "Failed to update two-factor authentication",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSwitch = (enabled) => ({
    width: "48px",
    height: "24px",
    cursor: saving ? "not-allowed" : "pointer",
    appearance: "none",
    backgroundColor: enabled ? "var(--success-color)" : "var(--border-color)",
    borderRadius: "12px",
    position: "relative",
    transition: "var(--transition)",
    border: "none",
    outline: "none",
  });

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner text="Loading settings" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="section-title">Settings</h2>

        <div className="grid grid-2">
          {/* Account Settings */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h3 className="card-title">Account Settings</h3>
            <form onSubmit={(e) => handleSubmit(e, "Account")}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={personalInfo.name}
                  onChange={handlePersonalInfoChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={personalInfo.email}
                  onChange={handlePersonalInfoChange}
                  disabled
                  title="Email cannot be changed"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  name="phone"
                  value={personalInfo.phone}
                  onChange={handlePersonalInfoChange}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </motion.div>

          {/* Security Settings */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h3 className="card-title">Security</h3>
            <form onSubmit={(e) => handleSubmit(e, "Password")}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="current"
                  value={passwordForm.current}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="new"
                  value={passwordForm.new}
                  onChange={handlePasswordChange}
                  required
                  minLength="8"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  name="confirm"
                  value={passwordForm.confirm}
                  onChange={handlePasswordChange}
                  required
                  minLength="8"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Updating..." : "Update Password"}
              </button>
            </form>

            <hr
              style={{ margin: "2rem 0", borderColor: "var(--border-color)" }}
            />

            <div className="settings-toggle-row">
              <div>
                <h4 className="settings-toggle-title">
                  Two-Factor Authentication
                </h4>
                <p className="settings-toggle-desc">
                  Add an extra layer of security to your account
                </p>
              </div>
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                onChange={handleTwoFactorToggle}
                disabled={saving}
                style={toggleSwitch(twoFactorEnabled)}
              />
            </div>
          </motion.div>

          {/* Preferences */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h3 className="card-title">Preferences</h3>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <select
                className="form-control"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select
                className="form-control"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="german">German</option>
                <option value="chinese">Chinese</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                className="form-control"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
                <option value="jpy">JPY (¥)</option>
                <option value="cny">CNY (¥)</option>
              </select>
            </div>
            <button
              className="btn btn-primary"
              onClick={(e) => handleSubmit(e, "Preferences")}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </motion.div>

          {/* Notifications */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h3 className="card-title">Notifications</h3>

            {[
              {
                key: "email",
                label: "Email Notifications",
                desc: "Receive updates and alerts via email",
              },
              {
                key: "push",
                label: "Push Notifications",
                desc: "Receive notifications in your browser",
              },
              {
                key: "sms",
                label: "SMS Notifications",
                desc: "Receive important alerts via SMS",
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="settings-toggle-row">
                <div>
                  <h4 className="settings-toggle-title">{label}</h4>
                  <p className="settings-toggle-desc">{desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications[key]}
                  onChange={() => handleNotificationToggle(key)}
                  style={toggleSwitch(notifications[key])}
                />
              </div>
            ))}

            <button
              className="btn btn-primary"
              onClick={(e) => handleSubmit(e, "Notifications")}
              disabled={saving}
              style={{ marginTop: "1rem" }}
            >
              {saving ? "Saving..." : "Save Notification Settings"}
            </button>
          </motion.div>
        </div>

        {/* Danger Zone */}
        <motion.div
          className="card settings-danger-zone"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h3 className="card-title" style={{ color: "var(--danger-color)" }}>
            Danger Zone
          </h3>
          <div className="settings-toggle-row">
            <div>
              <h4 className="settings-toggle-title">Delete Account</h4>
              <p className="settings-toggle-desc">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button
              className="btn btn-danger"
              onClick={() =>
                showToast(
                  "Account deletion requires confirmation. Please contact support.",
                  "warning",
                )
              }
            >
              Delete Account
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Settings;
