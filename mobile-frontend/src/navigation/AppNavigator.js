import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "react-native-paper";
import DashboardScreen from "../screens/DashboardScreen";
import PortfoliosScreen from "../screens/PortfoliosScreen";
import WatchlistScreen from "../screens/WatchlistScreen";
import RiskAnalyticsScreen from "../screens/RiskAnalyticsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { brand } from "../theme/tokens";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: "view-dashboard-outline",
  Portfolios: "briefcase-outline",
  Watchlist: "star-outline",
  Risk: "chart-bell-curve",
  Profile: "account-outline",
};

const AppNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        tabBarIcon: ({ color, size }) => (
          <Icon name={ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Portfolios" component={PortfoliosScreen} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen} />
      <Tab.Screen
        name="Risk"
        component={RiskAnalyticsScreen}
        options={{ tabBarLabel: "Risk" }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
