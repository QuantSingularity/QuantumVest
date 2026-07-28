import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { status as statusColors } from "../theme/tokens";

// tone: "up" | "down" | "neutral" | undefined
const StatCard = ({ label, value, hint, tone }) => {
  const theme = useTheme();
  const valueColor =
    tone === "up"
      ? statusColors.success
      : tone === "down"
        ? statusColors.danger
        : theme.colors.onSurface;

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
      <Text
        variant="labelMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>
      <Text
        variant="headlineSmall"
        style={[styles.value, { color: valueColor }]}
      >
        {value}
      </Text>
      {!!hint && (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "45%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  value: { fontWeight: "700" },
});

export default StatCard;
