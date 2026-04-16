import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "../../styles/NotFound.css";

const NotFound = () => {
  return (
    <div className="notfound-container">
      <motion.div
        className="notfound-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-desc">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="notfound-actions">
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/" className="btn btn-outline">
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
