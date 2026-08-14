import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Chip,
  DataTable,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { blockchainAPI } from "../services/api";
import { handleApiError } from "../utils/errorHandler";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import { status as statusColors } from "../theme/tokens";

const CONTRACT_LABELS = {
  DataTracking: "Data Tracking",
  TrendAnalysis: "Trend Analysis",
  QuantumVestToken: "QuantumVest Token (QVT)",
  QuantumVestOracle: "Price Oracle",
};

const truncateAddress = (address) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

const BlockchainScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError("");
    try {
      const { data } = await blockchainAPI.status();
      setStatus(data);
    } catch (err) {
      setError(handleApiError(err, "Couldn't reach the blockchain gateway."));
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus]),
  );

  // ── Price trend / moving average (TrendAnalysis) ─────────────────────
  const [maWindow, setMaWindow] = useState("7");
  const [trend, setTrend] = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const loadTrend = useCallback(async () => {
    setLoadingTrend(true);
    try {
      const { data } = await blockchainAPI.getTrend(
        parseInt(maWindow, 10) || 1,
      );
      setTrend(data);
    } catch (err) {
      setError(handleApiError(err, "Couldn't load the price trend."));
    } finally {
      setLoadingTrend(false);
    }
  }, [maWindow]);

  // ── On-chain market data (DataTracking) ───────────────────────────────
  const [ticker, setTicker] = useState("ETH");
  const [marketData, setMarketData] = useState(null);
  const [loadingMarketData, setLoadingMarketData] = useState(false);

  const lookupMarketData = async () => {
    if (!ticker.trim()) return;
    setLoadingMarketData(true);
    try {
      const { data } = await blockchainAPI.getMarketData(ticker.trim());
      setMarketData(data);
    } catch (err) {
      setMarketData(null);
      setError(handleApiError(err, "Couldn't load market data."));
    } finally {
      setLoadingMarketData(false);
    }
  };

  const [recordTicker, setRecordTicker] = useState("");
  const [recordPrice, setRecordPrice] = useState("");
  const [recordVolume, setRecordVolume] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordMessage, setRecordMessage] = useState("");

  const submitRecord = async () => {
    setRecording(true);
    setRecordMessage("");
    try {
      const { data } = await blockchainAPI.recordMarketData({
        ticker: recordTicker.trim(),
        price: Number(recordPrice),
        volume: Number(recordVolume),
      });
      setRecordMessage(`Recorded on-chain in block ${data.block_number}.`);
      setRecordTicker("");
      setRecordPrice("");
      setRecordVolume("");
    } catch (err) {
      setError(handleApiError(err, "Couldn't record this data point."));
    } finally {
      setRecording(false);
    }
  };

  // ── Token balance (QuantumVestToken) ──────────────────────────────────
  const [balanceAddress, setBalanceAddress] = useState("");
  const [balanceResult, setBalanceResult] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const lookupBalance = async () => {
    if (!balanceAddress.trim()) return;
    setLoadingBalance(true);
    try {
      const { data } = await blockchainAPI.getTokenBalance(
        balanceAddress.trim(),
      );
      setBalanceResult(data);
    } catch (err) {
      setBalanceResult(null);
      setError(handleApiError(err, "Couldn't look up that balance."));
    } finally {
      setLoadingBalance(false);
    }
  };

  // ── Oracle price (QuantumVestOracle) ──────────────────────────────────
  const [oracleAddress, setOracleAddress] = useState("");
  const [oracleResult, setOracleResult] = useState(null);
  const [loadingOracle, setLoadingOracle] = useState(false);

  const lookupOracle = async () => {
    if (!oracleAddress.trim()) return;
    setLoadingOracle(true);
    try {
      const { data } = await blockchainAPI.getOraclePrice(oracleAddress.trim());
      setOracleResult(data);
    } catch (err) {
      setOracleResult(null);
      setError(handleApiError(err, "No price available for that asset."));
    } finally {
      setLoadingOracle(false);
    }
  };

  const card = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outline,
  };

  if (loadingStatus) {
    return <LoadingSpinner message="Connecting to the blockchain..." />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title="Blockchain"
          subtitle={status?.connected ? "Connected" : "Disconnected"}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {!!error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

        {!status?.connected ? (
          <EmptyState
            icon="link-variant-off"
            title="No blockchain connection"
            message="The backend isn't connected to a Web3 provider right now. This is an optional feature - it needs a running blockchain node to be configured."
          />
        ) : (
          <>
            <View style={[styles.card, card]}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface, marginBottom: 10 }}
              >
                Network
              </Text>
              <View style={styles.statsGrid}>
                <StatCard label="Chain ID" value={String(status.chain_id)} />
                <StatCard
                  label="Block Number"
                  value={String(status.block_number)}
                />
              </View>
              <View style={{ marginTop: 12, gap: 8 }}>
                {Object.entries(status.contracts || {}).map(
                  ([name, address]) => (
                    <View key={name} style={styles.contractRow}>
                      <Text style={{ color: theme.colors.onSurface }}>
                        {CONTRACT_LABELS[name] || name}
                      </Text>
                      {address ? (
                        <Chip
                          compact
                          style={{ backgroundColor: statusColors.successSoft }}
                          textStyle={{ color: statusColors.success }}
                        >
                          {truncateAddress(address)}
                        </Chip>
                      ) : (
                        <Chip
                          compact
                          style={{ backgroundColor: statusColors.warningSoft }}
                          textStyle={{ color: statusColors.warning }}
                        >
                          Not deployed
                        </Chip>
                      )}
                    </View>
                  ),
                )}
              </View>
            </View>

            {status?.contracts?.TrendAnalysis && (
              <View style={[styles.card, card]}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, marginBottom: 10 }}
                >
                  Price trend
                </Text>
                <TextInput
                  mode="outlined"
                  label="Moving average window"
                  keyboardType="numeric"
                  value={maWindow}
                  onChangeText={setMaWindow}
                  style={{ marginBottom: 10 }}
                />
                <Button
                  mode="outlined"
                  onPress={loadTrend}
                  loading={loadingTrend}
                  disabled={loadingTrend}
                  style={{ marginBottom: 10 }}
                >
                  Refresh
                </Button>
                {trend && (
                  <View style={styles.statsGrid}>
                    <StatCard
                      label="Latest price (raw)"
                      value={String(trend.price)}
                    />
                    {trend.moving_average !== undefined && (
                      <StatCard
                        label={`${trend.window}-round MA`}
                        value={String(trend.moving_average)}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {status?.contracts?.DataTracking && (
              <View style={[styles.card, card]}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, marginBottom: 10 }}
                >
                  On-chain market data
                </Text>
                <TextInput
                  mode="outlined"
                  label="Ticker"
                  value={ticker}
                  onChangeText={(t) => setTicker(t.toUpperCase())}
                  style={{ marginBottom: 10 }}
                />
                <Button
                  mode="outlined"
                  onPress={lookupMarketData}
                  loading={loadingMarketData}
                  disabled={loadingMarketData}
                  style={{ marginBottom: 10 }}
                >
                  Look up
                </Button>

                {marketData && marketData.data.length === 0 && (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    No data recorded for {marketData.ticker} yet.
                  </Text>
                )}

                {marketData && marketData.data.length > 0 && (
                  <DataTable>
                    <DataTable.Header>
                      <DataTable.Title>Time</DataTable.Title>
                      <DataTable.Title numeric>Price</DataTable.Title>
                      <DataTable.Title numeric>Volume</DataTable.Title>
                    </DataTable.Header>
                    {marketData.data.map((point, idx) => (
                      <DataTable.Row key={idx}>
                        <DataTable.Cell>
                          {new Date(
                            point.timestamp * 1000,
                          ).toLocaleDateString()}
                        </DataTable.Cell>
                        <DataTable.Cell numeric>{point.price}</DataTable.Cell>
                        <DataTable.Cell numeric>{point.volume}</DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </DataTable>
                )}

                {isAdmin && (
                  <View style={styles.recordForm}>
                    <Text
                      variant="titleSmall"
                      style={{ color: theme.colors.onSurface, marginBottom: 8 }}
                    >
                      Record a data point (Admin)
                    </Text>
                    <TextInput
                      mode="outlined"
                      label="Ticker"
                      value={recordTicker}
                      onChangeText={(t) => setRecordTicker(t.toUpperCase())}
                      style={{ marginBottom: 10 }}
                    />
                    <TextInput
                      mode="outlined"
                      label="Price"
                      keyboardType="numeric"
                      value={recordPrice}
                      onChangeText={setRecordPrice}
                      style={{ marginBottom: 10 }}
                    />
                    <TextInput
                      mode="outlined"
                      label="Volume"
                      keyboardType="numeric"
                      value={recordVolume}
                      onChangeText={setRecordVolume}
                      style={{ marginBottom: 10 }}
                    />
                    <Button
                      mode="contained"
                      onPress={submitRecord}
                      loading={recording}
                      disabled={
                        recording ||
                        !recordTicker ||
                        !recordPrice ||
                        !recordVolume
                      }
                    >
                      Record on-chain
                    </Button>
                    {!!recordMessage && (
                      <Text
                        style={{ color: statusColors.success, marginTop: 8 }}
                      >
                        {recordMessage}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {status?.contracts?.QuantumVestToken && (
              <View style={[styles.card, card]}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, marginBottom: 10 }}
                >
                  Token balance
                </Text>
                <TextInput
                  mode="outlined"
                  label="Wallet address"
                  value={balanceAddress}
                  onChangeText={setBalanceAddress}
                  autoCapitalize="none"
                  style={{ marginBottom: 10 }}
                />
                <Button
                  mode="outlined"
                  onPress={lookupBalance}
                  loading={loadingBalance}
                  disabled={loadingBalance}
                >
                  Look up
                </Button>
                {balanceResult && (
                  <Text
                    style={{ color: theme.colors.onSurface, marginTop: 10 }}
                  >
                    {parseFloat(balanceResult.balance).toLocaleString()} QVT
                  </Text>
                )}
              </View>
            )}

            {status?.contracts?.QuantumVestOracle && (
              <View style={[styles.card, card]}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, marginBottom: 10 }}
                >
                  Oracle price
                </Text>
                <TextInput
                  mode="outlined"
                  label="Asset address"
                  value={oracleAddress}
                  onChangeText={setOracleAddress}
                  autoCapitalize="none"
                  style={{ marginBottom: 10 }}
                />
                <Button
                  mode="outlined"
                  onPress={lookupOracle}
                  loading={loadingOracle}
                  disabled={loadingOracle}
                >
                  Look up
                </Button>
                {oracleResult && (
                  <Text
                    style={{ color: theme.colors.onSurface, marginTop: 10 }}
                  >
                    {oracleResult.price}
                  </Text>
                )}
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
  contractRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.3)",
  },
});

export default BlockchainScreen;
