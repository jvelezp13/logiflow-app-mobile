/**
 * StatsSection Styles
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
  container: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 0,
    ...SHADOWS.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  valueSuccess: {
    color: COLORS.success,
  },
  valueWarning: {
    color: COLORS.warning,
  },
  valueError: {
    color: COLORS.error,
  },
  refreshButton: {
    marginTop: SPACING.xs,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  networkIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    ...SHADOWS.sm,
  },
  networkOnline: {
    backgroundColor: COLORS.success,
  },
  networkOffline: {
    backgroundColor: COLORS.error,
  },
});
