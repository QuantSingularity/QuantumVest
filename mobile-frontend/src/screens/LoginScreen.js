import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { brand } from "../theme/tokens";

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const { login } = useAuth();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setFormError("Enter your username/email and password.");
      return;
    }
    setFormError("");
    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);
    if (!result.success) {
      setFormError(result.error || "Login failed. Please try again.");
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
        <View style={styles.logoRow}>
          <View style={[styles.logoIcon, { backgroundColor: brand.primary }]}>
            <Text style={styles.logoIconText}>Q</Text>
          </View>
        </View>

        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.colors.onBackground }]}
        >
          Welcome back
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Sign in to your account to continue
        </Text>

        {!!formError && (
          <HelperText type="error" visible style={styles.formError}>
            {formError}
          </HelperText>
        )}

        <TextInput
          label="Username or email"
          value={identifier}
          onChangeText={setIdentifier}
          mode="outlined"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          left={<TextInput.Icon icon="account-outline" />}
          disabled={loading}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowPassword((p) => !p)}
            />
          }
          disabled={loading}
          onSubmitEditing={handleLogin}
        />

        <Button
          mode="text"
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.forgotButton}
          compact
        >
          Forgot password?
        </Button>

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
        >
          Sign In
        </Button>

        <View style={styles.switchRow}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Don&apos;t have an account?{" "}
          </Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
            compact
          >
            Create one
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoRow: { alignItems: "center", marginBottom: 24 },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoIconText: { color: "#0a0b14", fontWeight: "700", fontSize: 22 },
  title: { textAlign: "center", marginBottom: 4, fontWeight: "700" },
  subtitle: { textAlign: "center", marginBottom: 20 },
  formError: { textAlign: "center", marginBottom: 4 },
  input: { marginBottom: 14 },
  forgotButton: { alignSelf: "flex-end", marginBottom: 8 },
  button: { marginTop: 4, borderRadius: 12 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
});

export default LoginScreen;
