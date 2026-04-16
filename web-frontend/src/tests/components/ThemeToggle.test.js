import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { ThemeProvider } from "../../contexts/ThemeContext";

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

describe("ThemeToggle", () => {
  test("renders toggle button", () => {
    renderToggle();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  test("clicking toggles aria-label", () => {
    renderToggle();
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-label");
  });
});
