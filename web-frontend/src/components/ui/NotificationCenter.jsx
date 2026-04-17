import React from "react";
import "../../styles/NotificationCenter.css";

const NotificationCenter = () => {
  const notifications = [
    {
      id: 1,
      type: "info",
      title: "Portfolio Update",
      message: "Your portfolio has been optimized with the latest market data.",
      time: "10 minutes ago",
    },
    {
      id: 2,
      type: "success",
      title: "Prediction Accuracy",
      message:
        "Our BTC price prediction was 98.5% accurate over the last 7 days!",
      time: "2 hours ago",
    },
    {
      id: 3,
      type: "warning",
      title: "Market Alert",
      message:
        "Unusual volatility detected in ETH. Consider reviewing your allocation.",
      time: "1 day ago",
    },
  ];

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h3>Notifications</h3>
        <button className="mark-all-read">Mark all as read</button>
      </div>

      <div className="notification-list">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.type}`}
            >
              <div className="notification-icon"></div>
              <div className="notification-content">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <span className="notification-time">{notification.time}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-notifications">
            <p>No new notifications</p>
          </div>
        )}
      </div>

      <div className="notification-footer">
        <button className="view-all">View all notifications</button>
      </div>
    </div>
  );
};

export default NotificationCenter;
