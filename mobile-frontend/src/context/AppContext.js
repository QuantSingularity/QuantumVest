import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AppContext = createContext(null);
const THEME_KEY = "@QuantumVest:theme";

export const AppProvider = ({ children }) => {
  const [theme, setThemeState] = useState("dark");
  const [currency, setCurrency] = useState("usd");
  const [notifications, setNotifications] = useState([]);
  const [networkStatus, setNetworkStatus] = useState("online");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setThemeState(saved);
    });
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const next = prevTheme === "light" ? "dark" : "light";
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...notification,
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    theme,
    currency,
    notifications,
    networkStatus,
    toggleTheme,
    setTheme,
    setCurrency,
    addNotification,
    clearNotification,
    clearAllNotifications,
    setNetworkStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
