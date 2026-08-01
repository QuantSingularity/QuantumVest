import React, { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Divider,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Config from "../config/config";

const PREFS_KEY = "@QuantumVest:notification_prefs";
const DEFAULT_PREFS = {
  emailDigest: true,
  priceAlerts: true,
  transactionAlerts: true,
};

const SettingsRow = ({ title, description, children }) => {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: theme.colors.onSurface, fontWeight: "600" }}>
          {title}
        </Text>
        {!!description && (
          <Text
            style={{
              color: theme.colors.onSurfaceVariant,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
};

const SettingsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { theme: appTheme, toggleTheme } = useApp();
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((saved) => {
      if (saved) setPrefs(JSON.parse(saved));
    });
  }, []);

  const updatePref = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = () => logout();

  const openLegal = (path) => {
    const base = Config.API_BASE_URL.replace("/api/v1", "").replace(
      ":5000",
      ":3000",
    );
    Linking.openURL(`${base}${path}`).catch(() => {});
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
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
            style={{ color: theme.colors.onSurface, marginBottom: 8 }}
          >
            Appearance
          </Text>
          <SettingsRow
            title="Dark mode"
            description="Switch between light and dark theme"
          >
            <Switch value={appTheme === "dark"} onValueChange={toggleTheme} />
          </SettingsRow>
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
            style={{ color: theme.colors.onSurface, marginBottom: 8 }}
          >
            Notifications
          </Text>
          <Text
            style={{
              color: theme.colors.onSurfaceVariant,
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            Saved on this device - the backend doesn&apos;t send notification
            emails yet.
          </Text>
          <SettingsRow
            title="Email digest"
            description="Weekly performance summary"
          >
            <Switch
              value={prefs.emailDigest}
              onValueChange={() => updatePref("emailDigest")}
            />
          </SettingsRow>
          <Divider />
          <SettingsRow
            title="Price alerts"
            description="Significant moves in your watchlists"
          >
            <Switch
              value={prefs.priceAlerts}
              onValueChange={() => updatePref("priceAlerts")}
            />
          </SettingsRow>
          <Divider />
          <SettingsRow
            title="Transaction alerts"
            description="When a transaction is recorded"
          >
            <Switch
              value={prefs.transactionAlerts}
              onValueChange={() => updatePref("transactionAlerts")}
            />
          </SettingsRow>
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
            style={{ color: theme.colors.onSurface, marginBottom: 8 }}
          >
            Security
          </Text>
          <SettingsRow
            title="Password"
            description="Change your password from your profile"
          >
            <Button compact onPress={() => navigation.navigate("Profile")}>
              Profile
            </Button>
          </SettingsRow>
          <Divider />
          <SettingsRow
            title="Two-factor authentication"
            description={
              user?.two_factor_enabled ? "Enabled" : "Not yet available"
            }
          >
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {user?.two_factor_enabled ? "On" : "-"}
            </Text>
          </SettingsRow>
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
            style={{ color: theme.colors.onSurface, marginBottom: 8 }}
          >
            About
          </Text>
          <SettingsRow title="Terms of Service">
            <Button compact onPress={() => openLegal("/terms")}>
              View
            </Button>
          </SettingsRow>
          <Divider />
          <SettingsRow title="Privacy Policy">
            <Button compact onPress={() => openLegal("/privacy")}>
              View
            </Button>
          </SettingsRow>
        </View>

        <Button
          mode="contained-tonal"
          textColor={theme.colors.error}
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Sign Out
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  logoutButton: { marginTop: 4 },
});

export default SettingsScreen;
