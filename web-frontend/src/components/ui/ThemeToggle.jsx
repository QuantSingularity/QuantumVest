import { useTheme } from "../../contexts/ThemeContext";
import "../../styles/ThemeToggle.css";

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
