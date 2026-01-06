/**
 * Button Component Styles
 */

import { StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@constants/theme';

export const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...SHADOWS.md,
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
    ...SHADOWS.md,
  },
  buttonOutline: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  buttonDanger: {
    backgroundColor: COLORS.error,
    ...SHADOWS.md,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonClockIn: {
    backgroundColor: COLORS.clockIn,
    ...SHADOWS.md,
  },
  buttonClockOut: {
    backgroundColor: COLORS.clockOut,
    ...SHADOWS.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.borderLight,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  textSecondary: {
    color: COLORS.textInverse,
  },
  textOutline: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  textDanger: {
    color: COLORS.textInverse,
  },
  textGhost: {
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  textClockIn: {
    color: COLORS.textInverse,
  },
  textClockOut: {
    color: COLORS.textInverse,
  },
  textDisabled: {
    color: COLORS.textSecondary,
  },
});
