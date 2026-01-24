/**
 * Tenant Utilities
 *
 * Helpers para manejo de multi-tenant en la app movil.
 * IMPORTANTE: Todos los registros deben incluir tenant_id para RLS.
 */

import { useAuthStore } from '@store/authStore';

/**
 * Obtener el tenant_id del contexto actual
 *
 * Fuentes (en orden de prioridad):
 * 1. authStore.tenantId (puede venir de login normal o kiosk)
 * 2. authStore.user.tenantId (login normal)
 * 3. authStore.kioskUser.tenant_id (login kiosk)
 *
 * @returns tenant_id o null si no hay sesion
 */
export function obtenerTenantIdActual(): string | null {
  const state = useAuthStore.getState();

  // 1. Primero verificar el tenantId directo del store
  if (state.tenantId) {
    return state.tenantId;
  }

  // 2. Verificar si hay usuario normal con tenantId
  if (state.user?.tenantId) {
    return state.user.tenantId;
  }

  // 3. Verificar si hay usuario kiosk con tenant_id
  if (state.kioskUser?.tenant_id) {
    return state.kioskUser.tenant_id;
  }

  // No hay tenant_id disponible
  console.warn('[TenantUtils] No se encontro tenant_id en el contexto actual');
  return null;
}

/**
 * Verificar si hay un tenant_id valido
 * Util para validaciones antes de operaciones de sync
 *
 * @returns true si hay tenant_id disponible
 */
export function tieneTenantIdValido(): boolean {
  return obtenerTenantIdActual() !== null;
}

/**
 * Obtener tenant_id o lanzar error
 * Usar cuando el tenant_id es OBLIGATORIO (ej: sync a Supabase)
 *
 * @throws Error si no hay tenant_id
 * @returns tenant_id garantizado
 */
export function obtenerTenantIdRequerido(): string {
  const tenantId = obtenerTenantIdActual();

  if (!tenantId) {
    throw new Error(
      'No se puede realizar esta operacion sin un tenant_id valido. ' +
        'El usuario debe estar autenticado con una empresa asignada.'
    );
  }

  return tenantId;
}

/**
 * Verificar si el usuario actual pertenece a un tenant especifico
 *
 * @param tenantId - ID del tenant a verificar
 * @returns true si el usuario pertenece a ese tenant
 */
export function perteneceATenant(tenantId: string): boolean {
  const currentTenantId = obtenerTenantIdActual();
  return currentTenantId === tenantId;
}
