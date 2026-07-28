import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  useTheme,
  Card,
  HelperText,
} from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { showErrorAlert, validateEmail } from "../utils/errorHandler";

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const theme = useTheme();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      });

      if (!result.success) {
        showErrorAlert(
          result.error || "Registration failed",
          "Registration Error",
        );
      }
    } catch (error) {
      showErrorAlert(error, "Registration Error");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
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
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Create Account
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Join QuantumVest to start your investment journey
            </Text>

            <TextInput
              label="Username *"
              value={formData.username}
              onChangeText={(value) => updateFormData("username", value)}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              error={!!errors.username}
              left={<TextInput.Icon icon="account" />}
              disabled={loading}
            />
            {errors.username && (
              <HelperText type="error">{errors.username}</HelperText>
            )}

            <TextInput
              label="Email *"
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              error={!!errors.email}
              left={<TextInput.Icon icon="email" />}
              disabled={loading}
            />
            {errors.email && (
              <HelperText type="error">{errors.email}</HelperText>
            )}

            <TextInput
              label="First Name *"
              value={formData.firstName}
              onChangeText={(value) => updateFormData("firstName", value)}
              mode="outlined"
              style={styles.input}
              autoCapitalize="words"
              error={!!errors.firstName}
              left={<TextInput.Icon icon="account-circle" />}
              disabled={loading}
            />
            {errors.firstName && (
              <HelperText type="error">{errors.firstName}</HelperText>
            )}

            <TextInput
              label="Last Name"
              value={formData.lastName}
              onChangeText={(value) => updateFormData("lastName", value)}
              mode="outlined"
              style={styles.input}
              autoCapitalize="words"
              error={!!errors.lastName}
              left={<TextInput.Icon icon="account-circle-outline" />}
              disabled={loading}
            />
            {errors.lastName && (
              <HelperText type="error">{errors.lastName}</HelperText>
            )}

            <TextInput
              label="Password *"
              value={formData.password}
              onChangeText={(value) => updateFormData("password", value)}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              error={!!errors.password}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              disabled={loading}
            />
            {errors.password && (
              <HelperText type="error">{errors.password}</HelperText>
            )}

            <TextInput
              label="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData("confirmPassword", value)}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              error={!!errors.confirmPassword}
              left={<TextInput.Icon icon="lock-check" />}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? "eye-off" : "eye"}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              disabled={loading}
            />
            {errors.confirmPassword && (
              <HelperText type="error">{errors.confirmPassword}</HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.button}
              icon="account-plus"
            >
              Register
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.textButton}
            >
              Already have an account? Sign In
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
    color: "#666",
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
  },
  textButton: {
    marginTop: 8,
  },
});

export default RegisterScreen;
