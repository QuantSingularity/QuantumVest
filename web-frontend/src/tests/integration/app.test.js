import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";
import { NotificationProvider } from "../../contexts/NotificationContext";
import { ThemeProvider } from "../../contexts/ThemeContext";

// BUG FIX: App no longer wraps itself in ThemeProvider; tests must provide it
const renderApp = (initialEntries = ["/"]) =>
  render(
    <ThemeProvider>
      <NotificationProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </NotificationProvider>
    </ThemeProvider>,
  );

describe("App Integration", () => {
  test("renders without crashing", () => {
    renderApp();
    expect(document.body).toBeInTheDocument();
  });
});
