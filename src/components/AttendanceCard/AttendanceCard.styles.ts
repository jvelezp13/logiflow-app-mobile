/**
 * AttendanceCard Styles - Compact Row
 */

import { StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
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
    minWidth: 60,
    flexShrink: 0,
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
  // Adjustment status badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginLeft: 4,
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextApproved: {
    color: '#065F46',
  },
  statusTextRejected: {
    color: '#991B1B',
  },
  // Admin modification badges
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.sm,
    backgroundColor: '#EDE9FE', // Light purple
  },
  adminBadgeEdited: {
    backgroundColor: '#DBEAFE', // Light blue
  },
  adminText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginLeft: 4,
    color: '#6B21A8', // Purple
  },
  adminTextEdited: {
    color: '#1D4ED8', // Blue
  },
  chevron: {
    marginLeft: SPACING.xs,
  },
});
