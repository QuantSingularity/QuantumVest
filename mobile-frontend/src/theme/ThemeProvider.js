import React, { useMemo } from "react";
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
} from "react-native-paper";
import { useApp } from "../context/AppContext";
import { brand, status, darkPalette, lightPalette } from "./tokens";

const lightTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    primaryContainer: brand.primarySoft,
    secondary: brand.accent,
    secondaryContainer: brand.accentSoft,
    background: lightPalette.bg,
    surface: lightPalette.surface,
    surfaceVariant: lightPalette.surfaceAlt,
    outline: lightPalette.borderStrong,
    error: status.danger,
    onPrimary: "#0a0b14",
    onSecondary: "#0a0b14",
    onBackground: lightPalette.textPrimary,
    onSurface: lightPalette.textPrimary,
    onSurfaceVariant: lightPalette.textSecondary,
    onSurfaceDisabled: lightPalette.textTertiary,
    onError: "#ffffff",
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.primary,
    primaryContainer: "#2a2456",
    secondary: brand.accent,
    secondaryContainer: "#0e3a42",
    background: darkPalette.bg,
    surface: darkPalette.surface,
    surfaceVariant: darkPalette.surfaceAlt,
    outline: darkPalette.borderStrong,
    error: status.danger,
    onPrimary: "#0a0b14",
    onSecondary: "#0a0b14",
    onBackground: darkPalette.textPrimary,
    onSurface: darkPalette.textPrimary,
    onSurfaceVariant: darkPalette.textSecondary,
    onSurfaceDisabled: darkPalette.textTertiary,
    onError: "#0a0b14",
  },
};

export const ThemeProvider = ({ children }) => {
  const { theme: appTheme } = useApp();

  const theme = useMemo(
    () => (appTheme === "dark" ? darkTheme : lightTheme),
    [appTheme],
  );

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
};

export { lightTheme, darkTheme };
