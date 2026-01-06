/**
 * HistoryScreen Styles
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: COLORS.textInverse,
  },
  content: {
    flex: 1,
  },
  list: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sectionHeaderText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
