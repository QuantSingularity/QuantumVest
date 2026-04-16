import React, { createContext, useState } from "react";

// Create Notification Context
export const NotificationContext = createContext();

const SEED_NOTIFICATIONS = [
  {
    id: 1,
    type: "success",
    title: "Portfolio Updated",
    message: "Your portfolio rebalancing was completed successfully.",
    read: false,
    timestamp: new Date(),
  },
  {
    id: 2,
    type: "info",
    title: "AI Prediction Ready",
    message: "New 7-day price predictions are available for your watchlist.",
    read: false,
    timestamp: new Date(),
  },
  {
    id: 3,
    type: "warning",
    title: "Market Alert",
    message: "High volatility detected in your TSLA position.",
    read: true,
    timestamp: new Date(),
  },
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(SEED_NOTIFICATIONS);

  // Add a new notification
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      read: false,
      timestamp: new Date(),
      ...notification,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    return newNotification.id;
  };

  // Mark a notification as read
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
  };

  // Remove a notification
  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Get unread count
  const getUnreadCount = () => {
    return notifications.filter((notification) => !notification.read).length;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearNotifications,
        getUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};
