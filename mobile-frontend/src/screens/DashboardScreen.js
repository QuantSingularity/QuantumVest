import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { portfolioAPI, watchlistAPI } from "../services/api";
import { getAssetMap } from "../utils/assetCache";
import {
  formatCurrency,
  formatPercentage,
  handleApiError,
} from "../utils/errorHandler";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import PerformanceLineChart from "../components/PerformanceLineChart";

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolios, setPortfolios] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [featuredPerf, setFeaturedPerf] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [portfoliosRes, watchlistsRes] = await Promise.all([
        portfolioAPI.list(),
        watchlistAPI.list(),
      ]);
      const portfolioList = portfoliosRes.data.success
        ? portfoliosRes.data.portfolios
        : [];
      const watchlistList = watchlistsRes.data.success
        ? watchlistsRes.data.watchlists
        : [];
      setPortfolios(portfolioList);
      setWatchlists(watchlistList);

      if (portfolioList.length > 0) {
        const featured = [...portfolioList].sort(
          (a, b) => (b.total_value || 0) - (a.total_value || 0),
        )[0];
        const [perfRes, ...txResults] = await Promise.all([
          portfolioAPI.getPerformance(featured.id, 90),
          ...portfolioList
            .slice(0, 5)
            .map((p) => portfolioAPI.getTransactions(p.id, 1, 5)),
        ]);
        if (perfRes.data.success)
          setFeaturedPerf({ ...perfRes.data.performance, name: featured.name });

        const assetMap = await getAssetMap();
        const allTx = txResults
          .flatMap((res, idx) =>
            res.data.success
              ? res.data.transactions.map((t) => ({
                  ...t,
                  portfolioName: portfolioList[idx].name,
                }))
              : [],
          )
          .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))
          .slice(0, 6)
          .map((t) => ({ ...t, asset: assetMap[t.asset_id] }));
        setRecentTx(allTx);
      } else {
        setFeaturedPerf(null);
        setRecentTx([]);
      }
    } catch (err) {
      setError(handleApiError(err, "Couldn't load your dashboard right now."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totals = useMemo(() => {
    const totalValue = portfolios.reduce(
      (sum, p) => sum + (p.total_value || 0),
      0,
    );
    const invested = portfolios.reduce(
      (sum, p) => sum + (p.invested_amount || 0),
      0,
    );
    const unrealizedPnl = portfolios.reduce(
      (sum, p) => sum + (p.unrealized_pnl || 0),
      0,
    );
    const holdingsCount = portfolios.reduce(
      (sum, p) => sum + (p.holdings_count || 0),
      0,
    );
    const returnPct = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;
    return { totalValue, unrealizedPnl, holdingsCount, returnPct };
  }, [portfolios]);

  const watchlistItemCount = watchlists.reduce(
    (sum, w) => sum + (w.items_count || 0),
    0,
  );

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.Content
          title={`Hi, ${user?.first_name || user?.username || "there"}`}
          subtitle="Here's your overview"
        />
        <Appbar.Action
          icon="cog-outline"
          onPress={() => navigation.navigate("Settings")}
        />
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
        {!!error && (
          <Text style={{ color: theme.colors.error, marginBottom: 12 }}>
            {error}
          </Text>
        )}

        {portfolios.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="Create your first portfolio"
            message="Track holdings, run risk analytics, and get AI-optimized allocations."
            actionLabel="Create Portfolio"
            onAction={() => navigation.navigate("Portfolios")}
          />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Value"
                value={formatCurrency(totals.totalValue)}
                hint={`${formatPercentage(totals.returnPct)} all-time`}
                tone={totals.returnPct >= 0 ? "up" : "down"}
              />
              <StatCard
                label="Unrealized P&L"
                value={formatCurrency(totals.unrealizedPnl)}
                tone={totals.unrealizedPnl >= 0 ? "up" : "down"}
              />
              <StatCard
                label="Holdings"
                value={String(totals.holdingsCount)}
                hint={`${portfolios.length} portfolio(s)`}
              />
              <StatCard
                label="Watchlist"
                value={String(watchlistItemCount)}
                hint="Assets tracked"
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
                {featuredPerf?.name || "Portfolio"} performance
              </Text>
              <PerformanceLineChart
                dates={featuredPerf?.dates || []}
                values={featuredPerf?.values || []}
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
                Recent activity
              </Text>
              {recentTx.length === 0 ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  No transactions yet.
                </Text>
              ) : (
                recentTx.map((tx) => (
                  <View
                    key={tx.id}
                    style={[
                      styles.txRow,
                      { borderBottomColor: theme.colors.outline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "600",
                        }}
                      >
                        {tx.transaction_type.toUpperCase()} ·{" "}
                        {tx.asset?.symbol || "Asset"}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          fontSize: 12,
                        }}
                      >
                        {tx.portfolioName} ·{" "}
                        {new Date(tx.executed_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(tx.total_amount)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <Button
              mode="contained"
              onPress={() => navigation.navigate("Risk")}
              style={styles.cta}
            >
              Run Risk Analysis
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cta: { borderRadius: 12, marginTop: 4 },
});

export default DashboardScreen;
