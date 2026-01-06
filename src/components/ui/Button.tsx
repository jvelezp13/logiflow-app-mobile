/**
 * Button Component
 *
 * Reusable button with loading and disabled states.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { styles } from './Button.styles';
import { COLORS } from '@constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'clockIn' | 'clockOut';

export type ButtonProps = TouchableOpacityProps & {
  title: string;
  loading?: boolean;
  variant?: ButtonVariant;
  icon?: string; // Emoji icon
};

export const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
  ...touchableProps
}) => {
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'outline' && styles.buttonOutline,
    variant === 'danger' && styles.buttonDanger,
    variant === 'ghost' && styles.buttonGhost,
    variant === 'clockIn' && styles.buttonClockIn,
    variant === 'clockOut' && styles.buttonClockOut,
    isDisabled && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    styles.text,
    variant === 'secondary' && styles.textSecondary,
    variant === 'outline' && styles.textOutline,
    variant === 'danger' && styles.textDanger,
    variant === 'ghost' && styles.textGhost,
    variant === 'clockIn' && styles.textClockIn,
    variant === 'clockOut' && styles.textClockOut,
    isDisabled && styles.textDisabled,
  ];

  // Get loader color based on variant
  const getLoaderColor = () => {
    if (variant === 'outline') return COLORS.primary;
    if (variant === 'danger') return COLORS.textInverse;
    return COLORS.textInverse;
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...touchableProps}
    >
      {loading ? (
        <ActivityIndicator color={getLoaderColor()} />
      ) : (
        <Text style={textStyle}>
          {icon && `${icon} `}
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
