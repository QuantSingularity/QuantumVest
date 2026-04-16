import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Toast from "../../components/ui/Toast";

describe("Toast Component", () => {
  test("renders with correct message and type", () => {
    const mockOnClose = jest.fn();
    render(
      <Toast
        message="Test toast message"
        type="success"
        onClose={mockOnClose}
        autoClose={false}
      />,
    );

    expect(screen.getByText("Test toast message")).toBeInTheDocument();
    const toastContainer = screen
      .getByText("Test toast message")
      .closest(".toast-container");
    expect(toastContainer).toHaveClass("success");
  });

  test("calls onClose when close button is clicked", () => {
    const mockOnClose = jest.fn();
    render(
      <Toast
        message="Test toast message"
        type="info"
        onClose={mockOnClose}
        autoClose={false}
      />,
    );

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("auto closes after specified duration", async () => {
    jest.useFakeTimers();
    const mockOnClose = jest.fn();

    render(
      <Toast
        message="Auto close toast"
        type="warning"
        onClose={mockOnClose}
        autoClose={true}
        duration={1000}
      />,
    );

    expect(screen.getByText("Auto close toast")).toBeInTheDocument();

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  test("renders different toast types correctly", () => {
    const mockOnClose = jest.fn();
    const { rerender } = render(
      <Toast
        message="Info toast"
        type="info"
        onClose={mockOnClose}
        autoClose={false}
      />,
    );

    expect(
      screen.getByText("Info toast").closest(".toast-container"),
    ).toHaveClass("info");

    rerender(
      <Toast
        message="Success toast"
        type="success"
        onClose={mockOnClose}
        autoClose={false}
      />,
    );

    expect(
      screen.getByText("Success toast").closest(".toast-container"),
    ).toHaveClass("success");

    rerender(
      <Toast
        message="Warning toast"
        type="warning"
        onClose={mockOnClose}
        autoClose={false}
      />,
    );

    expect(
      screen.getByText("Warning toast").closest(".toast-container"),
    ).toHaveClass("warning");

    rerender(
      <Toast
        message="Error toast"
        type="error"
        onClose={mockOnClose}
        autoClose={false}
      />,
    );

    expect(
      screen.getByText("Error toast").closest(".toast-container"),
    ).toHaveClass("error");
  });
});
