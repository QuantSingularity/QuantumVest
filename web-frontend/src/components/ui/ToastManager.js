import React from "react";
import { useEffect, useState } from "react";
import Toast from "./Toast";
import "../../styles/ToastManager.css";

const ToastManager = () => {
  const [toasts, setToasts] = useState([]);

  // Add a global event listener for showing toasts
  useEffect(() => {
    const showToast = (event) => {
      const { message, type, duration } = event.detail;

      const newToast = {
        id: Date.now(),
        message,
        type: type || "info",
        duration: duration || 3000,
      };

      setToasts((prevToasts) => [...prevToasts, newToast]);
    };

    window.addEventListener("show-toast", showToast);

    return () => {
      window.removeEventListener("show-toast", showToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <div className="toast-manager">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Helper function to show toasts from anywhere in the app
export const showToast = (message, type = "info", duration = 3000) => {
  window.dispatchEvent(
    new CustomEvent("show-toast", {
      detail: { message, type, duration },
    }),
  );
};

export default ToastManager;
