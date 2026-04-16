import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../../components/ui/ErrorBoundary";

// Create a component that throws an error
const ErrorComponent = () => {
  throw new Error("Test error");
  return <div>This should not render</div>;
};

// Create a working component
const WorkingComponent = () => {
  return <div>Working component</div>;
};

describe("ErrorBoundary Component", () => {
  // Suppress console errors for clean test output
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  test("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Working component")).toBeInTheDocument();
  });

  test("renders fallback UI when error occurs", () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We're sorry, but there was an error loading this component.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  test("shows error details when showDetails prop is true", () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ErrorComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error Details")).toBeInTheDocument();
    expect(screen.getByText("Error: Test error")).toBeInTheDocument();
  });
});
