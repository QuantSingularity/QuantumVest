import React, { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Appbar,
  Button,
  Chip,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { portfolioAPI } from "../services/api";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  handleApiError,
} from "../utils/errorHandler";
import LoadingSpinner from "../components/LoadingSpinner";
import StatCard from "../components/StatCard";
import PerformanceLineChart from "../components/PerformanceLineChart";
import AssetSearchInput from "../components/AssetSearchInput";

const TX_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "dividend", label: "Dividend" },
  { value: "deposit", label: "Deposit" },
];

const PortfolioDetailScreen = ({ route, navigation }) => {
  const { id, name } = route.params;
  const theme = useTheme();

  const [portfolio, setPortfolio] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [txDialogVisible, setTxDialogVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [txType, setTxType] = useState("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [savingTx, setSavingTx] = useState(false);

  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [optimizeError, setOptimizeError] = useState("");

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const [portfolioRes, perfRes, txRes] = await Promise.all([
          portfolioAPI.get(id),
          portfolioAPI.getPerformance(id, 90),
          portfolioAPI.getTransactions(id, 1, 10),
        ]);
        if (portfolioRes.data.success)
          setPortfolio(portfolioRes.data.portfolio);
        if (perfRes.data.success) setPerformance(perfRes.data.performance);
        if (txRes.data.success) setTransactions(txRes.data.transactions);
      } catch (err) {
        setError(handleApiError(err, "Couldn't load this portfolio."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleAddTransaction = async () => {
    if (!selectedAsset)
      return Alert.alert(
        "Select an asset",
        "Search for and select an asset first.",
      );
    if (!quantity || !price)
      return Alert.alert("Missing fields", "Quantity and price are required.");

    setSavingTx(true);
    try {
      const { data } = await portfolioAPI.addTransaction(id, {
        asset_symbol: selectedAsset.symbol,
        transaction_type: txType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
      });
      if (data.success) {
        setTxDialogVisible(false);
        setSelectedAsset(null);
        setQuantity("");
        setPrice("");
        load();
      } else {
        Alert.alert("Error", data.error || "Could not save transaction");
      }
    } catch (err) {
      Alert.alert("Error", handleApiError(err, "Could not save transaction."));
    } finally {
      setSavingTx(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimizeError("");
    setOptimization(null);
    try {
      const { data } = await portfolioAPI.optimize(id, {});
      if (data.success) setOptimization(data.optimization);
      else setOptimizeError(data.error || "Optimization failed");
    } catch (err) {
      if (err?.response?.status === 403) {
        setOptimizeError(
          "Portfolio optimization is a premium feature on this account.",
        );
      } else if (err?.response?.status === 400) {
        setOptimizeError(
          err.response.data?.error ||
            "Needs at least 2 holdings with price history.",
        );
      } else {
        setOptimizeError(handleApiError(err, "Could not run optimization."));
      }
    } finally {
      setOptimizing(false);
    }
  };

  const handleDeletePortfolio = () => {
    Alert.alert("Delete portfolio", `Delete "${portfolio.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await portfolioAPI.remove(id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner message="Loading portfolio..." />;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={portfolio?.name || name} />
        <Appbar.Action icon="delete-outline" onPress={handleDeletePortfolio} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }
      >
        {!!error && <Text style={{ color: theme.colors.error }}>{error}</Text>}
        {portfolio && (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Value"
                value={formatCurrency(
                  portfolio.total_value,
                  portfolio.currency,
                )}
              />
              <StatCard
                label="Invested"
                value={formatCurrency(
                  portfolio.invested_amount,
                  portfolio.currency,
                )}
              />
              <StatCard
                label="Unrealized P&L"
                value={formatCurrency(
                  portfolio.unrealized_pnl,
                  portfolio.currency,
                )}
                tone={portfolio.unrealized_pnl >= 0 ? "up" : "down"}
              />
              <StatCard
                label="Sharpe"
                value={
                  portfolio.sharpe_ratio
                    ? formatNumber(portfolio.sharpe_ratio)
                    : "—"
                }
              />
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
                Performance (90d)
              </Text>
              <PerformanceLineChart
                dates={performance?.dates || []}
                values={performance?.values || []}
              />
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
              <View style={styles.sectionHeader}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  Holdings
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {portfolio.holdings?.length || 0}
                </Text>
              </View>
              {!portfolio.holdings || portfolio.holdings.length === 0 ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  No holdings yet — add a transaction below.
                </Text>
              ) : (
                portfolio.holdings.map((h) => (
                  <View
                    key={h.id}
                    style={[
                      styles.holdingRow,
                      { borderBottomColor: theme.colors.outline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "700",
                        }}
                      >
                        {h.asset?.symbol}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          fontSize: 12,
                        }}
                      >
                        {formatNumber(h.quantity, 4)} units
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "600",
                        }}
                      >
                        {formatCurrency(h.market_value)}
                      </Text>
                      <Text
                        style={{
                          color: h.unrealized_pnl >= 0 ? "#22c55e" : "#f43f5e",
                          fontSize: 12,
                        }}
                      >
                        {formatPercentage(h.unrealized_pnl_percent)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <Button
                mode="contained-tonal"
                style={{ marginTop: 12 }}
                onPress={() => setTxDialogVisible(true)}
              >
                + Add Transaction
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
              <View style={styles.sectionHeader}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  AI Optimization
                </Text>
                <Button
                  compact
                  onPress={handleOptimize}
                  loading={optimizing}
                  disabled={optimizing}
                >
                  Run
                </Button>
              </View>
              {!!optimizeError && (
                <Text style={{ color: theme.colors.error }}>
                  {optimizeError}
                </Text>
              )}
              {optimization && (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Expected return{" "}
                    {formatPercentage(optimization.expected_return)} ·
                    Volatility {formatNumber(optimization.volatility)}% · Sharpe{" "}
                    {formatNumber(optimization.sharpe_ratio)}
                  </Text>
                  {optimization.recommendations.map((r) => (
                    <View key={r.symbol} style={styles.optRow}>
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "600",
                        }}
                      >
                        {r.symbol}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>
                        {(r.current_weight * 100).toFixed(1)}% →{" "}
                        {(r.optimal_weight * 100).toFixed(1)}%
                      </Text>
                      <Chip compact>{r.recommendation}</Chip>
                    </View>
                  ))}
                </View>
              )}
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
                Transactions
              </Text>
              {transactions.length === 0 ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  No transactions recorded.
                </Text>
              ) : (
                transactions.map((t) => (
                  <View
                    key={t.id}
                    style={[
                      styles.holdingRow,
                      { borderBottomColor: theme.colors.outline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.onSurface }}>
                        {t.transaction_type.toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          fontSize: 12,
                        }}
                      >
                        {new Date(t.executed_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(t.total_amount)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={txDialogVisible}
          onDismiss={() => setTxDialogVisible(false)}
          style={{ maxHeight: "85%" }}
        >
          <Dialog.Title>Add transaction</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
            >
              {selectedAsset ? (
                <View style={styles.selectedChip}>
                  <Text
                    style={{ color: theme.colors.onSurface, fontWeight: "600" }}
                  >
                    {selectedAsset.symbol} — {selectedAsset.name}
                  </Text>
                  <Button compact onPress={() => setSelectedAsset(null)}>
                    Change
                  </Button>
                </View>
              ) : (
                <AssetSearchInput onSelect={setSelectedAsset} />
              )}
              <SegmentedButtons
                value={txType}
                onValueChange={setTxType}
                buttons={TX_TYPES}
              />
              <TextInput
                mode="outlined"
                label="Quantity"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
              <TextInput
                mode="outlined"
                label="Price per unit"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
              <HelperText type="info" visible>
                Fees default to 0 — edit later from the web app if needed.
              </HelperText>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setTxDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleAddTransaction}
              loading={savingTx}
              disabled={savingTx}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  holdingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  optRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedChip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default PortfolioDetailScreen;
