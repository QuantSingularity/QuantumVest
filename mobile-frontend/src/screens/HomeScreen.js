import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { brand } from "../theme/tokens";

const FEATURES = [
  {
    icon: "briefcase-outline",
    title: "Multi-Portfolio Management",
    description:
      "Track holdings and transactions across as many portfolios as you need.",
  },
  {
    icon: "chart-line",
    title: "Institutional Risk Analytics",
    description:
      "Historical, parametric, and Monte Carlo Value-at-Risk, plus Sharpe & Sortino ratios.",
  },
  {
    icon: "chart-donut",
    title: "Mean-Variance Optimization",
    description:
      "Get data-driven allocation recommendations built on modern portfolio theory.",
  },
  {
    icon: "star-outline",
    title: "Real-Time Watchlists",
    description:
      "Organize any stock, crypto, ETF, or bond and act the moment an opportunity appears.",
  },
];

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.logoRow}>
        <View style={[styles.logoIcon, { backgroundColor: brand.primary }]}>
          <Text style={styles.logoIconText}>Q</Text>
        </View>
        <Text
          variant="titleLarge"
          style={{ color: theme.colors.onBackground, fontWeight: "700" }}
        >
          QuantumVest
        </Text>
      </View>

      <Text
        variant="headlineMedium"
        style={[styles.heroTitle, { color: theme.colors.onBackground }]}
      >
        Invest with clarity, backed by{" "}
        <Text style={{ color: brand.primary }}>real data</Text>.
      </Text>
      <Text
        variant="bodyLarge"
        style={[styles.heroSubtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Portfolio construction, institutional-grade risk analytics, and
        mean-variance optimization - all in one app built for serious investors.
      </Text>

      <View style={styles.ctaRow}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("Register")}
          style={styles.ctaButton}
          contentStyle={styles.ctaContent}
        >
          Create Free Account
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate("Login")}
          style={styles.ctaButton}
          contentStyle={styles.ctaContent}
        >
          Sign In
        </Button>
      </View>

      <View style={styles.featuresSection}>
        <Text
          variant="labelLarge"
          style={{ color: brand.accent, letterSpacing: 1 }}
        >
          FEATURES
        </Text>
        <Text
          variant="titleLarge"
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Everything you need to manage risk
        </Text>

        {FEATURES.map((f) => (
          <View
            key={f.title}
            style={[
              styles.featureCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: `${brand.primary}22` },
              ]}
            >
              <Icon name={f.icon} size={22} color={brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface, marginBottom: 2 }}
              >
                {f.title}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {f.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View
        style={[styles.footerCta, { backgroundColor: theme.colors.surface }]}
      >
        <Text
          variant="titleLarge"
          style={{
            color: theme.colors.onSurface,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Start managing risk like a professional
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("Register")}
        >
          Create Free Account
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoIconText: { color: "#0a0b14", fontWeight: "700", fontSize: 18 },
  heroTitle: { fontWeight: "700", marginBottom: 12, lineHeight: 34 },
  heroSubtitle: { marginBottom: 24, lineHeight: 22 },
  ctaRow: { gap: 10, marginBottom: 40 },
  ctaButton: { borderRadius: 12 },
  ctaContent: { paddingVertical: 6 },
  featuresSection: { marginBottom: 32 },
  sectionTitle: { fontWeight: "700", marginTop: 4, marginBottom: 20 },
  featureCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCta: { padding: 24, borderRadius: 20, alignItems: "center" },
});

export default HomeScreen;
