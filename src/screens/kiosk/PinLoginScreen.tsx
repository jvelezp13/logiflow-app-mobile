/**
 * PIN Login Screen
 *
 * Kiosk mode login screen with numeric PIN pad.
 * Allows employees to authenticate using their 4-digit PIN.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';

export const PinLoginScreen: React.FC = () => {
  const { loginWithPin, isLoading, error, clearError, disableKioskMode } = useAuthStore();

  const [pin, setPin] = useState('');
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Clear error when unmounting
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  /**
   * Shake animation for wrong PIN
   */
  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Handle number press
   */
  const handleNumberPress = (number: string) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        setTimeout(() => handleSubmit(newPin), 300);
      }
    }
  };

  /**
   * Handle backspace
   */
  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    clearError();
  };

  /**
   * Handle submit
   */
  const handleSubmit = async (pinToSubmit?: string) => {
    const finalPin = pinToSubmit || pin;

    if (finalPin.length !== 4) {
      Alert.alert('PIN Incompleto', 'Por favor ingresa los 4 dígitos');
      return;
    }

    clearError();

    const success = await loginWithPin(finalPin);

    if (!success) {
      // Clear PIN and shake on error
      setPin('');
      shakeError();
    }
  };

  /**
   * Handle admin mode
   */
  const handleAdminMode = () => {
    Alert.alert(
      'Modo Administrador',
      '¿Deseas salir del modo kiosco y usar autenticación normal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            await disableKioskMode();
          },
        },
      ]
    );
  };

  /**
   * Render PIN dots
   */
  const renderPinDots = () => {
    return (
      <Animated.View
        style={[styles.pinContainer, { transform: [{ translateX: shakeAnimation }] }]}
      >
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[styles.pinDot, pin.length > index && styles.pinDotFilled]}
          />
        ))}
      </Animated.View>
    );
  };

  /**
   * Render number button
   */
  const renderNumberButton = (number: string) => {
    return (
      <TouchableOpacity
        key={number}
        style={styles.numberButton}
        onPress={() => handleNumberPress(number)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={styles.numberButtonText}>{number}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Control de Horarios</Text>
        <Text style={styles.subtitle}>Ingresa tu PIN de 4 dígitos</Text>
      </View>

      {/* PIN Display */}
      <View style={styles.pinSection}>
        {renderPinDots()}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Number Pad */}
      <View style={styles.numberPad}>
        {/* Rows 1-3 */}
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map(renderNumberButton)}
          </View>
        ))}

        {/* Row 4: Backspace, 0, Enter */}
        <View style={styles.numberRow}>
          <TouchableOpacity
            style={[styles.numberButton, styles.actionButton]}
            onPress={handleBackspace}
            disabled={isLoading || pin.length === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Borrar</Text>
          </TouchableOpacity>

          {renderNumberButton('0')}

          <TouchableOpacity
            style={[styles.numberButton, styles.enterButton]}
            onPress={() => handleSubmit()}
            disabled={isLoading || pin.length !== 4}
            activeOpacity={0.7}
          >
            <Text style={styles.enterButtonText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Admin Mode Button */}
      <TouchableOpacity style={styles.adminButton} onPress={handleAdminMode}>
        <Text style={styles.adminButtonText}>Modo Administrador</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ¿No tienes PIN? Contacta al administrador
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  pinSection: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    textAlign: 'center',
  },
  numberPad: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    gap: SPACING.md,
  },
  numberRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  numberButton: {
    flex: 1,
    aspectRatio: 1.2,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  numberButtonText: {
    fontSize: 32,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  enterButton: {
    backgroundColor: COLORS.primary,
  },
  enterButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  adminButton: {
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  adminButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
