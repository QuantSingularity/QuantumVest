import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../../../styles/Homepage.css";

// BUG FIX: "active" class was hardcoded on the Home link regardless of the
// current route. Now uses useLocation() to set it dynamically.
const HomepageNavMenu = () => {
  const { pathname } = useLocation();

  const isActive = (path) => (pathname === path ? "active" : "");

  return (
    <div className="homepage-nav-menu">
      <div className="homepage-nav-container">
        <div className="homepage-nav-logo">
          <div className="logo-icon">Q</div>
          <span>QuantumVest</span>
        </div>
        <nav className="homepage-nav-links">
          <Link to="/" className={`homepage-nav-link ${isActive("/")}`}>
            Home
          </Link>
          <Link
            to="/dashboard"
            className={`homepage-nav-link ${isActive("/dashboard")}`}
          >
            Dashboard
          </Link>
          <Link
            to="/predictions"
            className={`homepage-nav-link ${isActive("/predictions")}`}
          >
            Predictions
          </Link>
          <Link
            to="/optimize"
            className={`homepage-nav-link ${isActive("/optimize")}`}
          >
            Portfolio
          </Link>
          <Link
            to="/analytics"
            className={`homepage-nav-link ${isActive("/analytics")}`}
          >
            Analytics
          </Link>
          <Link
            to="/watchlist"
            className={`homepage-nav-link ${isActive("/watchlist")}`}
          >
            Watchlist
          </Link>
        </nav>
        <div className="homepage-nav-actions">
          <Link to="/login" className="homepage-nav-link-secondary">
            Sign In
          </Link>
          <Link to="/dashboard" className="homepage-nav-button">
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomepageNavMenu;
