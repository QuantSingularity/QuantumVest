import React from "react";
import {
  NavigationContainer,
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import LoadingSpinner from "../components/LoadingSpinner";
import NetworkStatus from "../components/NetworkStatus";

import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";

import AppNavigator from "./AppNavigator";
import PortfolioDetailScreen from "../screens/PortfolioDetailScreen";
import PredictionsScreen from "../screens/PredictionsScreen";
import SettingsScreen from "../screens/SettingsScreen";

import { darkPalette, lightPalette, brand } from "../theme/tokens";

const Stack = createStackNavigator();

const buildNavTheme = (mode) => {
  const base = mode === "dark" ? NavDarkTheme : NavDefaultTheme;
  const palette = mode === "dark" ? darkPalette : lightPalette;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: brand.primary,
      background: palette.bg,
      card: palette.bgElevated,
      text: palette.textPrimary,
      border: palette.border,
    },
  };
};

const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useApp();

  if (loading) {
    return <LoadingSpinner message="Loading QuantumVest..." />;
  }

  return (
    <NavigationContainer theme={buildNavTheme(theme)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Group>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={AppNavigator} />
            <Stack.Screen
              name="PortfolioDetail"
              component={PortfolioDetailScreen}
            />
            <Stack.Screen name="Predictions" component={PredictionsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
      <NetworkStatus />
    </NavigationContainer>
  );
};

export default RootNavigator;
