/**
 * HomeScreen Styles
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
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  contentContainer: {
    paddingBottom: SPACING.xxl * 2, // Extra space at bottom for last record (96px)
  },
  header: {
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  clockSection: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
    paddingVertical: SPACING.xl,
  },
  clockTime: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    letterSpacing: 2,
  },
  currentDate: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  buttonsContainer: {
    width: '100%',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  clockButton: {
    minHeight: 60,
  },
  clockButtonMain: {
    minHeight: 70,
    width: '100%',
  },
  // Banner de estado prominente
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  statusBannerWorking: {
    backgroundColor: '#DCFCE7', // Verde claro
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  statusBannerIdle: {
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBannerIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  statusBannerIconWorking: {
    // Sin cambios adicionales
  },
  statusBannerIconIdle: {
    // Sin cambios adicionales
  },
  statusBannerTextContainer: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  statusBannerTitleWorking: {
    color: '#166534', // Verde oscuro
  },
  statusBannerTitleIdle: {
    color: COLORS.text,
  },
  statusBannerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Estado jornada completada
  dayCompleteContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  dayCompleteText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  todayRecords: {
    marginTop: SPACING.lg,
  },
  recordsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  recordType: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },
  recordTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  syncBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  syncBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.surface,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  workedHoursContainerTop: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  workedHoursLabelTop: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  workedHoursValueTop: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  workedHoursSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  // Estilos para resumen del dia (jornada completada)
  workedHoursContainerCompleted: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingVertical: SPACING.sm,
  },
  workedHoursLabelCompleted: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  workedHoursValueCompleted: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
});
