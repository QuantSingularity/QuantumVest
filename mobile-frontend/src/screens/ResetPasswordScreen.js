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

const ResetPasswordScreen = ({ navigation }) => {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | done
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const validate = () => {
    const e = {};
    if (!token.trim()) e.token = "Paste the reset code from your email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.resetPassword(token.trim(), password);
      setStatus("done");
    } catch (err) {
      setErrors({
        form:
          err?.response?.data?.error ||
          "This reset code is invalid or has expired. Please request a new one.",
      });
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
        {status === "done" ? (
          <>
            <Text
              variant="headlineSmall"
              style={[styles.title, { color: theme.colors.onBackground }]}
            >
              Password updated
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Your password has been reset. Sign in with your new password.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate("Login")}
              style={styles.button}
            >
              Back to Sign In
            </Button>
          </>
        ) : (
          <>
            <Text
              variant="headlineSmall"
              style={[styles.title, { color: theme.colors.onBackground }]}
            >
              Reset your password
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Paste the reset code you received and choose a new password.
            </Text>
            {!!errors.form && (
              <HelperText type="error" visible>
                {errors.form}
              </HelperText>
            )}
            <TextInput
              label="Reset code"
              value={token}
              onChangeText={(v) => {
                setToken(v);
                setErrors((prev) => ({ ...prev, token: undefined }));
              }}
              mode="outlined"
              autoCapitalize="none"
              multiline
              style={styles.input}
              left={<TextInput.Icon icon="key-outline" />}
            />
            {!!errors.token && (
              <HelperText type="error" visible>
                {errors.token}
              </HelperText>
            )}
            <TextInput
              label="New password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              left={<TextInput.Icon icon="lock-outline" />}
            />
            {!!errors.password && (
              <HelperText type="error" visible>
                {errors.password}
              </HelperText>
            )}
            <TextInput
              label="Confirm new password"
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                setErrors((prev) => ({ ...prev, confirm: undefined }));
              }}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              left={<TextInput.Icon icon="lock-check-outline" />}
            />
            {!!errors.confirm && (
              <HelperText type="error" visible>
                {errors.confirm}
              </HelperText>
            )}
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Reset Password
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
  input: { marginBottom: 4 },
  button: { borderRadius: 12, marginTop: 12 },
});

export default ResetPasswordScreen;
