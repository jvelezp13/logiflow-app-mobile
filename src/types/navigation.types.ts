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
 * Root Stack (Auth + Main + Kiosk)
 */
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Kiosk: undefined;
  Splash: undefined;
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
  Novedades: undefined;
  Settings: undefined;
};

/**
 * Novedades Stack
 */
export type NovedadesStackParamList = {
  NovedadesList: undefined;
  CrearNovedad: undefined;
  DetalleNovedad: { novedadId: string };
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

export type NovedadesStackScreenProps<T extends keyof NovedadesStackParamList> =
  CompositeScreenProps<
    StackScreenProps<NovedadesStackParamList, T>,
    MainTabScreenProps<keyof MainTabParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
