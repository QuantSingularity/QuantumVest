import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Text, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AssetSearchInput from "../components/AssetSearchInput";
import { brand } from "../theme/tokens";

const ROADMAP = [
  {
    title: "GE-LSTM-Attn forecasting",
    description:
      "Graph-enhanced LSTM with attention and GraphSHAP explainability, currently in research.",
  },
  {
    title: "Quantum Graph Reinforcement Learning",
    description:
      "QGRL-based liquidity and allocation research, theoretical pending quantum hardware access.",
  },
  {
    title: "Live inference API",
    description:
      "Once validated, models will be exposed through a versioned /predictions endpoint.",
  },
];

const PredictionsScreen = () => {
  const theme = useTheme();
  const [asset, setAsset] = useState(null);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.Content title="AI Predictions" subtitle="Market forecasting" />
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
          <AssetSearchInput
            onSelect={setAsset}
            placeholder="Search an asset to check forecast availability…"
          />

          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: `${brand.primary}22` },
              ]}
            >
              <Icon name="brain" size={26} color={brand.primary} />
            </View>
            {asset ? (
              <>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  No live forecast for {asset.symbol} yet
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  QuantumVest&apos;s prediction models are still in research and
                  haven&apos;t been connected to a production inference
                  endpoint. We&apos;d rather show nothing than a number we
                  can&apos;t stand behind.
                </Text>
              </>
            ) : (
              <>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  Prediction engine - in research
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  This screen will show real, model-backed forecasts once the
                  inference API ships. Until then we won&apos;t fabricate
                  numbers here.
                </Text>
              </>
            )}
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
            Research roadmap
          </Text>
          {ROADMAP.map((r) => (
            <View key={r.title} style={styles.roadmapRow}>
              <View style={[styles.dot, { backgroundColor: brand.primary }]} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "600",
                    marginBottom: 2,
                  }}
                >
                  {r.title}
                </Text>
                <Text
                  style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}
                >
                  {r.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  emptyState: {
    alignItems: "center",
    textAlign: "center",
    paddingVertical: 24,
    gap: 6,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyText: { textAlign: "center" },
  roadmapRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});

export default PredictionsScreen;
