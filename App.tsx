/**
 * App Entry Point
 *
 * Main application component with navigation and auth initialization.
 * IMPORTANT: Light mode is FORCED globally - dark mode is disabled.
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { SyncProvider } from './src/components/SyncProvider';
import { COLORS } from './src/constants/theme';

/**
 * Custom Navigation Theme - LIGHT MODE ONLY
 * This ensures the navigation container always uses light theme
 */
const AppTheme = {
  ...DefaultTheme,
  dark: false, // Force light mode
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize auth state on app mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <SafeAreaProvider>
      {/* Force light theme in NavigationContainer */}
      <NavigationContainer theme={AppTheme}>
        <SyncProvider>
          {/* StatusBar: "dark" = dark icons (for light backgrounds) */}
          <StatusBar style="dark" backgroundColor={COLORS.background} />
          <RootNavigator />
        </SyncProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
