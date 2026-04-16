import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ToastManager, { showToast } from "../../components/ui/ToastManager";

describe("ToastManager Component", () => {
  beforeEach(() => {
    // Clear any previous event listeners
    window.removeEventListener("show-toast", () => {});
  });

  test("renders without crashing", () => {
    render(<ToastManager />);
    // ToastManager should render without visible content initially
    const toastManager = document.querySelector(".toast-manager");
    expect(toastManager).toBeInTheDocument();
    expect(toastManager.children.length).toBe(0);
  });

  test("shows toast when showToast is called", () => {
    render(<ToastManager />);

    act(() => {
      showToast("Test message", "info");
    });

    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  test("shows multiple toasts", () => {
    render(<ToastManager />);

    act(() => {
      showToast("First toast", "info");
      showToast("Second toast", "success");
    });

    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
  });

  test("removes toast when close button is clicked", () => {
    render(<ToastManager />);

    act(() => {
      showToast("Closable toast", "info");
    });

    expect(screen.getByText("Closable toast")).toBeInTheDocument();

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);

    // Toast should be removed
    expect(screen.queryByText("Closable toast")).not.toBeInTheDocument();
  });

  test("supports different toast types", () => {
    render(<ToastManager />);

    act(() => {
      showToast("Info toast", "info");
      showToast("Success toast", "success");
      showToast("Warning toast", "warning");
      showToast("Error toast", "error");
    });

    expect(
      screen.getByText("Info toast").closest(".toast-container"),
    ).toHaveClass("info");
    expect(
      screen.getByText("Success toast").closest(".toast-container"),
    ).toHaveClass("success");
    expect(
      screen.getByText("Warning toast").closest(".toast-container"),
    ).toHaveClass("warning");
    expect(
      screen.getByText("Error toast").closest(".toast-container"),
    ).toHaveClass("error");
  });
});
