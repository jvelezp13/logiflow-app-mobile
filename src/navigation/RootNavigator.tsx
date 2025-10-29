/**
 * Root Navigator
 *
 * Top-level navigator that switches between Auth, Main, and Kiosk based on auth state.
 * Shows splash screen during initialization.
 * Requests location permissions after authentication.
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation.types';
import { useAuthStore } from '@store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { KioskNavigator } from './KioskNavigator';
import { PermissionsRequest } from '@components/PermissionsRequest';
import { COLORS } from '@constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const kioskMode = useAuthStore((state) => state.kioskMode);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  // Reset permissions request flag when user logs out or kiosk mode changes
  useEffect(() => {
    if (!isAuthenticated && !kioskMode) {
      setPermissionsRequested(false);
    }
  }, [isAuthenticated, kioskMode]);

  // Show loading screen while initializing auth state
  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // If authenticated (normal mode) but permissions not requested yet, show permission screen
  if (isAuthenticated && !kioskMode && !permissionsRequested) {
    return (
      <PermissionsRequest
        onPermissionsGranted={() => {
          console.log('[RootNavigator] Permissions granted, showing main app');
          setPermissionsRequested(true);
        }}
      />
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {kioskMode ? (
        // Kiosk mode - PIN-based authentication
        <Stack.Screen name="Kiosk" component={KioskNavigator} />
      ) : isAuthenticated ? (
        // Normal mode - authenticated user
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        // Normal mode - not authenticated
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
