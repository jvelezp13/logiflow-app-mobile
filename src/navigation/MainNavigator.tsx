/**
 * Main Navigator
 *
 * Bottom tab navigator for main app screens.
 * Handles safe area insets for devices with notches.
 */

import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MainTabParamList } from '@/types/navigation.types';
import { HomeScreen, HistoryScreen, SettingsScreen } from '@screens/main';
import { NovedadesNavigator } from './NovedadesNavigator';
import useNovedades from '@/hooks/useNovedades';
import { COLORS, LAYOUT } from '@constants/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { estadisticas } = useNovedades();

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
        name="Novedades"
        component={NovedadesNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Novedades',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-alert-outline"
              size={size}
              color={color}
            />
          ),
          tabBarBadge: estadisticas.pendientes > 0 ? estadisticas.pendientes : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#F59E0B',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
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
    </Tab.Navigator>
  );
};
