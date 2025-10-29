/**
 * ReminderSettings Component
 *
 * Configure attendance reminders with time pickers.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNotifications } from '@hooks/useNotifications';
import { Button } from '@components/ui/Button';
import { COLORS } from '@constants/theme';
import { styles } from './ReminderSettings.styles';

export const ReminderSettings: React.FC = () => {
  const {
    hasPermission,
    reminders,
    requestPermission,
    updateReminder,
    getReminderByType,
    sendTestNotification,
  } = useNotifications();

  const [showClockInPicker, setShowClockInPicker] = useState(false);
  const [showClockOutPicker, setShowClockOutPicker] = useState(false);

  const clockInReminder = getReminderByType('clock_in');
  const clockOutReminder = getReminderByType('clock_out');

  /**
   * Handle clock in time change
   */
  const handleClockInTimeChange = (_event: any, selectedDate?: Date) => {
    setShowClockInPicker(Platform.OS === 'ios');

    if (selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      updateReminder('clock_in', hour, minute, true);
    }
  };

  /**
   * Handle clock out time change
   */
  const handleClockOutTimeChange = (_event: any, selectedDate?: Date) => {
    setShowClockOutPicker(Platform.OS === 'ios');

    if (selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      updateReminder('clock_out', hour, minute, true);
    }
  };

  /**
   * Get date from hour and minute
   */
  const getDateFromTime = (hour: number, minute: number): Date => {
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    return date;
  };

  /**
   * Format time
   */
  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionAlert}>
        <Text style={styles.permissionText}>
          Las notificaciones están deshabilitadas. Habilítalas para recibir recordatorios de
          marcaje.
        </Text>
        <Button
          title="Habilitar Notificaciones"
          icon="🔔"
          onPress={requestPermission}
          style={styles.permissionButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Clock In Reminder */}
      <View style={styles.reminderCard}>
        <View style={styles.reminderHeader}>
          <Text style={styles.reminderTitle}>Recordatorio de Entrada</Text>
          <Switch
            value={clockInReminder?.enabled ?? false}
            onValueChange={(enabled) => {
              const hour = clockInReminder?.hour ?? 9;
              const minute = clockInReminder?.minute ?? 0;
              updateReminder('clock_in', hour, minute, enabled);
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.surface}
          />
        </View>

        {clockInReminder?.enabled && (
          <View style={styles.reminderContent}>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowClockInPicker(true)}
            >
              <Text style={styles.timeText}>🕐</Text>
              <Text style={styles.timeText}>
                {formatTime(clockInReminder.hour, clockInReminder.minute)}
              </Text>
            </TouchableOpacity>

            {showClockInPicker && (
              <DateTimePicker
                value={getDateFromTime(clockInReminder.hour, clockInReminder.minute)}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleClockInTimeChange}
              />
            )}
          </View>
        )}
      </View>

      {/* Clock Out Reminder */}
      <View style={styles.reminderCard}>
        <View style={styles.reminderHeader}>
          <Text style={styles.reminderTitle}>Recordatorio de Salida</Text>
          <Switch
            value={clockOutReminder?.enabled ?? false}
            onValueChange={(enabled) => {
              const hour = clockOutReminder?.hour ?? 17;
              const minute = clockOutReminder?.minute ?? 0;
              updateReminder('clock_out', hour, minute, enabled);
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.surface}
          />
        </View>

        {clockOutReminder?.enabled && (
          <View style={styles.reminderContent}>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowClockOutPicker(true)}
            >
              <Text style={styles.timeText}>🕔</Text>
              <Text style={styles.timeText}>
                {formatTime(clockOutReminder.hour, clockOutReminder.minute)}
              </Text>
            </TouchableOpacity>

            {showClockOutPicker && (
              <DateTimePicker
                value={getDateFromTime(clockOutReminder.hour, clockOutReminder.minute)}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleClockOutTimeChange}
              />
            )}
          </View>
        )}
      </View>

      {/* Test Notification */}
      <Button
        title="Enviar Notificación de Prueba"
        icon="🧪"
        onPress={sendTestNotification}
        variant="outline"
        style={styles.testButton}
      />
    </View>
  );
};
