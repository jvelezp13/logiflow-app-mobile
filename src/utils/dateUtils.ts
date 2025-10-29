/**
 * Date Utility Functions
 *
 * Helpers for date/time manipulation and formatting.
 * Uses date-fns for consistency with web app.
 */

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DATE_FORMATS } from '@constants/config';

/**
 * Get current date in database format (YYYY-MM-DD)
 */
export const getCurrentDate = (): string => {
  return format(new Date(), DATE_FORMATS.date);
};

/**
 * Get current time in database format (HH:mm:ss)
 */
export const getCurrentTime = (): string => {
  return format(new Date(), DATE_FORMATS.time);
};

/**
 * Get current datetime in database format
 */
export const getCurrentDatetime = (): string => {
  return format(new Date(), DATE_FORMATS.datetime);
};

/**
 * Convert time to decimal hours (e.g., "14:30:00" -> 14.5)
 */
export const timeToDecimal = (time: string): number => {
  const parts = time.split(':');
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  const seconds = Number(parts[2]) || 0;
  return hours + minutes / 60 + seconds / 3600;
};

/**
 * Convert decimal hours to time string (e.g., 14.5 -> "14:30:00")
 */
export const decimalToTime = (decimal: number): string => {
  const hours = Math.floor(decimal);
  const minutes = Math.floor((decimal - hours) * 60);
  const seconds = Math.floor(((decimal - hours) * 60 - minutes) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}`;
};

/**
 * Format date for display (dd/MM/yyyy)
 */
export const formatDateDisplay = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, DATE_FORMATS.dateDisplay, { locale: es });
};

/**
 * Format time for display (HH:mm)
 */
export const formatTimeDisplay = (time: Date | string): string => {
  const timeObj = typeof time === 'string' ? parseISO(time) : time;
  return format(timeObj, DATE_FORMATS.timeDisplay);
};

/**
 * Format datetime for display (dd/MM/yyyy HH:mm)
 */
export const formatDatetimeDisplay = (datetime: Date | string): string => {
  const datetimeObj = typeof datetime === 'string' ? parseISO(datetime) : datetime;
  return format(datetimeObj, DATE_FORMATS.datetimeDisplay, { locale: es });
};

/**
 * Get Unix timestamp (milliseconds)
 */
export const getTimestamp = (): number => {
  return Date.now();
};

/**
 * Calculate hours worked between two times
 */
export const calculateHoursWorked = (
  startTime: string,
  endTime: string
): number => {
  const start = timeToDecimal(startTime);
  const end = timeToDecimal(endTime);
  let diff = end - start;

  // Handle overnight shifts
  if (diff < 0) {
    diff += 24;
  }

  return Math.round(diff * 100) / 100; // Round to 2 decimals
};
