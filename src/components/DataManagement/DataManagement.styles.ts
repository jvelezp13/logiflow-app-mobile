/**
 * DataManagement Styles
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
  warningCard: {
    backgroundColor: COLORS.warning + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.warning + '40',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  warningText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.md * 1.5,
  },
  warningBold: {
    fontWeight: FONT_WEIGHTS.bold,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
});
