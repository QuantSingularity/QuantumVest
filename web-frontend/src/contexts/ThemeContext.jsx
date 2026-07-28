import React, { createContext, useEffect, useState } from "react";
import { storage } from "../utils/helpers";

// Create Theme Context
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => storage.get("theme", "dark"));

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = storage.get("theme", "dark");
    setTheme(savedTheme);
    // Apply BOTH mechanisms: data-theme on <html> for CSS var overrides,
    // AND dark-theme class on <body> so all ".dark-theme X" selectors match.
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.body.classList.toggle("dark-theme", savedTheme === "dark");
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    storage.set("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.classList.toggle("dark-theme", newTheme === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
