/**
 * AttendanceCard Component
 *
 * Display single attendance record with photo and sync status.
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import type { AttendanceRecord } from '@services/storage';
import { styles } from './AttendanceCard.styles';

export type AttendanceCardProps = {
  record: AttendanceRecord;
};

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ record }) => {
  /**
   * Get sync status badge
   */
  const getSyncBadge = () => {
    const status = record.attendanceSyncStatus;

    const badgeStyles = [
      styles.syncBadge,
      status === 'pending' && styles.syncBadgePending,
      status === 'syncing' && styles.syncBadgeSyncing,
      status === 'synced' && styles.syncBadgeSynced,
      status === 'error' && styles.syncBadgeError,
    ];

    const textStyles = [
      styles.syncBadgeText,
      status === 'pending' && styles.syncBadgeTextPending,
      status === 'syncing' && styles.syncBadgeTextSyncing,
      status === 'synced' && styles.syncBadgeTextSynced,
      status === 'error' && styles.syncBadgeTextError,
    ];

    const getStatusText = () => {
      switch (status) {
        case 'pending':
          return 'Pendiente';
        case 'syncing':
          return 'Sincronizando...';
        case 'synced':
          return 'Sincronizado';
        case 'error':
          return 'Error';
        default:
          return status;
      }
    };

    return (
      <View style={badgeStyles}>
        <Text style={textStyles}>{getStatusText()}</Text>
      </View>
    );
  };

  /**
   * Get type icon
   */
  const getTypeIcon = () => {
    return record.attendanceType === 'clock_in' ? '🟢' : '🔴';
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
          <Text style={styles.typeText}>{record.attendanceTypeText}</Text>
        </View>
        {getSyncBadge()}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Date */}
        <View style={styles.row}>
          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>{record.formattedDate}</Text>
        </View>

        {/* Time */}
        <View style={styles.row}>
          <Text style={styles.label}>Hora:</Text>
          <Text style={styles.value}>{record.formattedTime}</Text>
        </View>

        {/* Location */}
        {record.latitude && record.longitude && (
          <View style={styles.row}>
            <Text style={styles.label}>Ubicación:</Text>
            <Text style={styles.value}>
              {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Photo */}
      {(record.photoUri || record.photoUrl) && (
        <View style={styles.photoContainer}>
          <Text style={styles.photoLabel}>Foto:</Text>
          <Image
            source={{ uri: record.photoUrl || record.photoUri }}
            style={styles.photo}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Observations */}
      {record.observations && (
        <View style={styles.observations}>
          <Text style={styles.observationsLabel}>Observaciones:</Text>
          <Text style={styles.observationsText}>{record.observations}</Text>
        </View>
      )}

      {/* Error message */}
      {record.syncError && (
        <View style={styles.observations}>
          <Text style={styles.observationsLabel}>Error de sincronización:</Text>
          <Text style={[styles.observationsText, { color: '#f44336' }]}>
            {record.syncError}
          </Text>
        </View>
      )}
    </View>
  );
};
