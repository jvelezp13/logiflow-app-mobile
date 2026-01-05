/**
 * Settings Screen
 *
 * App settings and user profile with logout functionality.
 * Includes kiosk mode toggle for shared device usage.
 */

import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainTabScreenProps } from '@/types/navigation.types';
import { useAuth } from '@hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@components/ui/Button';
import { StatsSection } from '@components/StatsSection';
import { DataManagement } from '@components/DataManagement';
import { APP_CONFIG } from '@constants/config';
import { COLORS } from '@constants/theme';
import { styles } from './SettingsScreen.styles';

type Props = MainTabScreenProps<'Settings'>;

export const SettingsScreen: React.FC<Props> = () => {
  const { user, userFullName, userEmail, userCedula, logout, isLoading } = useAuth();
  const { kioskMode, enableKioskMode } = useAuthStore();
  const [isEnablingKiosk, setIsEnablingKiosk] = useState(false);

  /**
   * Handle kiosk mode toggle
   */
  const handleKioskModeToggle = () => {
    if (kioskMode) {
      // Cannot disable kiosk mode from within kiosk mode
      Alert.alert(
        'Modo Kiosco Activo',
        'No puedes desactivar el modo kiosco desde esta pantalla. Usa el botón "Modo Administrador" en la pantalla de PIN.'
      );
      return;
    }

    // Confirm enable kiosk mode
    Alert.alert(
      'Activar Modo Kiosco',
      '¿Deseas activar el modo kiosco?\n\n' +
        'En modo kiosco:\n' +
        '• Múltiples usuarios pueden marcar con PIN\n' +
        '• No se requiere email/contraseña\n' +
        '• El dispositivo se convierte en una estación compartida\n\n' +
        'Tu sesión actual se cerrará.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Activar',
          style: 'default',
          onPress: async () => {
            try {
              setIsEnablingKiosk(true);
              await enableKioskMode();
            } catch (error) {
              console.error('[SettingsScreen] Error enabling kiosk mode:', error);
              Alert.alert('Error', 'No se pudo activar el modo kiosco');
            } finally {
              setIsEnablingKiosk(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle logout with confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Profile Section */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perfil</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{userFullName || 'N/A'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{userEmail || 'N/A'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Cédula:</Text>
            <Text style={styles.value}>{userCedula || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de la App</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Versión:</Text>
            <Text style={styles.value}>{APP_CONFIG.version}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Entorno:</Text>
            <Text style={styles.value}>{APP_CONFIG.environment}</Text>
          </View>
        </View>
      </View>

      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <StatsSection />
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestión de Datos</Text>
        <DataManagement />
      </View>

      {/* Kiosk Mode Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modo Kiosco</Text>
        <View style={styles.card}>
          <View style={styles.kioskRow}>
            <View style={styles.kioskInfo}>
              <Text style={styles.kioskTitle}>Activar Modo Kiosco</Text>
              <Text style={styles.kioskDescription}>
                Permite que múltiples usuarios marquen asistencia con PIN en un dispositivo compartido
              </Text>
            </View>
            <Switch
              value={kioskMode}
              onValueChange={handleKioskModeToggle}
              disabled={isEnablingKiosk || kioskMode}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <Button
          title="Cerrar Sesión"
          icon="🚪"
          onPress={handleLogout}
          loading={isLoading}
          variant="danger"
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};
