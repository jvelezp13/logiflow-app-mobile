/**
 * Single source of truth for the app version label shown in Login/PinLogin/Settings.
 * Lee de expo-constants → app.json `version` (mismo dato que el versionName del APK).
 */

import React from 'react';
import { Text, StyleSheet, type TextStyle } from 'react-native';
import Constants from 'expo-constants';
import { COLORS, FONT_SIZES } from '@constants/theme';

type Props = {
  /** Sin prefix: "v{X}". Con prefix: "{prefix} v{X}". */
  prefix?: string;
  style?: TextStyle;
};

export const AppVersionText: React.FC<Props> = ({ prefix, style }) => {
  const version = Constants.expoConfig?.version ?? '?';
  const label = prefix ? `${prefix} v${version}` : `v${version}`;
  return <Text style={[styles.text, style]}>{label}</Text>;
};

const styles = StyleSheet.create({
  text: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
