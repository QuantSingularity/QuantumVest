import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./styles/App.css";

import PublicLayout from "./components/layout/PublicLayout";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PublicOnlyRoute from "./components/routing/PublicOnlyRoute";
import LoadingSpinner from "./components/ui/LoadingSpinner";

import ErrorBoundary from "./components/ui/ErrorBoundary";
import ToastManager from "./components/ui/ToastManager";

const Homepage = lazy(() => import("./components/pages/Homepage/Homepage"));
const Contact = lazy(() => import("./components/pages/Contact"));
const Privacy = lazy(() => import("./components/pages/Privacy"));
const Terms = lazy(() => import("./components/pages/Terms"));
const NotFound = lazy(() => import("./components/pages/NotFound"));

const Login = lazy(() => import("./components/pages/Login"));
const Register = lazy(() => import("./components/pages/Register"));
const ForgotPassword = lazy(() => import("./components/pages/ForgotPassword"));

const Dashboard = lazy(() => import("./components/pages/Dashboard"));
const Portfolios = lazy(() => import("./components/pages/Portfolios"));
const PortfolioDetail = lazy(
  () => import("./components/pages/PortfolioDetail"),
);
const Watchlist = lazy(() => import("./components/pages/Watchlist"));
const RiskAnalytics = lazy(() => import("./components/pages/RiskAnalytics"));
const Predictions = lazy(() => import("./components/pages/Predictions"));
const Profile = lazy(() => import("./components/pages/Profile"));
const Settings = lazy(() => import("./components/pages/Settings"));

const PageFallback = () => <LoadingSpinner fullScreen message="Loading..." />;

// Wraps a protected page with the authenticated app shell (sidebar/header/footer)
const withShell = (title, Component) => (
  <ProtectedRoute>
    <AppShell title={title}>
      <Component />
    </AppShell>
  </ProtectedRoute>
);

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── Public marketing pages ─────────────────────────── */}
            <Route
              path="/"
              element={
                <PublicLayout>
                  <Homepage />
                </PublicLayout>
              }
            />
            <Route
              path="/contact"
              element={
                <PublicLayout>
                  <Contact />
                </PublicLayout>
              }
            />
            <Route
              path="/privacy"
              element={
                <PublicLayout>
                  <Privacy />
                </PublicLayout>
              }
            />
            <Route
              path="/terms"
              element={
                <PublicLayout>
                  <Terms />
                </PublicLayout>
              }
            />

            {/* ── Auth pages (redirect to /dashboard if already signed in) ── */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              }
            />

            {/* ── Protected app ──────────────────────────────────── */}
            <Route
              path="/dashboard"
              element={withShell("Dashboard", Dashboard)}
            />
            <Route
              path="/portfolios"
              element={withShell("Portfolios", Portfolios)}
            />
            <Route
              path="/portfolios/:id"
              element={withShell("Portfolio", PortfolioDetail)}
            />
            <Route
              path="/watchlist"
              element={withShell("Watchlist", Watchlist)}
            />
            <Route
              path="/risk-analytics"
              element={withShell("Risk Analytics", RiskAnalytics)}
            />
            <Route
              path="/predictions"
              element={withShell("AI Predictions", Predictions)}
            />
            <Route path="/profile" element={withShell("My Profile", Profile)} />
            <Route path="/settings" element={withShell("Settings", Settings)} />

            {/* ── 404 ─────────────────────────────────────────────── */}
            <Route
              path="*"
              element={
                <PublicLayout>
                  <NotFound />
                </PublicLayout>
              }
            />
          </Routes>
        </Suspense>

        <ToastManager />
      </ErrorBoundary>
    </Router>
  );
}

export default App;
