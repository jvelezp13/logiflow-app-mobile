/**
 * CierreCard
 *
 * Card component for displaying a weekly closure in a list.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import CierreStatusBadge from './CierreStatusBadge';
import type { CierreResumen } from '@/types/cierres.types';

interface CierreCardProps {
  cierre: CierreResumen;
  onPress: (cierre: CierreResumen) => void;
}

const CierreCardComponent: React.FC<CierreCardProps> = ({ cierre, onPress }) => {
  /**
   * Format week range as "6 Ene - 12 Ene 2026"
   */
  const formatSemana = (): string => {
    const inicio = parseISO(cierre.semana_inicio);
    const fin = parseISO(cierre.semana_fin);
    return `${format(inicio, 'd MMM', { locale: es })} - ${format(fin, "d MMM yyyy", { locale: es })}`;
  };

  /**
   * Format hours as "8h 30m" or "8h"
   */
  const formatHoras = (horas: number): string => {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  /**
   * Get descriptive text based on status
   */
  const getStatusDescription = (): string => {
    switch (cierre.estado) {
      case 'publicado':
        return 'Requiere tu confirmacion';
      case 'confirmado':
        return 'Confirmado por ti';
      case 'objetado':
        return 'Objecion en revision';
      case 'vencido':
        return 'Plazo de respuesta vencido';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(cierre)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="calendar-week"
            size={24}
            color="#2563eb"
          />
          <View style={styles.headerText}>
            <Text style={styles.semana}>{formatSemana()}</Text>
            {getStatusDescription() && (
              <Text style={styles.statusDescription}>{getStatusDescription()}</Text>
            )}
          </View>
        </View>
        <CierreStatusBadge estado={cierre.estado} size="small" />
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="clock-outline" size={18} color="#6B7280" />
          <Text style={styles.statValue}>{formatHoras(cierre.horas_trabajadas)}</Text>
          <Text style={styles.statLabel}>registradas</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  semana: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
});

export const CierreCard = memo(CierreCardComponent);
export default CierreCard;
