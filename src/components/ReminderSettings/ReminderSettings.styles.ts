/**
 * ReminderSettings Styles
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
  reminderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 0,
    ...SHADOWS.md,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  reminderTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  reminderContent: {
    gap: SPACING.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    ...SHADOWS.sm,
  },
  timeText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  testButton: {
    marginTop: SPACING.xs,
  },
  permissionAlert: {
    backgroundColor: COLORS.warning + '15',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.warning + '40',
    ...SHADOWS.sm,
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.md,
    lineHeight: FONT_SIZES.md * 1.5,
  },
  permissionButton: {
    alignSelf: 'flex-start',
  },
});
