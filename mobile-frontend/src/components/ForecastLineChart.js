import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "react-native-paper";
import { brand } from "../theme/tokens";

const screenWidth = Dimensions.get("window").width;

const ForecastLineChart = ({
  lastDate,
  lastPrice,
  forecast = [],
  height = 220,
}) => {
  const theme = useTheme();

  if (!forecast.length) return null;

  const dates = [lastDate, ...forecast.map((f) => f.date)];
  const step = Math.max(1, Math.ceil(dates.length / 5));
  const labels = dates.map((d, i) =>
    i % step === 0
      ? new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "",
  );

  return (
    <View style={styles.wrapper}>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: [lastPrice, ...forecast.map((f) => f.upper)],
              color: () => "rgba(124, 108, 255, 0.35)",
              strokeWidth: 1,
            },
            {
              data: [lastPrice, ...forecast.map((f) => f.predicted_price)],
              color: () => brand.primary,
              strokeWidth: 2,
            },
            {
              data: [lastPrice, ...forecast.map((f) => f.lower)],
              color: () => "rgba(124, 108, 255, 0.35)",
              strokeWidth: 1,
            },
          ],
        }}
        width={screenWidth - 64}
        height={height}
        withInnerLines={false}
        withOuterLines={false}
        withDots={false}
        bezier
        chartConfig={{
          backgroundGradientFrom: theme.colors.surface,
          backgroundGradientTo: theme.colors.surface,
          decimalPlaces: 2,
          color: () => brand.primary,
          labelColor: () => theme.colors.onSurfaceVariant,
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

export default ForecastLineChart;
