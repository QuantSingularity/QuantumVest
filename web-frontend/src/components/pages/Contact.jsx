import React, { useState } from "react";
import { showToast } from "../../utils/helpers";
import "../../styles/StaticPages.css";

const CONTACT_DETAILS = [
  { icon: "📧", label: "Email", value: "support@quantumvest.io" },
  { icon: "📞", label: "Phone", value: "+1 (800) QV-INVEST" },
  { icon: "🕒", label: "Hours", value: "Mon-Fri, 9 AM to 6 PM EST" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email) e.email = "Email is required";
    else if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.message.trim()) e.message = "Message is required";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

    const mailto = `mailto:support@quantumvest.io?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(
      `${form.message}\n\n- ${form.name} (${form.email})`,
    )}`;
    window.location.href = mailto;
    setSent(true);
    showToast("Opening your email client…", "info");
  };

  return (
    <div className="static-page">
      <div className="container static-page-inner">
        <h1>Contact us</h1>
        <p className="static-page-lead">
          Have a question or need help? We&apos;d love to hear from you.
        </p>

        <div className="grid grid-2 contact-grid">
          <div className="card">
            <h3 style={{ marginBottom: "0.3rem" }}>Get in touch</h3>
            <p style={{ marginBottom: "var(--space-md)" }}>
              Reach us directly, or send a message and we&apos;ll draft an email
              for you.
            </p>
            {CONTACT_DETAILS.map(({ icon, label, value }) => (
              <div key={label} className="contact-detail-row">
                <span className="contact-detail-icon">{icon}</span>
                <div>
                  <p className="contact-detail-label">{label}</p>
                  <p className="contact-detail-value">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            {sent ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <span style={{ fontSize: "1.4rem" }}>✉️</span>
                </div>
                <h4>Almost there</h4>
                <p>
                  Your email client should have opened with your message
                  pre-filled. Send it and we&apos;ll be in touch.
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: "var(--space-sm)" }}
                  onClick={() => setSent(false)}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    name="name"
                    className={`input ${errors.name ? "has-error" : ""}`}
                    value={form.name}
                    onChange={handleChange}
                  />
                  {errors.name && <p className="field-error">{errors.name}</p>}
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`input ${errors.email ? "has-error" : ""}`}
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && (
                    <p className="field-error">{errors.email}</p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="subject">Subject</label>
                  <input
                    id="subject"
                    name="subject"
                    className={`input ${errors.subject ? "has-error" : ""}`}
                    value={form.subject}
                    onChange={handleChange}
                  />
                  {errors.subject && (
                    <p className="field-error">{errors.subject}</p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className={`input ${errors.message ? "has-error" : ""}`}
                    value={form.message}
                    onChange={handleChange}
                  />
                  {errors.message && (
                    <p className="field-error">{errors.message}</p>
                  )}
                </div>
                <button type="submit" className="btn btn-primary btn-block">
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
