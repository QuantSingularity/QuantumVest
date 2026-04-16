import React from "react";
import { motion } from "framer-motion";
import { useState } from "react";
import { authAPI } from "../../services/api";
import { showToast } from "../ui/ToastManager";
import "../../styles/Auth.css";

const Profile = () => {
  const [form, setForm] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    bio: "Investment enthusiast and long-term portfolio builder.",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile(form);
      showToast("Profile updated successfully!", "success");
    } catch {
      showToast("Profile updated (demo mode)", "info");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="section-title">My Profile</h1>

        <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.6rem",
                flexShrink: 0,
              }}
            >
              {form.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{form.name}</h2>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                Premium Plan · Member since 2023
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-control"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-control"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                className="form-control"
                rows={3}
                value={form.bio}
                onChange={handleChange}
                style={{ resize: "vertical" }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: 140 }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
