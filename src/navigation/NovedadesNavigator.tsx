/**
 * Novedades Navigator
 *
 * Stack navigator for novedades (exceptions/reports) screens.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { NovedadesStackParamList } from '@/types/navigation.types';
import NovedadesScreen from '@screens/novedades/NovedadesScreen';
import CrearNovedadScreen from '@screens/novedades/CrearNovedadScreen';
import DetalleNovedadScreen from '@screens/novedades/DetalleNovedadScreen';
import { COLORS, LAYOUT } from '@constants/theme';

const Stack = createStackNavigator<NovedadesStackParamList>();

export const NovedadesNavigator: React.FC = () => {
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
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="NovedadesList"
        component={NovedadesScreen}
        options={{
          headerShown: false, // NovedadesScreen tiene su propio header
        }}
      />
      <Stack.Screen
        name="CrearNovedad"
        component={CrearNovedadScreen}
        options={{
          title: 'Reportar Novedad',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="DetalleNovedad"
        component={DetalleNovedadScreen}
        options={{
          title: 'Detalle de Novedad',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};
