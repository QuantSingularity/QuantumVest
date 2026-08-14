import React from "react";
import { render, act, fireEvent } from "@testing-library/react-native";
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

    // BUGFIX: this test previously called `boundaryRef.handleReset()`
    // directly while the child was still configured to throw
    // (`shouldThrow={true}`). Clearing `hasError` makes the boundary
    // render `this.props.children` again, so the still-throwing child
    // throws immediately, and getDerivedStateFromError re-catches it
    // within the same act() call - hasError snaps straight back to
    // `true` before the assertion ever sees it false. That's correct,
    // expected error-boundary behavior, not a bug: resetting only makes
    // sense once whatever caused the error has actually been fixed.
    //
    // Mirror that here by updating the child to stop throwing first (the
    // fallback UI still renders at this point, since state.hasError is
    // still true - only the props/children changed), then actually
    // press the "Try Again" button, matching what this test claims to
    // verify.
    rerender(
      <ErrorBoundary
        ref={(r) => {
          boundaryRef = r;
        }}
      >
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(getByText("Oops! Something went wrong")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText("Try Again"));
    });

    expect(boundaryRef.state.hasError).toBe(false);
    expect(getByText("No Error")).toBeTruthy();
  });
});
