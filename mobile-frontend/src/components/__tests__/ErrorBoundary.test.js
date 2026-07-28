import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import ErrorBoundary from "../ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <Text>No Error</Text>;
};

describe("ErrorBoundary", () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when there is no error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(getByText("No Error")).toBeTruthy();
  });

  it("renders error UI when an error is thrown", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(getByText("Oops! Something went wrong")).toBeTruthy();
    expect(getByText(/We're sorry for the inconvenience/)).toBeTruthy();
  });

  it("shows Try Again button in error state", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const button = getByText("Try Again");
    expect(button).toBeTruthy();
  });

  it("resets error state when Try Again is pressed", async () => {
    let boundaryRef;
    const { getByText, rerender } = render(
      <ErrorBoundary
        ref={(r) => {
          boundaryRef = r;
        }}
      >
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(getByText("Oops! Something went wrong")).toBeTruthy();
    expect(boundaryRef.state.hasError).toBe(true);

    await act(async () => {
      boundaryRef.handleReset();
    });
    expect(boundaryRef.state.hasError).toBe(false);

    // With hasError cleared, rendering non-throwing children succeeds.
    rerender(
      <ErrorBoundary
        ref={(r) => {
          boundaryRef = r;
        }}
      >
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(getByText("No Error")).toBeTruthy();
  });
});
