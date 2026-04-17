import React from "react";
import { useEffect, useState } from "react";
import "../../styles/LoadingSpinner.css";

const LoadingSpinner = ({
  size = "medium",
  color = "primary",
  text = "Loading...",
}) => {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return ".";
        return `${prev}.`;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className={`spinner ${color}`}></div>
      {text && (
        <p className="loading-text">
          {text}
          {dots}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
