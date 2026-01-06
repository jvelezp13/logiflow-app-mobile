/**
 * AttendanceCard Component
 *
 * Compact row display for attendance record.
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { AttendanceRecord } from '@services/storage';
import { styles } from './AttendanceCard.styles';

export type AttendanceCardProps = {
  record: AttendanceRecord;
};

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ record }) => {
  const isClockIn = record.attendanceType === 'clock_in';
  const icon = isClockIn ? '🟢' : '🔴';
  const typeText = isClockIn ? 'Entrada' : 'Salida';

  // Only show sync indicator if not synced
  const showSyncStatus = !record.isSynced;
  const syncIcon = record.attendanceSyncStatus === 'error' ? '⚠️' : '⏳';

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.type}>{typeText}</Text>
      <Text style={styles.time}>{record.formattedTime}</Text>
      {showSyncStatus && <Text style={styles.syncIcon}>{syncIcon}</Text>}
    </View>
  );
};
