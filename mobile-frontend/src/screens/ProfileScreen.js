import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Avatar,
  Button,
  Chip,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import Slider from "@react-native-community/slider";
import { useAuth } from "../context/AuthContext";
import { brand } from "../theme/tokens";

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const getInitials = (user) => {
  if (!user) return "QV";
  const { first_name, last_name, username } = user;
  if (first_name || last_name) {
    return (
      `${(first_name || "")[0] || ""}${(last_name || "")[0] || ""}`.toUpperCase() ||
      "QV"
    );
  }
  return (username || "QV").substring(0, 2).toUpperCase();
};

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, updateProfile, changePassword } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    risk_tolerance: 0.5,
    investment_experience: "beginner",
  });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        risk_tolerance: user.risk_tolerance ?? 0.5,
        investment_experience: user.investment_experience || "beginner",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    Alert.alert(
      result.success ? "Saved" : "Error",
      result.success ? "Profile updated." : result.error,
    );
  };

  const handlePasswordChange = async () => {
    setPwError("");
    if (pwForm.next.length < 8)
      return setPwError("New password must be at least 8 characters");
    if (pwForm.next !== pwForm.confirm)
      return setPwError("Passwords do not match");

    setPwSaving(true);
    const result = await changePassword(pwForm.current, pwForm.next);
    setPwSaving(false);
    if (result.success) {
      Alert.alert("Success", "Password changed.");
      setPwForm({ current: "", next: "", confirm: "" });
    } else {
      setPwError(result.error);
    }
  };

  const displayName =
    [form.first_name, form.last_name].filter(Boolean).join(" ") ||
    user?.username;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.Content title="My Profile" />
        <Appbar.Action
          icon="cog-outline"
          onPress={() => navigation.navigate("Settings")}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Avatar.Text
            size={64}
            label={getInitials(user)}
            style={{ backgroundColor: brand.primary }}
            color="#0a0b14"
          />
          <View>
            <Text
              variant="titleLarge"
              style={{ color: theme.colors.onBackground }}
            >
              {displayName}
            </Text>
            <Chip compact style={{ alignSelf: "flex-start", marginTop: 4 }}>
              {user?.role?.replace(/_/g, " ")}
            </Chip>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginBottom: 12 }}
          >
            Personal information
          </Text>
          <TextInput
            mode="outlined"
            label="Username"
            value={user?.username || ""}
            disabled
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Email"
            value={user?.email || ""}
            disabled
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="First name"
            value={form.first_name}
            onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Last name"
            value={form.last_name}
            onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))}
            style={styles.input}
          />

          <Text
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
          >
            Investment experience
          </Text>
          <SegmentedButtons
            value={form.investment_experience}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, investment_experience: v }))
            }
            buttons={EXPERIENCE_LEVELS}
            style={{ marginBottom: 16 }}
          />

          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Risk tolerance ({Math.round(form.risk_tolerance * 100)}%)
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={form.risk_tolerance}
            onValueChange={(v) => setForm((f) => ({ ...f, risk_tolerance: v }))}
            minimumTrackTintColor={brand.primary}
            style={{ marginBottom: 12 }}
          />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          >
            Save Changes
          </Button>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginBottom: 12 }}
          >
            Change password
          </Text>
          {!!pwError && (
            <HelperText type="error" visible>
              {pwError}
            </HelperText>
          )}
          <TextInput
            mode="outlined"
            label="Current password"
            secureTextEntry
            value={pwForm.current}
            onChangeText={(v) => setPwForm((f) => ({ ...f, current: v }))}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="New password"
            secureTextEntry
            value={pwForm.next}
            onChangeText={(v) => setPwForm((f) => ({ ...f, next: v }))}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Confirm new password"
            secureTextEntry
            value={pwForm.confirm}
            onChangeText={(v) => setPwForm((f) => ({ ...f, confirm: v }))}
            style={styles.input}
          />
          <Button
            mode="outlined"
            onPress={handlePasswordChange}
            loading={pwSaving}
            disabled={pwSaving}
          >
            Update Password
          </Button>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, marginBottom: 10 }}
          >
            Compliance
          </Text>
          <View style={styles.chipRow}>
            <Chip icon="shield-check-outline">
              KYC: {user?.kyc_status || "pending"}
            </Chip>
            <Chip icon="shield-check-outline">
              AML: {user?.aml_status || "pending"}
            </Chip>
            <Chip
              icon={
                user?.is_verified ? "check-decagram" : "alert-circle-outline"
              }
            >
              {user?.is_verified ? "Verified" : "Unverified"}
            </Chip>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  input: { marginBottom: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

export default ProfileScreen;
