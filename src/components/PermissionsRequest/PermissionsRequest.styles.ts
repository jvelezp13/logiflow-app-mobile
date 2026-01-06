/**
 * PermissionsRequest Styles
 */

import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },

  content: {
    maxWidth: 400,
    alignItems: 'center',
  },

  icon: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },

  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },

  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },

  note: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  text: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },

  button: {
    width: '100%',
    marginBottom: SPACING.md,
  },

  skipButton: {
    width: '100%',
  },
});
