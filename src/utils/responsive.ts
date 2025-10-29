/**
 * Responsive Utilities
 *
 * Provides scaling functions for responsive design that works across all device sizes
 * and accessibility settings (including large text).
 *
 * IMPORTANT: This is the GLOBAL responsive strategy for the entire app.
 * All components should use these utilities for sizing instead of fixed values.
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale size based on screen width
 * Automatically adjusts for different screen sizes
 *
 * @param size - Base size from design
 * @returns Scaled size for current device
 */
export const scaleWidth = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scale);
};

/**
 * Scale size based on screen height
 * Useful for vertical spacing and positioning
 *
 * @param size - Base size from design
 * @returns Scaled size for current device
 */
export const scaleHeight = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(size * scale);
};

/**
 * Moderate scale - scales less aggressively
 * Best for font sizes to prevent text from becoming too large
 *
 * @param size - Base size from design
 * @param factor - Scaling factor (0-1). 0 = no scaling, 1 = full scaling
 * @returns Moderately scaled size
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size + (scale - 1) * size * factor);
};

/**
 * Scale font size with accessibility support
 * Respects user's text size preferences while maintaining readability
 *
 * @param size - Base font size
 * @returns Scaled font size that works with accessibility settings
 */
export const scaleFontSize = (size: number): number => {
  // Use moderate scale for fonts to prevent excessive scaling
  // This ensures text remains readable even with large text settings
  const scaled = moderateScale(size, 0.3);

  // Normalize using PixelRatio to ensure crisp text
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Scale spacing/padding values
 * Uses moderate scaling to maintain proper spacing ratios
 *
 * @param size - Base spacing size
 * @returns Scaled spacing value
 */
export const scaleSpacing = (size: number): number => {
  return moderateScale(size, 0.4);
};

/**
 * Get responsive value based on screen size
 * Useful for conditionally applying different values on different screen sizes
 *
 * @param small - Value for small screens
 * @param medium - Value for medium screens
 * @param large - Value for large screens (tablets)
 * @returns Appropriate value for current screen size
 */
export const getResponsiveValue = <T,>(small: T, medium: T, large: T): T => {
  if (SCREEN_WIDTH < 375) {
    return small;
  } else if (SCREEN_WIDTH < 768) {
    return medium;
  } else {
    return large;
  }
};

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
  return SCREEN_WIDTH >= 768;
};

/**
 * Check if device is small (iPhone SE, etc.)
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Get safe minimum touchable area
 * Following iOS HIG and Material Design guidelines (44pt minimum)
 */
export const getMinTouchableSize = (): number => {
  return Platform.select({
    ios: 44,
    android: 48,
    default: 44,
  });
};

/**
 * Responsive dimensions object
 * Contains scaled values for common use cases
 */
export const responsiveDimensions = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isSmall: isSmallDevice(),
  isTablet: isTablet(),
  minTouchable: getMinTouchableSize(),
};

/**
 * Update dimensions on orientation change
 * Call this in components that need to respond to orientation changes
 */
export const updateDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return {
    width,
    height,
    isSmall: width < 375,
    isTablet: width >= 768,
  };
};
