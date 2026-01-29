/**
 * Network Utilities
 *
 * Funciones para operaciones de red con timeout y retry exponencial.
 * Usadas por sync.service.ts para uploads de fotos y sincronización.
 */

import { API_CONFIG } from '@constants/config';

// Opciones para fetchWithRetry
type FetchWithRetryOptions = {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
};

// Opciones para withRetry (operaciones de Supabase SDK)
type WithRetryOptions = {
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
};

/**
 * Fetch con timeout usando AbortController y backoff exponencial
 *
 * @param url - URL a llamar
 * @param fetchOptions - Opciones de fetch (method, headers, body)
 * @param retryOptions - Opciones de retry y timeout
 * @returns Response de fetch
 * @throws Error si todos los reintentos fallan o hay timeout
 */
export async function fetchWithRetry(
  url: string,
  fetchOptions: RequestInit = {},
  retryOptions: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = API_CONFIG.timeout,
    retries = API_CONFIG.retryAttempts,
    retryDelay = API_CONFIG.retryDelay,
    onRetry,
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Si no es el primer intento, esperar con backoff exponencial
    if (attempt > 0) {
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`[Network] Esperando ${delay}ms antes de reintentar...`);
      await sleep(delay);

      if (onRetry) {
        onRetry(attempt, lastError!);
      }
    }

    // Crear AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Si la respuesta es exitosa, retornarla
      if (response.ok) {
        return response;
      }

      // Si es un error del servidor (5xx), reintentar
      if (response.status >= 500) {
        lastError = new Error(`Server error: ${response.status}`);
        console.warn(`[Network] Error 5xx (${response.status}), reintentando...`);
        continue;
      }

      // Para otros errores HTTP (4xx), no reintentar
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // Timeout o conexión abortada
        if (error.name === 'AbortError') {
          lastError = new Error(`Timeout después de ${timeout}ms`);
          console.warn(`[Network] Timeout en intento ${attempt + 1}/${retries + 1}`);
        } else {
          lastError = error;
          console.warn(`[Network] Error de red en intento ${attempt + 1}/${retries + 1}:`, error.message);
        }
      } else {
        lastError = new Error('Error de red desconocido');
      }

      // Continuar al siguiente intento
    }
  }

  // Todos los reintentos fallaron
  throw lastError || new Error('Todos los reintentos fallaron');
}

/**
 * Wrapper para operaciones de Supabase SDK con retry y backoff exponencial
 *
 * @param operation - Función que retorna una Promise (ej: supabase.storage.upload())
 * @param options - Opciones de retry
 * @returns Resultado de la operación
 * @throws Error del último intento si todos fallan
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: WithRetryOptions = {}
): Promise<T> {
  const {
    retries = API_CONFIG.retryAttempts,
    retryDelay = API_CONFIG.retryDelay,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Si no es el primer intento, esperar con backoff exponencial
    if (attempt > 0) {
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`[Network] withRetry: Esperando ${delay}ms antes de reintentar...`);
      await sleep(delay);

      if (onRetry) {
        onRetry(attempt, lastError!);
      }
    }

    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Error desconocido');
      console.warn(`[Network] withRetry: Error en intento ${attempt + 1}/${retries + 1}:`, lastError.message);
    }
  }

  // Todos los reintentos fallaron
  throw lastError || new Error('withRetry: Todos los reintentos fallaron');
}

/**
 * Helper para esperar un tiempo determinado
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
