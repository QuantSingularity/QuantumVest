import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import "./styles/App.css";

import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Analytics from "./components/pages/Analytics";
import Contact from "./components/pages/Contact";
import Dashboard from "./components/pages/Dashboard";
import ForgotPassword from "./components/pages/ForgotPassword";
import Homepage from "./components/pages/Homepage/Homepage";
import Login from "./components/pages/Login";
import NotFound from "./components/pages/NotFound";
import PortfolioOptimization from "./components/pages/PortfolioOptimization";
import PredictionChart from "./components/pages/PredictionChart";
import Privacy from "./components/pages/Privacy";
import Profile from "./components/pages/Profile";
import Register from "./components/pages/Register";
import Settings from "./components/pages/Settings";
import Terms from "./components/pages/Terms";
import Watchlist from "./components/pages/Watchlist";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import ToastManager from "./components/ui/ToastManager";

// Pages that get the full-screen auth layout (no sidebar / header)
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

// Pages that get a "homepage mode" layout (no sidebar padding, full width)
const HOMEPAGE_PATHS = ["/"];

// Map routes → page titles shown in Header
const TITLE_MAP = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/predictions": "Predictions",
  "/optimize": "Portfolio Optimization",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/watchlist": "Watchlist",
  "/profile": "My Profile",
  "/contact": "Contact Us",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
  "/login": "Sign In",
  "/register": "Create Account",
  "/forgot-password": "Forgot Password",
};

function AppContent() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState("Home");

  const isAuthPage = AUTH_PATHS.includes(location.pathname);
  const isHomepage = HOMEPAGE_PATHS.includes(location.pathname);

  const updatePageTitle = useCallback((pathname) => {
    setCurrentPage(TITLE_MAP[pathname] || "QuantumVest");
  }, []);

  useEffect(() => {
    updatePageTitle(location.pathname);
  }, [location.pathname, updatePageTitle]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in:      { opacity: 1, y: 0 },
    out:     { opacity: 0, y: -20 },
  };
  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.4 };

  const wrapPage = (Component) => (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Component />
    </motion.div>
  );

  // ── Auth layout (login / register / forgot-password) ─────────────────────
  if (isAuthPage) {
    return (
      <div className="app-container">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/login"           element={wrapPage(Login)} />
              <Route path="/register"        element={wrapPage(Register)} />
              <Route path="/forgot-password" element={wrapPage(ForgotPassword)} />
            </Routes>
          </AnimatePresence>
          <ToastManager />
        </ErrorBoundary>
      </div>
    );
  }

  // ── Main app layout (sidebar + header + footer) ──────────────────────────
  return (
    <div className="app-container">
      <ErrorBoundary>
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        <div
          className={`content-wrapper ${sidebarOpen ? "sidebar-open" : ""} ${
            isHomepage ? "homepage-mode" : ""
          }`}
        >
          <Header toggleSidebar={toggleSidebar} pageTitle={currentPage} />

          <main className={`main-content ${isHomepage ? "homepage-content" : ""}`}>
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  {/* Core pages */}
                  <Route path="/"            element={wrapPage(Homepage)} />
                  <Route path="/dashboard"   element={wrapPage(Dashboard)} />
                  <Route path="/predictions" element={wrapPage(PredictionChart)} />
                  <Route path="/optimize"    element={wrapPage(PortfolioOptimization)} />
                  <Route path="/analytics"   element={wrapPage(Analytics)} />
                  <Route path="/watchlist"   element={wrapPage(Watchlist)} />
                  <Route path="/settings"    element={wrapPage(Settings)} />

                  {/* New pages */}
                  <Route path="/profile"     element={wrapPage(Profile)} />
                  <Route path="/contact"     element={wrapPage(Contact)} />
                  <Route path="/privacy"     element={wrapPage(Privacy)} />
                  <Route path="/terms"       element={wrapPage(Terms)} />

                  {/* 404 */}
                  <Route path="*"            element={wrapPage(NotFound)} />
                </Routes>
              </AnimatePresence>
            </ErrorBoundary>
          </main>

          <Footer />
        </div>

        <ToastManager />
      </ErrorBoundary>
    </div>
  );
}

// ThemeProvider wraps App in index.js — not duplicated here.
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
