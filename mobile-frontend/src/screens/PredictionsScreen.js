import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Chip,
  Text,
  useTheme,
} from "react-native-paper";
import AssetSearchInput from "../components/AssetSearchInput";
import ForecastLineChart from "../components/ForecastLineChart";
import StatCard from "../components/StatCard";
import { predictionAPI } from "../services/api";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  handleApiError,
} from "../utils/errorHandler";
import { status } from "../theme/tokens";

const HORIZONS = [5, 7, 14, 30];

const DIRECTION_LABEL = { up: "Upward", down: "Downward", neutral: "Neutral" };

const toPercent = (value) =>
  value === null || value === undefined
    ? "N/A"
    : `${(Number(value) * 100).toFixed(1)}%`;

const PredictionsScreen = () => {
  const theme = useTheme();
  const [asset, setAsset] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const load = useCallback(async (selected, horizon) => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await predictionAPI.get(selected.symbol, {
        asset_type: selected.asset_type,
        days: horizon,
      });
      if (data.success) setResult(data);
      else setError(data.error || "Forecast unavailable");
    } catch (err) {
      setError(handleApiError(err, "Could not generate a forecast."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(asset, days);
  }, [asset, days, load]);

  const metrics = result?.model?.metrics || {};
  const tone =
    result?.expected_return > 0
      ? "up"
      : result?.expected_return < 0
        ? "down"
        : undefined;

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
            placeholder="Search an asset to forecast"
          />
          <View style={styles.chips}>
            {HORIZONS.map((h) => (
              <Chip
                key={h}
                selected={days === h}
                disabled={loading}
                onPress={() => setDays(h)}
                compact
              >
                {h}d
              </Chip>
            ))}
          </View>

          {!asset && !loading && (
            <View style={styles.emptyState}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
              >
                Select an asset
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.emptyText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Pick a stock or crypto asset to generate a forecast. The first
                request for an asset trains a model, which can take a few
                seconds.
              </Text>
            </View>
          )}

          {loading && (
            <View style={styles.emptyState}>
              <ActivityIndicator animating size="large" />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Preparing forecast for {asset?.symbol}
              </Text>
            </View>
          )}

          {!!error && !loading && (
            <Text style={{ color: theme.colors.error, marginTop: 12 }}>
              {error}
            </Text>
          )}
        </View>

        {result && !loading && (
          <>
            <View style={styles.statRow}>
              <StatCard
                label={`${result.symbol} last close`}
                value={formatCurrency(result.last_price)}
                hint={result.last_timestamp}
              />
              <StatCard
                label={`Expected move, ${result.steps}d`}
                value={formatPercentage(result.expected_return * 100)}
                hint={DIRECTION_LABEL[result.direction] || result.direction}
                tone={tone}
              />
            </View>
            <View style={styles.statRow}>
              <StatCard
                label="Held-out direction accuracy"
                value={toPercent(metrics.directional_accuracy)}
                hint={`${metrics.samples ?? 0} days`}
              />
              <StatCard
                label="Skill vs naive"
                value={`${formatNumber((metrics.skill_vs_naive ?? 0) * 100, 1)}%`}
                hint={result.model.type}
              />
            </View>

            {!result.model.beats_naive && (
              <Text style={{ color: status.warning }}>
                This model did not beat a no-change baseline on held-out data.
                Treat the forecast as indicative only.
              </Text>
            )}

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
                Forecast with 95% range
              </Text>
              <ForecastLineChart
                lastDate={result.last_timestamp}
                lastPrice={result.last_price}
                forecast={result.forecast}
              />
              {result.forecast.map((row) => (
                <View key={row.date} style={styles.row}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {row.date}
                  </Text>
                  <Text
                    style={{ color: theme.colors.onSurface, fontWeight: "600" }}
                  >
                    {formatCurrency(row.predicted_price)}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      fontSize: 12,
                    }}
                  >
                    {formatCurrency(row.lower)} to {formatCurrency(row.upper)}
                  </Text>
                </View>
              ))}
            </View>

            <Text
              style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            >
              Forecasts are statistical estimates, not financial advice.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  chips: { flexDirection: "row", gap: 8, marginTop: 12 },
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { textAlign: "center" },
  statRow: { flexDirection: "row", gap: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
});

export default PredictionsScreen;
