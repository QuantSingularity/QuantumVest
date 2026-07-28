import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text variant="headlineMedium" style={styles.title}>
            Oops! Something went wrong
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            We&apos;re sorry for the inconvenience. The app encountered an
            unexpected error.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text variant="bodySmall" style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
              {this.state.errorInfo && (
                <Text variant="bodySmall" style={styles.stackTrace}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}
          <Button
            mode="contained"
            onPress={this.handleReset}
            style={styles.button}
          >
            Try Again
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: 10,
    textAlign: "center",
    color: "#d32f2f",
  },
  message: {
    marginBottom: 20,
    textAlign: "center",
    color: "#666",
  },
  errorDetails: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    maxHeight: 200,
  },
  errorText: {
    color: "#d32f2f",
    fontFamily: "monospace",
    marginBottom: 10,
  },
  stackTrace: {
    color: "#666",
    fontFamily: "monospace",
    fontSize: 10,
  },
  button: {
    marginTop: 20,
    minWidth: 150,
  },
});

export default ErrorBoundary;
