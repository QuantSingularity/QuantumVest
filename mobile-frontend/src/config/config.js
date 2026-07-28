import Constants from "expo-constants";

// Get configuration from app.config.js extra field
const extra = Constants.expoConfig?.extra || {};

export const Config = {
  API_BASE_URL: extra.apiBaseUrl || "http://localhost:5000/api/v1",
  APP_ENV: extra.appEnv || "development",

  // Helper methods
  isProduction: () => extra.appEnv === "production",
  isDevelopment: () => extra.appEnv === "development",
};

export default Config;
