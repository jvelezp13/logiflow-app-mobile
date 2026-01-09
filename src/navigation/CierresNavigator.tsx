/**
 * Cierres Navigator
 *
 * Stack navigator for weekly closure screens.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { CierresStackParamList } from '@/types/navigation.types';
import DetalleCierreScreen from '@screens/cierres/DetalleCierreScreen';
import { COLORS, LAYOUT } from '@constants/theme';

const Stack = createStackNavigator<CierresStackParamList>();

export const CierresNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
          height: LAYOUT.headerHeight,
        },
        headerTintColor: COLORS.textInverse,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="DetalleCierre"
        component={DetalleCierreScreen}
        options={{
          title: 'Detalle del Cierre',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default CierresNavigator;
