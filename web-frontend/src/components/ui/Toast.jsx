import React from "react";
import "../../styles/Toast.css";

const Toast = ({
  message,
  type = "info",
  onClose,
  autoClose = true,
  duration = 3000,
}) => {
  React.useEffect(() => {
    let timer;
    if (autoClose) {
      timer = setTimeout(() => {
        onClose();
      }, duration);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoClose, duration, onClose]);

  return (
    <div className={`toast-container ${type}`}>
      <div className="toast-content">
        <div className="toast-icon"></div>
        <div className="toast-message">{message}</div>
      </div>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

export default Toast;
