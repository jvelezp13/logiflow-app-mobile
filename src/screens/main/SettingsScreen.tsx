/**
 * Settings Screen: perfil + gestión de datos + logout.
 * Activar modo kiosco se hace desde el LoginScreen (no desde aquí).
 */

import React from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainTabScreenProps } from '@/types/navigation.types';
import { useAuth } from '@hooks/useAuth';
import { Button } from '@components/ui/Button';
import { AppVersionText } from '@components/ui/AppVersionText';
import { DataManagement } from '@components/DataManagement';
import { styles } from './SettingsScreen.styles';

type Props = MainTabScreenProps<'Settings'>;

export const SettingsScreen: React.FC<Props> = () => {
  const { user, userFullName, userEmail, userCedula, logout, isLoading } = useAuth();

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

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestión de Datos</Text>
        <DataManagement />
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

      <View style={styles.versionContainer}>
        <AppVersionText prefix="LogiFlow Marcaje" style={styles.versionText} />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};
