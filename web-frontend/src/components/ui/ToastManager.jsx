import React from "react";
import { useEffect, useState } from "react";
import Toast from "./Toast";
import "../../styles/ToastManager.css";
export { showToast } from "../../utils/helpers";

const ToastManager = () => {
  const [toasts, setToasts] = useState([]);
  const idCounter = React.useRef(0);

  // Add a global event listener for showing toasts
  useEffect(() => {
    const showToast = (event) => {
      const { message, type, duration } = event.detail;

      idCounter.current += 1;
      const newToast = {
        id: `${Date.now()}-${idCounter.current}`,
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

export default ToastManager;
