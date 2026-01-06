/**
 * AttendanceCard Styles - Compact Row
 */

import { StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
} from '@constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  icon: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.sm,
  },
  type: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
    flex: 1,
  },
  time: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  syncIcon: {
    fontSize: FONT_SIZES.md,
    marginLeft: SPACING.sm,
  },
});
