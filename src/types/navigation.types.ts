/**
 * Navigation Types
 *
 * Type definitions for React Navigation
 */

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { StackScreenProps } from '@react-navigation/stack';

/**
 * Root Stack. SolicitarAjuste y DetalleNovedad viven aquí (sobre Main) para
 * que el back vuelva al tab activo del Main, típicamente History.
 */
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Kiosk: undefined;
  Splash: undefined;
  SolicitarAjuste: {
    marcajeId: number;
    fecha: string;
    tipo: 'clock_in' | 'clock_out';
    horaActual: string;
  };
  DetalleNovedad: { novedadId: string };
};

/**
 * Auth Stack
 */
export type AuthStackParamList = {
  Login: undefined;
};

/**
 * Kiosk Stack
 */
export type KioskStackParamList = {
  PinLogin: undefined;
  KioskHome: undefined;
};

/**
 * Main Bottom Tabs
 */
export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Cierres: undefined;
  Settings: undefined;
};

/**
 * Cierres Stack
 */
export type CierresStackParamList = {
  DetalleCierre: { cierreId: string };
};

/**
 * Screen Props Types
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type KioskStackScreenProps<T extends keyof KioskStackParamList> =
  CompositeScreenProps<
    StackScreenProps<KioskStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type CierresStackScreenProps<T extends keyof CierresStackParamList> =
  CompositeScreenProps<
    StackScreenProps<CierresStackParamList, T>,
    MainTabScreenProps<keyof MainTabParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
