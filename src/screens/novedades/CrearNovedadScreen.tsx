import React from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NovedadForm from '../../components/novedades/NovedadForm';
import useNovedades from '../../hooks/useNovedades';
import type { TipoNovedad } from '../../services/novedadesService';

const CrearNovedadScreen: React.FC = () => {
  const navigation = useNavigation();
  const { crearNovedad, loading } = useNovedades();

  const handleSubmit = async (data: {
    fecha: string;
    tipo_novedad: TipoNovedad;
    motivo: string;
  }) => {
    try {
      const success = await crearNovedad(data);

      if (success) {
        // Navegar de regreso a la lista
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error en CrearNovedadScreen:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al crear la novedad. Por favor intenta nuevamente.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.content}>
        <NovedadForm onSubmit={handleSubmit} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
});

export default CrearNovedadScreen;
