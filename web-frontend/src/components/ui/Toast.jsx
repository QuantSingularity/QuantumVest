import React from "react";
import "../../styles/Toast.css";

const ICONS = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

const Toast = ({
  message,
  type = "info",
  onClose,
  autoClose = true,
  duration = 4000,
}) => {
  React.useEffect(() => {
    let timer;
    if (autoClose) {
      timer = setTimeout(() => onClose(), duration);
    }
    return () => timer && clearTimeout(timer);
  }, [autoClose, duration, onClose]);

  return (
    <div className={`toast-container ${type}`} role="status">
      <div className="toast-content">
        <div className="toast-icon">{ICONS[type] || ICONS.info}</div>
        <div className="toast-message">{message}</div>
      </div>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
