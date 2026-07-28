import React from "react";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

describe("LoadingSpinner Component", () => {
  test("renders a spinner with no message by default", () => {
    render(<LoadingSpinner />);
    expect(document.querySelector(".spinner")).toBeInTheDocument();
    expect(document.querySelector(".loading-text")).not.toBeInTheDocument();
  });

  test("renders the provided message", () => {
    render(<LoadingSpinner message="Loading your account..." />);
    expect(screen.getByText("Loading your account...")).toBeInTheDocument();
  });

  test("supports the legacy `text` prop", () => {
    render(<LoadingSpinner text="Processing data" />);
    expect(screen.getByText("Processing data")).toBeInTheDocument();
  });

  test("renders a fullscreen overlay when fullScreen is set", () => {
    render(<LoadingSpinner fullScreen message="Loading..." />);
    expect(document.querySelector(".loading-fullscreen")).toBeInTheDocument();
  });

  test("renders a compact inline spinner when inline is set", () => {
    render(<LoadingSpinner inline />);
    expect(document.querySelector(".loading-inline")).toBeInTheDocument();
  });
});
