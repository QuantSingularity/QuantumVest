export default ({ config }) => {
  return {
    ...config,
    name: "QuantumVestMobile",
    slug: "QuantumVestMobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#08090f",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.quantumvest.mobile",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#08090f",
      },
      package: "com.quantumvest.mobile",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000/api/v1",
      appEnv: process.env.APP_ENV || "development",
    },
  };
};
