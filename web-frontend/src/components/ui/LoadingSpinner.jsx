import React from "react";
import "../../styles/LoadingSpinner.css";

const LoadingSpinner = ({
  size = "medium",
  message,
  text,
  fullScreen = false,
  inline = false,
}) => {
  const label = message || text;

  const content = (
    <div className={`loading-spinner-container ${size}`}>
      <span className="spinner" />
      {label && <p className="loading-text">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  if (inline) {
    return (
      <span className="loading-inline">
        <span className="spinner spinner-small" />
      </span>
    );
  }

  return content;
};

export default LoadingSpinner;
