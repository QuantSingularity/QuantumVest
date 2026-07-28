import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Menu,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { portfolioAPI, riskAPI } from "../services/api";
import { handleApiError } from "../utils/errorHandler";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";

const toDailyReturns = (values = []) => {
  const returns = [];
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1];
    if (prev) returns.push((values[i] - prev) / prev);
  }
  return returns;
};

const METHODS = [
  { value: "historical", label: "Historical" },
  { value: "parametric", label: "Parametric" },
  { value: "monte_carlo", label: "Monte Carlo" },
];

const RiskAnalyticsScreen = ({ navigation }) => {
  const theme = useTheme();
  const [portfolios, setPortfolios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [method, setMethod] = useState("historical");
  const [menuVisible, setMenuVisible] = useState(false);
  const [portfolioMenuVisible, setPortfolioMenuVisible] = useState(false);
  const [horizon, setHorizon] = useState("1");

  const [calculating, setCalculating] = useState(false);
  const [varResult, setVarResult] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const { data } = await portfolioAPI.list();
          if (data.success) {
            setPortfolios(data.portfolios);
            if (data.portfolios.length > 0) setSelected(data.portfolios[0]);
          }
        } catch (err) {
          setError(handleApiError(err, "Couldn't load portfolios."));
        } finally {
          setLoading(false);
        }
      };
      load();
    }, []),
  );

  useEffect(() => {
    if (!selected) return;
    const loadReturns = async () => {
      setVarResult(null);
      setMetrics(null);
      try {
        const { data } = await portfolioAPI.getPerformance(selected.id, 365);
        if (data.success)
          setReturns(toDailyReturns(data.performance.values || []));
      } catch (err) {
        setError(handleApiError(err, "Couldn't load return history."));
      }
    };
    loadReturns();
  }, [selected]);

  const hasEnoughData = returns.length >= 10;

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const [varRes, metricsRes] = await Promise.all([
        riskAPI.calculateVar({
          returns,
          alpha: 0.05,
          method,
          time_horizon: parseInt(horizon, 10) || 1,
        }),
        riskAPI.calculateMetrics({ returns }),
      ]);
      if (varRes.data.success) setVarResult(varRes.data);
      if (metricsRes.data.success) setMetrics(metricsRes.data.metrics);
    } catch (err) {
      setError(handleApiError(err, "Could not calculate risk metrics."));
    } finally {
      setCalculating(false);
    }
  };

  const methodLabel = useMemo(
    () => METHODS.find((m) => m.value === method)?.label,
    [method],
  );

  if (loading) return <LoadingSpinner message="Loading risk analytics..." />;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.Content title="Risk Analytics" subtitle="VaR & risk metrics" />
        <Appbar.Action
          icon="brain"
          onPress={() => navigation.navigate("Predictions")}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {!!error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

        {portfolios.length === 0 ? (
          <EmptyState
            icon="chart-bell-curve"
            title="No portfolios to analyze"
            message="Create a portfolio and add holdings first."
          />
        ) : (
          <>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <Menu
                visible={portfolioMenuVisible}
                onDismiss={() => setPortfolioMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setPortfolioMenuVisible(true)}
                    style={{ marginBottom: 10 }}
                  >
                    {selected?.name || "Select portfolio"}
                  </Button>
                }
              >
                {portfolios.map((p) => (
                  <Menu.Item
                    key={p.id}
                    title={p.name}
                    onPress={() => {
                      setSelected(p);
                      setPortfolioMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>

              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    style={{ marginBottom: 10 }}
                  >
                    {methodLabel}
                  </Button>
                }
              >
                {METHODS.map((m) => (
                  <Menu.Item
                    key={m.value}
                    title={m.label}
                    onPress={() => {
                      setMethod(m.value);
                      setMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>

              <TextInput
                mode="outlined"
                label="Time horizon (days)"
                keyboardType="numeric"
                value={horizon}
                onChangeText={setHorizon}
                style={{ marginBottom: 10 }}
              />

              {!hasEnoughData ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {selected?.name} has {returns.length} day(s) of history — at
                  least 10 are needed.
                </Text>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleCalculate}
                  loading={calculating}
                  disabled={calculating}
                >
                  Calculate
                </Button>
              )}
            </View>

            {varResult && (
              <View style={styles.statsGrid}>
                <StatCard
                  label="VaR (95%)"
                  value={`${(varResult.var * 100).toFixed(2)}%`}
                  tone="down"
                />
                <StatCard
                  label="CVaR"
                  value={`${(varResult.cvar * 100).toFixed(2)}%`}
                  tone="down"
                />
              </View>
            )}

            {metrics && (
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
                  Risk metrics
                </Text>
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Ann. Return"
                    value={`${(metrics.annualized_return * 100).toFixed(2)}%`}
                    tone={metrics.annualized_return >= 0 ? "up" : "down"}
                  />
                  <StatCard
                    label="Volatility"
                    value={`${(metrics.volatility * 100).toFixed(2)}%`}
                  />
                  <StatCard
                    label="Sharpe"
                    value={metrics.sharpe_ratio.toFixed(2)}
                  />
                  <StatCard
                    label="Max Drawdown"
                    value={`${(metrics.max_drawdown * 100).toFixed(2)}%`}
                    tone="down"
                  />
                </View>
              </View>
            )}
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
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});

export default RiskAnalyticsScreen;
