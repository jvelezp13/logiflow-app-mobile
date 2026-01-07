/**
 * Theme Constants
 *
 * Centralized theme configuration for consistent styling.
 * All colors, spacing, typography, etc. defined here.
 *
 * RESPONSIVE STRATEGY:
 * - Uses responsive scaling utilities for all sizing values
 * - Automatically adjusts to different screen sizes (phones, tablets)
 * - Supports accessibility settings (large text, etc.)
 * - ALWAYS LIGHT MODE - Dark mode is disabled app-wide
 */

import {
  scaleFontSize,
  scaleSpacing,
  moderateScale,
  responsiveDimensions,
  getMinTouchableSize,
} from '@/utils/responsive';

/**
 * COLORS - Fixed values that don't need responsive scaling
 * ALWAYS LIGHT MODE ONLY - Dark theme colors not needed
 */
export const COLORS = {
  // Primary colors
  primary: '#2563eb', // Blue
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',

  // Secondary colors
  secondary: '#10b981', // Green
  secondaryDark: '#059669',
  secondaryLight: '#34d399',

  // Status colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Neutral colors (LIGHT MODE ONLY)
  background: '#ffffff',
  backgroundSecondary: '#f9fafb',
  surface: '#ffffff',
  surfaceSecondary: '#f3f4f6',

  // Text colors (LIGHT MODE ONLY)
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',

  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  borderDark: '#d1d5db',

  // Attendance specific
  clockIn: '#10b981', // Green for clock in
  clockOut: '#ef4444', // Red for clock out

  // Sync status
  synced: '#10b981',
  pending: '#f59e0b',
  syncing: '#3b82f6',
  syncError: '#ef4444',
} as const;

/**
 * SPACING - Responsive values that scale with screen size
 * Uses scaleSpacing for consistent spacing across all devices
 */
export const SPACING = {
  xs: scaleSpacing(4),
  sm: scaleSpacing(8),
  md: scaleSpacing(16),
  lg: scaleSpacing(24),
  xl: scaleSpacing(32),
  xxl: scaleSpacing(48),
} as const;

/**
 * BORDER_RADIUS - Moderately scaled for visual consistency
 */
export const BORDER_RADIUS = {
  sm: moderateScale(4, 0.2),
  md: moderateScale(8, 0.2),
  lg: moderateScale(12, 0.2),
  xl: moderateScale(16, 0.2),
  full: 9999,
} as const;

/**
 * FONT_SIZES - Responsive and accessibility-aware
 * Uses scaleFontSize which respects system text size settings
 */
export const FONT_SIZES = {
  xs: scaleFontSize(12),
  sm: scaleFontSize(14),
  base: scaleFontSize(16), // Alias for md
  md: scaleFontSize(16),
  lg: scaleFontSize(18),
  xl: scaleFontSize(20),
  '2xl': scaleFontSize(24), // Alias for xxl
  xxl: scaleFontSize(24),
  xxxl: scaleFontSize(32),
} as const;

/**
 * FONT_WEIGHTS - Fixed values (don't need scaling)
 */
export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/**
 * SHADOWS - Scaled for consistent appearance across devices
 */
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(2, 0.2),
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(2, 0.2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4, 0.2),
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(4, 0.2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(8, 0.2),
    elevation: 5,
  },
} as const;

/**
 * LAYOUT - Responsive layout constants
 * Scales with screen size and respects minimum touch targets
 */
export const LAYOUT = {
  screenPadding: SPACING.md,
  maxWidth: 600, // For tablets (fixed)
  headerHeight: Math.max(90, moderateScale(90, 0.3)),
  bottomTabHeight: Math.max(getMinTouchableSize(), moderateScale(56, 0.3)),
  minTouchableSize: getMinTouchableSize(), // Platform-specific minimum
  // Screen dimensions (useful for calculations)
  screenWidth: responsiveDimensions.screenWidth,
  screenHeight: responsiveDimensions.screenHeight,
  isTablet: responsiveDimensions.isTablet,
  isSmall: responsiveDimensions.isSmall,
} as const;
