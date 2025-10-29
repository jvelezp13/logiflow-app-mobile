/**
 * Home Screen
 *
 * Main screen for clock in/out actions.
 * Will be implemented fully in Phase 5.
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { MainTabScreenProps } from '@/types/navigation.types';
import { styles } from './HomeScreen.styles';

type Props = MainTabScreenProps<'Home'>;

export const HomeScreen: React.FC<Props> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inicio</Text>
      <Text style={styles.placeholder}>
        [Botones de marcaje - Fase 5]
      </Text>
    </View>
  );
};
