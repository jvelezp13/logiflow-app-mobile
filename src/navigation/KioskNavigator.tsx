/**
 * Kiosk Navigator
 *
 * Navigation stack for kiosk mode.
 * Handles PIN login and kiosk home screens.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@/store/authStore';
import { PinLoginScreen } from '@/screens/kiosk/PinLoginScreen';
import { KioskHomeScreen } from '@/screens/kiosk/KioskHomeScreen';
import type { KioskStackParamList } from '@/types/navigation.types';

const Stack = createStackNavigator<KioskStackParamList>();

/**
 * Kiosk Navigator Component
 *
 * Manages kiosk mode flow:
 * - PinLogin: 4-digit PIN entry
 * - KioskHome: Clock in/out screen with auto-logout
 */
export const KioskNavigator: React.FC = () => {
  const isKioskAuthenticated = useAuthStore((state) => state.isKioskAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isKioskAuthenticated ? (
        // PIN Login Screen
        <Stack.Screen
          name="PinLogin"
          component={PinLoginScreen}
          options={{
            gestureEnabled: false, // Prevent swipe back
          }}
        />
      ) : (
        // Kiosk Home Screen (after PIN authentication)
        <Stack.Screen
          name="KioskHome"
          component={KioskHomeScreen}
          options={{
            gestureEnabled: false, // Prevent swipe back
          }}
        />
      )}
    </Stack.Navigator>
  );
};
