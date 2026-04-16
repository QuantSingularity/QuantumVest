import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider } from "./contexts/ThemeContext";
// App.css is imported in App.js — importing here too caused duplicate injection

// BUG FIX: ThemeProvider and NotificationProvider live here only.
// App.js previously re-wrapped in ThemeProvider, creating a duplicate context
// that caused theme state to be isolated and persistence to break.
ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById("root"),
);
