import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  Appbar,
  Button,
  Chip,
  Dialog,
  FAB,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { portfolioAPI } from "../services/api";
import {
  formatCurrency,
  formatPercentage,
  handleApiError,
} from "../utils/errorHandler";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

const PortfoliosScreen = ({ navigation }) => {
  const theme = useTheme();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [dialogVisible, setDialogVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await portfolioAPI.list();
      if (data.success) setPortfolios(data.portfolios);
    } catch (err) {
      setError(handleApiError(err, "Couldn't load your portfolios."));
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

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await portfolioAPI.create({
        name: name.trim(),
        description,
        currency: "USD",
      });
      if (data.success) {
        setDialogVisible(false);
        setName("");
        setDescription("");
        load();
      } else {
        Alert.alert("Error", data.error || "Could not create portfolio");
      }
    } catch (err) {
      Alert.alert("Error", handleApiError(err, "Could not create portfolio."));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (portfolio) => {
    Alert.alert(
      "Delete portfolio",
      `Delete "${portfolio.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await portfolioAPI.remove(portfolio.id);
              setPortfolios((prev) =>
                prev.filter((p) => p.id !== portfolio.id),
              );
            } catch (err) {
              Alert.alert(
                "Error",
                handleApiError(err, "Could not delete portfolio."),
              );
            }
          },
        },
      ],
    );
  };

  if (loading) return <LoadingSpinner message="Loading portfolios..." />;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.Content title="Portfolios" />
      </Appbar.Header>

      {!!error && (
        <Text style={{ color: theme.colors.error, padding: 16 }}>{error}</Text>
      )}

      {portfolios.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="No portfolios yet"
          message="Create your first portfolio to start tracking holdings."
          actionLabel="Create Portfolio"
          onAction={() => setDialogVisible(true)}
        />
      ) : (
        <FlatList
          data={portfolios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          }
          renderItem={({ item }) => {
            const returnPct =
              item.invested_amount > 0
                ? (item.unrealized_pnl / item.invested_amount) * 100
                : 0;
            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <View
                  style={{ flex: 1 }}
                  onTouchEnd={() =>
                    navigation.navigate("PortfolioDetail", {
                      id: item.id,
                      name: item.name,
                    })
                  }
                >
                  <View style={styles.cardHeader}>
                    <Text
                      variant="titleMedium"
                      style={{ color: theme.colors.onSurface }}
                    >
                      {item.name}
                    </Text>
                    {item.is_default && <Chip compact>Default</Chip>}
                  </View>
                  <Text
                    variant="headlineSmall"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "700",
                      marginVertical: 4,
                    }}
                  >
                    {formatCurrency(item.total_value, item.currency)}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text
                      style={{
                        color: returnPct >= 0 ? "#22c55e" : "#f43f5e",
                        fontWeight: "600",
                      }}
                    >
                      {formatPercentage(returnPct)}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.holdings_count} holding
                      {item.holdings_count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <Button
                  compact
                  textColor={theme.colors.error}
                  onPress={() => handleDelete(item)}
                >
                  Delete
                </Button>
              </View>
            );
          }}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
      />

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title>New Portfolio</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              mode="outlined"
              label="Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              mode="outlined"
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleCreate}
              loading={creating}
              disabled={creating}
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  fab: { position: "absolute", right: 20, bottom: 20 },
});

export default PortfoliosScreen;
