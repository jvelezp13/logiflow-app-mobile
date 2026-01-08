/**
 * SpecialHoursWarningModal Component
 *
 * Shows a warning when employee is about to clock in/out during special hours:
 * - Extra hours: Working more than max_horas_dia
 * - Nocturnal hours: Working in 19:00-06:00 range
 *
 * This modal is informational only - it does NOT block the attendance marking.
 */

import React, { memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@constants/theme';

export type WarningType = 'extra' | 'nocturna' | 'ambas';

export type SpecialHoursWarningModalProps = {
  visible: boolean;
  type: WarningType;
  horasExtra?: number;
  isEntry?: boolean; // true for clock-in, false for clock-out
  onConfirm: () => void;
};

const SpecialHoursWarningModalComponent: React.FC<SpecialHoursWarningModalProps> = ({
  visible,
  type,
  horasExtra = 0,
  isEntry = false,
  onConfirm,
}) => {
  const getTitle = () => {
    if (type === 'ambas') return 'Horas Extra y Nocturnas';
    if (type === 'extra') return 'Horas Extra Detectadas';
    return 'Horario Nocturno';
  };

  const getIcon = () => {
    if (type === 'nocturna') return 'weather-night';
    return 'clock-alert-outline';
  };

  const getIconColor = () => {
    if (type === 'nocturna') return '#6366F1'; // Indigo for night
    return '#F59E0B'; // Amber for extra hours
  };

  const getMessage = () => {
    const messages: string[] = [];

    if (type === 'extra' || type === 'ambas') {
      const horasExtraFormatted = horasExtra.toFixed(1);
      messages.push(
        `Al marcar salida, tendrás aproximadamente ${horasExtraFormatted} horas extra que exceden tu jornada diaria permitida.`
      );
    }

    if (type === 'nocturna' || type === 'ambas') {
      if (isEntry) {
        messages.push(
          'Estás marcando entrada durante horario nocturno (19:00 - 06:00). Este trabajo requiere autorización especial.'
        );
      } else {
        messages.push(
          'Parte de tu jornada fue en horario nocturno (19:00 - 06:00). Estas horas requieren autorización especial.'
        );
      }
    }

    return messages.join('\n\n');
  };

  const getSubtext = () => {
    return 'Tu marcaje se registrará normalmente. El administrador revisará y aprobará las horas especiales.';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
            <MaterialCommunityIcons
              name={getIcon()}
              size={40}
              color={getIconColor()}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{getTitle()}</Text>

          {/* Message */}
          <Text style={styles.message}>{getMessage()}</Text>

          {/* Subtext */}
          <Text style={styles.subtext}>{getSubtext()}</Text>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  subtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SPACING.lg,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
  },
});

export const SpecialHoursWarningModal = memo(SpecialHoursWarningModalComponent);
