import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Chip,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { assetAPI } from "../services/api";
import { debounce } from "../utils/errorHandler";

const AssetSearchInput = ({
  onSelect,
  placeholder = "Search by symbol or name…",
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const search = debounce(async (q) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await assetAPI.search(q.trim());
        if (data.success) setResults(data.assets || []);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    search(query);
  }, [query]);

  const handleSelect = (asset) => {
    onSelect(asset);
    setQuery("");
    setResults([]);
  };

  return (
    <View>
      <TextInput
        mode="outlined"
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
        left={<TextInput.Icon icon="magnify" />}
        right={
          loading ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={16} />} />
          ) : null
        }
      />
      {results.length > 0 && (
        <View
          style={[
            styles.results,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          {results.map((asset) => (
            <Chip
              key={asset.id}
              icon="chart-line"
              onPress={() => handleSelect(asset)}
              style={styles.chip}
            >
              {asset.symbol} · {asset.name}
            </Chip>
          ))}
        </View>
      )}
      {!loading && query.trim().length > 0 && results.length === 0 && (
        <Text
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 6,
            fontSize: 12,
          }}
        >
          No assets found for &quot;{query}&quot;.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  results: {
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  chip: { alignSelf: "flex-start" },
});

export default AssetSearchInput;
