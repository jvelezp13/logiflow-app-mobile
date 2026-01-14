/**
 * Logger condicional - Solo muestra logs en desarrollo
 * En produccion los logs se ignoran para mejorar rendimiento
 */

const isDev = process.env.EXPO_PUBLIC_ENV !== 'production';

// Colores para diferentes niveles de log (solo en desarrollo)
const COLORS = {
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[35m',   // magenta
  reset: '\x1b[0m',
};

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const formatMessage = (level: LogLevel, prefix: string, message: string): string => {
  const timestamp = new Date().toLocaleTimeString('es-CO', { hour12: false });
  return `${COLORS[level]}[${timestamp}] [${prefix}] ${message}${COLORS.reset}`;
};

/**
 * Logger principal - solo loguea en desarrollo
 */
export const logger = {
  /**
   * Log informativo general
   */
  info: (prefix: string, message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.log(formatMessage('info', prefix, message), ...args);
    }
  },

  /**
   * Log de advertencia
   */
  warn: (prefix: string, message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.warn(formatMessage('warn', prefix, message), ...args);
    }
  },

  /**
   * Log de error - SIEMPRE se muestra (incluso en produccion)
   */
  error: (prefix: string, message: string, ...args: unknown[]): void => {
    // Los errores siempre se muestran para debugging en produccion
    console.error(formatMessage('error', prefix, message), ...args);
  },

  /**
   * Log de debug - solo desarrollo
   */
  debug: (prefix: string, message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.log(formatMessage('debug', prefix, message), ...args);
    }
  },
};

export default logger;
