import { useTheme } from "../../contexts/ThemeContext";
import "../../styles/ThemeToggle.css";

// BUG FIX: Component previously kept its own isolated isDarkMode state
// instead of reading from ThemeContext, so the toggle was out of sync with
// the Header's theme button and with localStorage persistence.
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <div className="theme-toggle">
      <button
        className={`toggle-button ${isDarkMode ? "dark-mode" : "light-mode"}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      >
        <div className="toggle-track">
          <div className="toggle-indicator">
            <span className="toggle-icon">{isDarkMode ? "🌙" : "☀️"}</span>
          </div>
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle;
