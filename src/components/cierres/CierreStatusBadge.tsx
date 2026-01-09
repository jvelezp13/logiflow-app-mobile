/**
 * CierreStatusBadge
 *
 * Badge that displays the status of a weekly closure.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { EstadoCierre } from '@/types/cierres.types';

interface CierreStatusBadgeProps {
  estado: EstadoCierre;
  size?: 'small' | 'medium' | 'large';
}

const CierreStatusBadge: React.FC<CierreStatusBadgeProps> = ({
  estado,
  size = 'medium',
}) => {
  const getEstadoConfig = () => {
    switch (estado) {
      case 'borrador':
        return {
          label: 'Borrador',
          backgroundColor: '#F3F4F6',
          textColor: '#6B7280',
          icon: 'file-edit-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
        };
      case 'publicado':
        return {
          label: 'Pendiente',
          backgroundColor: '#FEF3C7',
          textColor: '#92400E',
          icon: 'clock-alert-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
        };
      case 'confirmado':
        return {
          label: 'Confirmado',
          backgroundColor: '#D1FAE5',
          textColor: '#065F46',
          icon: 'check-circle' as keyof typeof MaterialCommunityIcons.glyphMap,
        };
      case 'objetado':
        return {
          label: 'Objetado',
          backgroundColor: '#FEE2E2',
          textColor: '#991B1B',
          icon: 'alert-circle' as keyof typeof MaterialCommunityIcons.glyphMap,
        };
      case 'vencido':
        return {
          label: 'Vencido',
          backgroundColor: '#E5E7EB',
          textColor: '#4B5563',
          icon: 'clock-remove-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
        };
      default:
        return {
          label: estado,
          backgroundColor: '#F3F4F6',
          textColor: '#6B7280',
          icon: 'help-circle' as keyof typeof MaterialCommunityIcons.glyphMap,
        };
    }
  };

  const config = getEstadoConfig();

  const sizeStyles = {
    small: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 11,
      iconSize: 12,
    },
    medium: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 13,
      iconSize: 14,
    },
    large: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 15,
      iconSize: 16,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={config.icon}
        size={currentSize.iconSize}
        color={config.textColor}
      />
      <Text
        style={[
          styles.text,
          {
            color: config.textColor,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
  },
  text: {
    fontWeight: '600',
  },
});

export default CierreStatusBadge;
