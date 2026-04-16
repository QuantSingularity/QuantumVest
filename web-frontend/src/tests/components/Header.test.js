import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../../components/layout/Header";
import { ThemeProvider } from "../../contexts/ThemeContext";

const renderHeader = (props = {}) =>
  render(
    <ThemeProvider>
      <MemoryRouter>
        <Header pageTitle="Dashboard" toggleSidebar={() => {}} {...props} />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("Header", () => {
  test("renders page title", () => {
    renderHeader({ pageTitle: "Dashboard" });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  test("renders search input", () => {
    renderHeader();
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });
});
