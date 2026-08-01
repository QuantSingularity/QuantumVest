import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  Button,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { authAPI } from "../services/api";
import { validateEmail } from "../utils/errorHandler";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sent | unavailable
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleSubmit = async () => {
    if (!email) return setError("Email is required");
    if (!validateEmail(email)) return setError("Enter a valid email address");
    setError("");
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setStatus("sent");
    } catch (err) {
      setStatus(err?.response?.status === 404 ? "unavailable" : "sent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {status === "sent" && (
          <>
            <Text
              variant="headlineSmall"
              style={[styles.title, { color: theme.colors.onBackground }]}
            >
              Check your email
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              If an account exists for {email}, a password reset link is on its
              way.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate("Login")}
              style={styles.button}
            >
              Back to Sign In
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.navigate("ResetPassword")}
              style={{ marginTop: 8 }}
            >
              I already have a reset code
            </Button>
          </>
        )}

        {status === "unavailable" && (
          <>
            <Text
              variant="headlineSmall"
              style={[styles.title, { color: theme.colors.onBackground }]}
            >
              Recovery isn&apos;t enabled yet
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              This QuantumVest deployment doesn&apos;t have self-service
              password reset configured yet. Please contact support to regain
              access.
            </Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate("Login")}
              style={styles.button}
            >
              Back to Sign In
            </Button>
          </>
        )}

        {status === "idle" && (
          <>
            <Text
              variant="headlineSmall"
              style={[styles.title, { color: theme.colors.onBackground }]}
            >
              Forgot password?
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Enter your email and we&apos;ll send you a reset link.
            </Text>
            {!!error && (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            )}
            <TextInput
              label="Email address"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError("");
              }}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              left={<TextInput.Icon icon="email-outline" />}
            />
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Send Reset Link
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.navigate("Login")}
              style={{ marginTop: 8 }}
            >
              Back to Sign In
            </Button>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { textAlign: "center", fontWeight: "700", marginBottom: 8 },
  subtitle: { textAlign: "center", marginBottom: 20 },
  input: { marginBottom: 16 },
  button: { borderRadius: 12 },
});

export default ForgotPasswordScreen;
