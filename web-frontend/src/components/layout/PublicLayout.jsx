import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Footer from "./Footer";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/PublicLayout.css";

const NAV_LINKS = [
  { to: "/#features", label: "Features" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/contact", label: "Contact" },
];

const PublicLayout = ({ children }) => {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="public-layout">
      <header className="public-nav">
        <div className="public-nav-inner">
          <Link to="/" className="public-nav-logo">
            <div className="logo-icon">Q</div>
            <span>QuantumVest</span>
          </Link>

          <nav className={`public-nav-links ${menuOpen ? "open" : ""}`}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.to}
                className={`public-nav-link ${pathname === link.to ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="public-nav-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            className="public-nav-toggle"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Toggle menu"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
