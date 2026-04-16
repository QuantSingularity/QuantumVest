import React from "react";
import "../../styles/ErrorBoundary.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p>We're sorry, but there was an error loading this component.</p>
            <button
              className="retry-button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Try Again
            </button>
            {this.state.error && (
              <details className="error-details" style={{ marginTop: "1.5rem", textAlign: "left" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
                  Error Details
                </summary>
                <p style={{ color: "var(--danger-color)", fontFamily: "monospace", fontSize: "0.85rem" }}>
                  {this.state.error.toString()}
                </p>
                <pre style={{ fontSize: "0.75rem", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
