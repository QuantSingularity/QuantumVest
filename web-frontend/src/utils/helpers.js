import React from "react";

// Utility function to create a context hook with error handling
export const createContextHook = (context, hookName) => {
  return () => {
    const ctx = React.useContext(context);
    if (ctx === undefined) {
      throw new Error(
        `use${hookName} must be used within a ${hookName}Provider`,
      );
    }
    return ctx;
  };
};

// Format currency values
export const formatCurrency = (value, currency = "USD", locale = "en-US") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
};

// Format percentage values
export const formatPercentage = (value, decimals = 2, locale = "en-US") => {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

// Format date values
export const formatDate = (date, options = {}, locale = "en-US") => {
  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return new Date(date).toLocaleDateString(locale, {
    ...defaultOptions,
    ...options,
  });
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Generate random color
export const generateRandomColor = () => {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
};

// Debounce function for performance optimization
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Local storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
      return false;
    }
  },
  remove: (key) => {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
      return false;
    }
  },
};

// Fire a global toast notification (picked up by <ToastManager />)
export const showToast = (message, type = "info", duration = 4000) => {
  window.dispatchEvent(
    new CustomEvent("show-toast", { detail: { message, type, duration } }),
  );
};

// Extract a human-readable error message from an axios error / API response
export const getErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    (error?.message === "Network Error"
      ? "Can't reach the QuantumVest server. Check your connection and try again."
      : null) ||
    error?.message ||
    fallback
  );
};

// Format large numbers compactly (e.g. 12,345 -> 12.3K)
export const formatCompactNumber = (value, locale = "en-US") => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};

// Combine class names, skipping falsy values
export const cx = (...classes) => classes.filter(Boolean).join(" ");

// Initials from a name/username, for avatars
export const getInitials = (nameOrUser) => {
  if (!nameOrUser) return "QV";
  if (typeof nameOrUser === "object") {
    const { first_name, last_name, username } = nameOrUser;
    if (first_name || last_name) {
      return (
        `${(first_name || "")[0] || ""}${(last_name || "")[0] || ""}`.toUpperCase() ||
        "QV"
      );
    }
    return (username || "QV").substring(0, 2).toUpperCase();
  }
  return String(nameOrUser).substring(0, 2).toUpperCase();
};
