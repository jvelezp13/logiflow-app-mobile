/**
 * Main Navigator
 *
 * Bottom tab navigator for main app screens.
 * Handles safe area insets for devices with notches.
 *
 * Note: Novedades navigator is hidden from tab bar but accessible
 * programmatically from History screen for viewing adjustment details.
 */

import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from '@/types/navigation.types';
import { HomeScreen, HistoryScreen, SettingsScreen } from '@screens/main';
import { NovedadesNavigator } from './NovedadesNavigator';
import { COLORS, LAYOUT } from '@constants/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  // Calculate tab bar height with safe area
  const tabBarHeight = LAYOUT.bottomTabHeight + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.primary,
          height: LAYOUT.headerHeight,
        },
        headerTintColor: COLORS.textInverse,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          backgroundColor: COLORS.surface,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Historial',
          tabBarLabel: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Configuración',
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          ),
        }}
      />
      {/* Hidden navigator - accessible from History for adjustment details */}
      <Tab.Screen
        name="Novedades"
        component={NovedadesNavigator}
        options={{
          headerShown: false,
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
};
