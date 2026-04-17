import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../../styles/Sidebar.css";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/predictions", label: "Predictions", icon: "📈" },
  { to: "/optimize", label: "Portfolio", icon: "💼" },
  { to: "/analytics", label: "Analytics", icon: "📉" },
  { to: "/watchlist", label: "Watchlist", icon: "⭐" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <>
      {/* Overlay: only rendered/animated on mobile (CSS hides on desktop) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-overlay active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/*
        BUG FIX: Previously framer-motion (animate={{ x: ... }}) and CSS
        (.sidebar-collapsed { transform: translateX(-280px) }) both controlled
        the same transform — causing a conflict and visual jitter.
        Fix: drive open/close purely via CSS class; remove the Framer Motion
        x animation so there is a single source of truth.
      */}
      <aside className={`sidebar ${isOpen ? "" : "sidebar-collapsed"}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">Q</div>
            <h2>QuantumVest</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <motion.li
                key={to}
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  to={to}
                  className={`nav-link ${isActive(to)}`}
                  onClick={() => {
                    // On mobile, close sidebar after navigating
                    if (window.innerWidth < 992) toggleSidebar();
                  }}
                >
                  {/* FIX: render emoji directly; old code had empty <i> tags */}
                  <span className="nav-icon" role="img" aria-hidden="true">
                    {icon}
                  </span>
                  <span>{label}</span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">JD</div>
            <div className="user-details">
              <p className="user-name">John Doe</p>
              <p className="user-plan">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
