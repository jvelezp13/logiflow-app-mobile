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

export type WarningType = 'tope_diario' | 'nocturna' | 'ambas';

export type SpecialHoursWarningModalProps = {
  visible: boolean;
  type: WarningType;
  isEntry?: boolean;
  onConfirm: () => void;
};

const SpecialHoursWarningModalComponent: React.FC<SpecialHoursWarningModalProps> = ({
  visible,
  type,
  isEntry = false,
  onConfirm,
}) => {
  const getTitle = () => {
    if (type === 'ambas') return 'Tope Diario y Horario Nocturno';
    if (type === 'tope_diario') return 'Tope Diario Superado';
    return 'Horario Nocturno';
  };

  const getIcon = () => {
    if (type === 'nocturna') return 'weather-night';
    return 'alert-octagon-outline';
  };

  const getIconColor = () => {
    if (type === 'nocturna') return '#6366F1';
    return '#DC2626';
  };

  const getMessage = () => {
    const messages: string[] = [];

    if (type === 'tope_diario' || type === 'ambas') {
      messages.push(
        'Vas a superar tu tope diario de 9h. Esto va a registrar una INFRACCIÓN para revisión de tu supervisor. Las horas se contarán como trabajadas pero NO como extras.'
      );
    }

    if (type === 'nocturna' || type === 'ambas') {
      if (isEntry) {
        messages.push(
          'Estás marcando entrada durante horario nocturno (19:00 - 06:00).'
        );
      } else {
        messages.push(
          'Parte de tu jornada fue en horario nocturno (19:00 - 06:00).'
        );
      }
    }

    return messages.join('\n\n');
  };

  const getSubtext = () => 'Tu marcaje se registrará normalmente.';

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
