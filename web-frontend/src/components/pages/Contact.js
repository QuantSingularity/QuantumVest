import React from "react";
import { motion } from "framer-motion";
import { useState } from "react";
import { showToast } from "../ui/ToastManager";
import "../../styles/Auth.css";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.message.trim()) e.message = "Message is required";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setForm({ name: "", email: "", subject: "", message: "" });
    showToast("Message sent! We'll get back to you soon.", "success");
  };

  return (
    <div className="profile-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="section-title">Contact Us</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900, margin: "0 auto" }}
          className="contact-grid">
          <div className="card">
            <h2 style={{ marginBottom: 8 }}>Get in touch</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
              Have a question or need help? We'd love to hear from you.
            </p>
            {[
              { icon: "📧", label: "Email", value: "support@quantumvest.io" },
              { icon: "📞", label: "Phone", value: "+1 (800) QV-INVEST" },
              { icon: "🕒", label: "Hours", value: "Mon–Fri, 9 AM – 6 PM EST" },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
                <span style={{ fontSize: "1.4rem" }}>{icon}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem" }}>{label}</p>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <form onSubmit={handleSubmit}>
              {["name", "email", "subject"].map((field) => (
                <div className="form-group" key={field} style={{ marginBottom: 14 }}>
                  <label className="form-label" htmlFor={field}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <input id={field} name={field} type={field === "email" ? "email" : "text"}
                    className={`form-control ${errors[field] ? "is-invalid" : ""}`}
                    value={form[field]} onChange={handleChange} />
                  {errors[field] && <p className="field-error">{errors[field]}</p>}
                </div>
              ))}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" htmlFor="message">Message</label>
                <textarea id="message" name="message" rows={4}
                  className={`form-control ${errors.message ? "is-invalid" : ""}`}
                  value={form.message} onChange={handleChange} style={{ resize: "vertical" }} />
                {errors.message && <p className="field-error">{errors.message}</p>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                {loading ? "Sending…" : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Contact;
