// Design tokens shared across the mobile app. Mirrors the web frontend's
// CSS variables (src/styles/App.css) so both apps present the same brand.

export const brand = {
  primary: "#7c6cff",
  primaryStrong: "#6250f0",
  primarySoft: "rgba(124, 108, 255, 0.14)",
  accent: "#22d3ee",
  accentSoft: "rgba(34, 211, 238, 0.14)",
  gradient: ["#7c6cff", "#22d3ee"],
};

export const status = {
  success: "#22c55e",
  successSoft: "rgba(34, 197, 94, 0.14)",
  warning: "#f59e0b",
  warningSoft: "rgba(245, 158, 11, 0.14)",
  danger: "#f43f5e",
  dangerSoft: "rgba(244, 63, 94, 0.14)",
  info: "#38bdf8",
  infoSoft: "rgba(56, 189, 248, 0.14)",
};

export const darkPalette = {
  bg: "#08090f",
  bgElevated: "#0d0f1a",
  surface: "#12141f",
  surfaceAlt: "#191c2b",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  textPrimary: "#f5f6fb",
  textSecondary: "#a6acc4",
  textTertiary: "#6b7191",
};

export const lightPalette = {
  bg: "#f5f6fb",
  bgElevated: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#eef0f9",
  border: "rgba(15, 17, 33, 0.08)",
  borderStrong: "rgba(15, 17, 33, 0.14)",
  textPrimary: "#12131f",
  textSecondary: "#4a4f6a",
  textTertiary: "#7b809c",
};

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, full: 999 };
export const spacing = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 };

export const getPalette = (theme) =>
  theme === "dark" ? darkPalette : lightPalette;

export default {
  brand,
  status,
  darkPalette,
  lightPalette,
  radius,
  spacing,
  getPalette,
};
