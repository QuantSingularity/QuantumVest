import React from "react";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

describe("LoadingSpinner Component", () => {
  test("renders with default props", () => {
    render(<LoadingSpinner />);

    const spinnerContainer = document.querySelector(
      ".loading-spinner-container",
    );
    expect(spinnerContainer).toBeInTheDocument();
    expect(spinnerContainer).toHaveClass("medium");

    const spinner = document.querySelector(".spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("primary");

    expect(screen.getByText(/Loading.../)).toBeInTheDocument();
  });

  test("renders with custom size", () => {
    render(<LoadingSpinner size="small" />);

    const spinnerContainer = document.querySelector(
      ".loading-spinner-container",
    );
    expect(spinnerContainer).toHaveClass("small");

    render(<LoadingSpinner size="large" />);

    const largeSpinnerContainer = document.querySelector(
      ".loading-spinner-container",
    );
    expect(largeSpinnerContainer).toHaveClass("large");
  });

  test("renders with custom color", () => {
    render(<LoadingSpinner color="secondary" />);

    const spinner = document.querySelector(".spinner");
    expect(spinner).toHaveClass("secondary");

    render(<LoadingSpinner color="accent" />);

    const accentSpinner = document.querySelector(".spinner");
    expect(accentSpinner).toHaveClass("accent");
  });

  test("renders with custom text", () => {
    render(<LoadingSpinner text="Processing data" />);

    expect(screen.getByText(/Processing data/)).toBeInTheDocument();
  });

  test("renders without text when text prop is empty", () => {
    render(<LoadingSpinner text="" />);

    const loadingText = document.querySelector(".loading-text");
    expect(loadingText).not.toBeInTheDocument();
  });

  test("updates dots animation", () => {
    jest.useFakeTimers();

    render(<LoadingSpinner />);

    // Initial state should have one dot
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Advance timer to trigger dot update
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should now have two dots
    expect(screen.getByText("Loading..")).toBeInTheDocument();

    // Advance timer again
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should now have three dots
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Advance timer once more to reset
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should be back to one dot
    expect(screen.getByText("Loading.")).toBeInTheDocument();

    jest.useRealTimers();
  });
});
