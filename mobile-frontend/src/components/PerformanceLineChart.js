import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "react-native-paper";
import EmptyState from "./EmptyState";
import { status } from "../theme/tokens";

const screenWidth = Dimensions.get("window").width;

// Renders a portfolio value history line chart, or an empty state when the
// backend has no PortfolioPerformance snapshots yet.
const PerformanceLineChart = ({ dates = [], values = [], height = 220 }) => {
  const theme = useTheme();

  if (!values || values.length < 2) {
    return (
      <EmptyState
        icon="chart-line"
        title="No performance history yet"
        message="Daily value snapshots will appear here after a few days of tracking."
        iconSize={40}
      />
    );
  }

  const positive = values[values.length - 1] >= values[0];
  const lineColor = positive ? status.success : status.danger;

  // Chart-kit renders every label, so thin them out on longer series.
  const labelStep = Math.max(1, Math.ceil(dates.length / 5));
  const labels = dates.map((d, i) =>
    i % labelStep === 0
      ? new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "",
  );

  return (
    <View style={styles.wrapper}>
      <LineChart
        data={{ labels, datasets: [{ data: values }] }}
        width={screenWidth - 64}
        height={height}
        yAxisLabel="$"
        yAxisInterval={1}
        withInnerLines={false}
        withOuterLines={false}
        bezier
        chartConfig={{
          backgroundGradientFrom: theme.colors.surface,
          backgroundGradientTo: theme.colors.surface,
          decimalPlaces: 0,
          color: () => lineColor,
          labelColor: () => theme.colors.onSurfaceVariant,
          propsForDots: { r: "0" },
          propsForBackgroundLines: { stroke: theme.colors.outline },
        }}
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  chart: { borderRadius: 16 },
});

export default PerformanceLineChart;
