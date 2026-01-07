/**
 * AttendanceCard Component
 *
 * Compact row display for attendance record with adjustment status indicator.
 * Tappable to request adjustment.
 *
 * OPTIMIZED: Wrapped in React.memo to prevent unnecessary re-renders in lists.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AttendanceRecord } from '@services/storage';
import type { EstadoNovedad } from '@services/novedadesService';
import { styles } from './AttendanceCard.styles';
import { COLORS } from '@constants/theme';

export type AttendanceCardProps = {
  record: AttendanceRecord;
  adjustmentStatus?: EstadoNovedad;
  onPress?: (record: AttendanceRecord) => void;
};

// Status config moved outside component to prevent recreation on each render
const STATUS_CONFIG = {
  pendiente: {
    icon: 'clock-outline' as const,
    color: '#92400E',
    text: 'Pendiente',
    badgeStyle: styles.statusBadgePending,
    textStyle: styles.statusTextPending,
  },
  aprobada: {
    icon: 'check-circle-outline' as const,
    color: '#065F46',
    text: 'Ajustado',
    badgeStyle: styles.statusBadgeApproved,
    textStyle: styles.statusTextApproved,
  },
  rechazada: {
    icon: 'close-circle-outline' as const,
    color: '#991B1B',
    text: 'Rechazado',
    badgeStyle: styles.statusBadgeRejected,
    textStyle: styles.statusTextRejected,
  },
} as const;

const AttendanceCardComponent: React.FC<AttendanceCardProps> = ({
  record,
  adjustmentStatus,
  onPress
}) => {
  const isClockIn = record.attendanceType === 'clock_in';
  const icon = isClockIn ? '🟢' : '🔴';
  const typeText = isClockIn ? 'Entrada' : 'Salida';

  // Only show sync indicator if not synced
  const showSyncStatus = !record.isSynced;
  const syncIcon = record.attendanceSyncStatus === 'error' ? '⚠️' : '⏳';

  const handlePress = () => {
    if (onPress) {
      onPress(record);
    }
  };

  /**
   * Render adjustment status badge
   */
  const renderStatusBadge = () => {
    if (!adjustmentStatus) return null;

    const status = STATUS_CONFIG[adjustmentStatus];

    return (
      <View style={[styles.statusBadge, status.badgeStyle]}>
        <MaterialCommunityIcons
          name={status.icon}
          size={14}
          color={status.color}
        />
        <Text style={[styles.statusText, status.textStyle]}>
          {status.text}
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.type}>{typeText}</Text>
      <Text style={styles.time}>{record.formattedTime}</Text>
      {showSyncStatus && <Text style={styles.syncIcon}>{syncIcon}</Text>}
      {renderStatusBadge()}
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={COLORS.textSecondary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

// Memoized export to prevent unnecessary re-renders in lists
// NOTE: Using default shallow comparison instead of custom comparator
// because WatermelonDB observables return new object references on updates
export const AttendanceCard = memo(AttendanceCardComponent);
