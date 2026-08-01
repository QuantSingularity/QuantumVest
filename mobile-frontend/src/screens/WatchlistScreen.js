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
import { watchlistAPI } from "../services/api";
import { handleApiError } from "../utils/errorHandler";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import AssetSearchInput from "../components/AssetSearchInput";

const WatchlistScreen = () => {
  const theme = useTheme();
  const [watchlists, setWatchlists] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadList = useCallback(async (isRefresh = false, selectId) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await watchlistAPI.list();
      if (data.success) {
        setWatchlists(data.watchlists);
        setActiveId(selectId || data.watchlists[0]?.id || null);
      }
    } catch (err) {
      setError(handleApiError(err, "Couldn't load your watchlists."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadDetail = useCallback(async (watchlistId) => {
    if (!watchlistId) {
      setActiveDetail(null);
      return;
    }
    try {
      const { data } = await watchlistAPI.get(watchlistId);
      if (data.success) setActiveDetail(data.watchlist);
    } catch (err) {
      Alert.alert(
        "Error",
        handleApiError(err, "Couldn't load this watchlist."),
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList]),
  );
  useFocusEffect(
    useCallback(() => {
      loadDetail(activeId);
    }, [activeId, loadDetail]),
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await watchlistAPI.create({ name: newName.trim() });
      if (data.success) {
        setCreateVisible(false);
        setNewName("");
        loadList(false, data.watchlist.id);
      }
    } catch (err) {
      Alert.alert("Error", handleApiError(err, "Could not create watchlist."));
    } finally {
      setCreating(false);
    }
  };

  const handleAddAsset = async (asset) => {
    try {
      const { data } = await watchlistAPI.addItem(activeId, {
        asset_symbol: asset.symbol,
      });
      if (data.success) {
        loadDetail(activeId);
        loadList(false, activeId);
      } else {
        Alert.alert("Error", data.error || "Could not add asset");
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        Alert.alert(
          "Already added",
          `${asset.symbol} is already in this watchlist.`,
        );
      } else {
        Alert.alert("Error", handleApiError(err, "Could not add asset."));
      }
    }
  };

  const handleRemoveItem = async (item) => {
    try {
      await watchlistAPI.removeItem(activeId, item.id);
      loadDetail(activeId);
      loadList(false, activeId);
    } catch (err) {
      Alert.alert("Error", handleApiError(err, "Could not remove asset."));
    }
  };

  if (loading) return <LoadingSpinner message="Loading watchlists..." />;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header>
        <Appbar.Content title="Watchlist" />
      </Appbar.Header>

      {!!error && (
        <Text style={{ color: theme.colors.error, padding: 16 }}>{error}</Text>
      )}

      {watchlists.length === 0 ? (
        <EmptyState
          icon="star-outline"
          title="No watchlists yet"
          message="Create a watchlist to start tracking assets."
          actionLabel="Create Watchlist"
          onAction={() => setCreateVisible(true)}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            horizontal
            data={watchlists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tabRow}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Chip
                selected={item.id === activeId}
                onPress={() => setActiveId(item.id)}
                style={styles.tabChip}
              >
                {item.name} ({item.items_count})
              </Chip>
            )}
          />

          <FlatList
            data={activeDetail?.items || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadList(true, activeId)}
              />
            }
            ListHeaderComponent={
              <AssetSearchInput
                onSelect={handleAddAsset}
                placeholder="Add an asset (e.g. AAPL, BTC)…"
              />
            }
            ListEmptyComponent={
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                  marginTop: 24,
                }}
              >
                No assets yet - search above to add one.
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: theme.colors.onSurface, fontWeight: "700" }}
                  >
                    {item.asset?.symbol}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      fontSize: 12,
                    }}
                  >
                    {item.asset?.name}
                  </Text>
                </View>
                <Button compact onPress={() => handleRemoveItem(item)}>
                  Remove
                </Button>
              </View>
            )}
          />
        </View>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setCreateVisible(true)}
      />

      <Portal>
        <Dialog
          visible={createVisible}
          onDismiss={() => setCreateVisible(false)}
        >
          <Dialog.Title>New Watchlist</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Name"
              value={newName}
              onChangeText={setNewName}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateVisible(false)}>Cancel</Button>
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
  tabRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tabChip: { marginRight: 8 },
  list: { padding: 16, gap: 10 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  fab: { position: "absolute", right: 20, bottom: 20 },
});

export default WatchlistScreen;
