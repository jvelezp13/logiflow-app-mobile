/**
 * Login Screen
 *
 * User authentication screen with email/password login.
 * Validates inputs and handles authentication errors.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthStackScreenProps } from '@/types/navigation.types';
import { useAuth } from '@hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { styles } from './LoginScreen.styles';

type Props = AuthStackScreenProps<'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, logout, isLoading, error, clearError, userCedula } = useAuth();
  const { enableKioskMode } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isEnablingKiosk, setIsEnablingKiosk] = useState(false);

  // Show error alert when auth error occurs
  useEffect(() => {
    if (error) {
      Alert.alert('Error de Autenticación', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  /**
   * Validate email format
   */
  const validateEmail = (value: string): boolean => {
    setEmailError('');
    const trimmed = value.trim();

    if (!trimmed) {
      setEmailError('El email es requerido');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Email inválido');
      return false;
    }

    return true;
  };

  /**
   * Validate password
   */
  const validatePassword = (value: string): boolean => {
    setPasswordError('');

    if (!value) {
      setPasswordError('La contraseña es requerida');
      return false;
    }

    if (value.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    return true;
  };

  /**
   * Handle login button press
   */
  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');

    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    // Attempt login
    const success = await login(email.trim().toLowerCase(), password);

    // Validate cedula after successful login
    if (success) {
      // Wait a bit for the store to update with user data
      setTimeout(() => {
        if (!userCedula) {
          Alert.alert(
            'Perfil Incompleto',
            'Tu cuenta no tiene número de cédula registrado. Por favor contacta al administrador para completar tu perfil antes de usar la aplicación.',
            [
              {
                text: 'Entendido',
                onPress: async () => {
                  await logout();
                },
              },
            ],
            { cancelable: false }
          );
        }
      }, 500);
    }

    // Navigation handled by RootNavigator
    // It will automatically switch to Main stack on successful auth
  };

  /**
   * Handle email change
   */
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      setEmailError('');
    }
  };

  /**
   * Handle password change
   */
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordError) {
      setPasswordError('');
    }
  };

  /**
   * Handle kiosk mode activation
   */
  const handleKioskMode = () => {
    Alert.alert(
      'Modo Kiosco',
      '¿Deseas activar el modo kiosco?\n\n' +
        'En modo kiosco:\n' +
        '• Los empleados marcan con PIN de 4 dígitos\n' +
        '• No se requiere email/contraseña\n' +
        '• El dispositivo funciona como estación compartida\n\n' +
        'Podrás volver al modo normal desde la pantalla de PIN.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Activar',
          onPress: async () => {
            try {
              setIsEnablingKiosk(true);
              await enableKioskMode();
            } catch (error) {
              console.error('[LoginScreen] Error enabling kiosk mode:', error);
              Alert.alert('Error', 'No se pudo activar el modo kiosco');
              setIsEnablingKiosk(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Control Horarios</Text>
            <Text style={styles.subtitle}>
              Registra tu asistencia de forma fácil y rápida
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={handleEmailChange}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
              editable={!isLoading}
            />

            <Input
              label="Contraseña"
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={passwordError}
              editable={!isLoading}
            />

            <Button
              title="Iniciar Sesión"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Problemas para acceder?
            </Text>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.footerLink}>
                Contacta al administrador
              </Text>
            </TouchableOpacity>

            {/* Kiosk Mode Button */}
            <TouchableOpacity
              onPress={handleKioskMode}
              disabled={isLoading || isEnablingKiosk}
              style={styles.kioskButton}
            >
              <Text style={styles.kioskButtonText}>
                🔢 Modo Kiosco (Marcaje con PIN)
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
