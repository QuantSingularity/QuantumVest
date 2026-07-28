import React from "react";
import { Link } from "react-router-dom";
import "../../styles/StaticPages.css";

const NotFound = () => (
  <div className="static-page not-found-page">
    <div className="container static-page-inner not-found-inner">
      <span className="text-gradient not-found-code">404</span>
      <h1>Page not found</h1>
      <p>
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="flex gap-sm" style={{ justifyContent: "center" }}>
        <Link to="/" className="btn btn-secondary">
          Go Home
        </Link>
        <Link to="/dashboard" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;
