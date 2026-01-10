# LogiFlow Marcaje - Contexto para Claude

**Última actualización:** 10 de Enero 2026 (Sesión 19 - Mejoras Cierres + Panel Web)
**Proyecto:** App móvil React Native para registro de asistencia

---

## ⚠️ Mantenimiento de Este Archivo

**Este archivo es la memoria persistente del proyecto.** Claude debe mantenerlo actualizado.

### Cuándo Actualizar

1. **Al terminar una sesión:** Agregar resumen al Historial de Sesiones
2. **Al hacer cambios estructurales:** Actualizar secciones afectadas (tablas, carpetas, etc.)
3. **Al tomar decisiones de diseño:** Documentar en "Decisiones de Diseño"
4. **Al identificar pendientes:** Agregar a "Pendientes Conocidos"
5. **Al resolver pendientes:** Marcarlos como completados o eliminarlos

### Qué Actualizar

| Cambio realizado | Sección a actualizar |
|------------------|----------------------|
| Modificar tablas Supabase | Base de Datos Supabase |
| Agregar/eliminar carpetas | Estructura de Carpetas |
| Nuevas decisiones técnicas | Decisiones de Diseño |
| Tareas incompletas | Pendientes Conocidos |
| Fin de sesión | Historial de Sesiones |

### Formato del Historial

```markdown
### [Fecha] (Sesión N)
- Cambio 1 realizado
- Cambio 2 realizado
- Decisión tomada: [descripción breve]
```

---

## Forma de Trabajo con Julián

**Julián NO es programador.** Claude Code es el ejecutor técnico.

### Reglas de Colaboración

1. **Explicar todo:** Antes de hacer cambios, explicar qué se va a hacer y por qué
2. **Dar opciones:** Cuando hay decisiones, presentar opciones claras para que Julián elija
3. **Validar juntos:** Cada cambio se valida en el dispositivo antes de continuar
4. **No romper nada:** Antes de modificar DB o código, verificar que no afecte App NI Web Admin

### Verificaciones al Iniciar Sesión

```bash
# 1. Verificar dispositivo Android conectado
~/Library/Android/sdk/platform-tools/adb devices
# Debe mostrar un dispositivo con estado "device"

# 2. Verificar si Metro está corriendo
lsof -i :8081
# Si no está, iniciar con: npm run android

# 3. Verificar MCP Supabase
# Intentar ejecutar: mcp__supabase__list_tables
```

### Flujo de Desarrollo

```
Claude propone cambio
       ↓
Julián aprueba
       ↓
Claude implementa
       ↓
Hot reload en teléfono (automático)
       ↓
Julián prueba en teléfono
       ↓
¿Funciona? → Sí → Siguiente cambio
          → No → Claude ajusta
```

---

## Resumen del Proyecto

App móvil que permite a empleados marcar entrada/salida con foto y geolocalización. Funciona en dos modos:
- **Modo Normal:** Usuario autenticado con email/contraseña
- **Modo Kiosco:** Múltiples usuarios con PIN en dispositivo compartido

---

## Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| React Native + Expo SDK 54 | Framework |
| TypeScript | Lenguaje |
| Supabase | Backend (auth, DB, storage) |
| WatermelonDB | Base de datos local offline |
| Zustand | Estado global |

---

## Estructura de Carpetas

```
logiflow-app-mobile/
├── .mcp.json              # Config MCP Supabase
├── CLAUDE-CONTEXT.md      # Este archivo
├── README.md              # Documentación general
├── src/
│   ├── screens/           # Pantallas
│   │   ├── auth/         # Login
│   │   ├── kiosk/        # Modo kiosco (PIN)
│   │   ├── main/         # Home, History, Settings
│   │   └── novedades/    # Reportes de novedades
│   ├── components/        # Componentes reutilizables
│   ├── services/          # Lógica de negocio
│   │   ├── attendance/   # Marcaje (clock in/out)
│   │   ├── sync/         # Sincronización con Supabase
│   │   ├── storage/      # WatermelonDB
│   │   └── time/         # Validación de hora servidor
│   ├── hooks/             # Custom hooks
│   └── store/             # Zustand stores
├── assets/                # Íconos y splash
└── android/               # Build Android
```

---

## Base de Datos Supabase

**IMPORTANTE:** La misma DB es usada por App Móvil Y Web Admin. Antes de modificar tablas, seguir el Protocolo de Modificación.

### Tablas Usadas por la App Móvil

| Tabla | Propósito | Uso en App |
|-------|-----------|------------|
| `profiles` | Usuarios (nombre, cédula, PIN) | Login, perfil, kiosco |
| `user_roles` | Roles de usuario | Permisos |
| `horarios_registros_diarios` | Marcajes entrada/salida | Clock in/out, historial |
| `horarios_novedades` | Reportes de novedades | Crear, listar, ver detalle |
| `configuracion` | Config global y por rol | **LEER** para límites (ver abajo) |

### Tabla `configuracion` (IMPORTANTE)

La Web Admin usa esta tabla para configurar límites. La App Móvil debe **leerla** para validar horas:

```sql
-- Estructura simplificada
id, rol (nullable), minutos_descanso, max_horas_dia, max_horas_semana,
hora_inicio_jornada, hora_fin_jornada, trabajo_sabado, activo

-- rol = NULL → config global (aplica a todos)
-- rol = 'vendedor' → config específica para ese rol
-- Prioridad: config por rol > config global
```

### Columnas Nuevas en `horarios_novedades`

La Web Admin agregó soporte para **horas especiales**:

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `horas_cantidad` | decimal | Cantidad de horas extra/nocturnas |
| `generado_automaticamente` | boolean | Si fue creado por sistema vs empleado |

**Tipos de novedad expandidos:**
- `ajuste_marcaje` - Solicitud de corrección (ya existía)
- `horas_extra` - **NUEVO** - Horas que exceden max_horas_dia
- `horas_nocturnas` - **NUEVO** - Horas entre 19:00-06:00

**Estados:** `pendiente`, `aprobada`, `rechazada`

### Tablas Solo Web Admin

| Tabla | Propósito |
|-------|-----------|
| `horarios_alertas_gestion` | Alertas automáticas para admin |
| `horarios_cierres_semanales` | Cierres generados por semana |
| `horarios_cierres_detalle` | Detalle por empleado/día de cada cierre |

---

## Proyectos Relacionados

| Proyecto | Ruta | Estado |
|----------|------|--------|
| **App Móvil** | `~/CascadeProjects/logiflow-app-mobile` | ✅ Este proyecto |
| **Web Admin Next.js** | `~/CascadeProjects/logiflow-admin-nextjs` | ✅ Activo (reemplazo) |
| **Web Admin v2** | `~/CascadeProjects/logiflow-control-horarios-v2` | ❄️ Congelado (no mantener) |

**IMPORTANTE:** App Móvil y Web Admin Next.js comparten la misma base de datos Supabase.

### Protocolo de Modificación de Base de Datos

**OBLIGATORIO antes de modificar cualquier tabla/columna:**

```
1. Identificar tabla/columna a modificar
          ↓
2. Buscar en App Móvil (este proyecto)
   → grep del nombre en src/
          ↓
3. Buscar en Web Admin Next.js
   → grep en ~/CascadeProjects/logiflow-admin-nextjs/src
          ↓
4. Analizar impacto en cada proyecto
   → ¿Qué lee? ¿Qué escribe?
          ↓
5. Presentar análisis a Julián ANTES de hacer cambios
          ↓
6. Solo proceder si ambos proyectos están OK
```

**Nunca hacer:**
- ❌ Eliminar columnas sin verificar en AMBOS proyectos
- ❌ Cambiar tipos de datos sin analizar impacto
- ❌ Asumir que algo está obsoleto solo porque un proyecto no lo usa

---

## Configuración MCP Supabase

El MCP permite a Claude ejecutar queries SQL y migraciones directamente.

**URL Proyecto:** `https://xzrhjeghgrjlhihspdcp.supabase.co`

```json
{
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref", "xzrhjeghgrjlhihspdcp"]
  }
}
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run android              # Compilar y ejecutar en Android
npm run start:clear          # Limpiar cache de Metro

# Dispositivo
~/Library/Android/sdk/platform-tools/adb devices    # Ver dispositivos conectados
~/Library/Android/sdk/platform-tools/adb logcat -d  # Ver logs del dispositivo

# TypeScript
npx tsc --noEmit             # Verificar errores de tipos
```

---

## Decisiones de Diseño Importantes

1. **Validación de hora:** El marcaje valida hora del dispositivo vs servidor. Si difiere > 5 min, se rechaza.

2. **Sincronización kiosco:** Los registros de kiosco se sincronizan aunque el usuario haya cerrado sesión (tienen PIN guardado).

3. **Jornadas partidas:** Se permiten múltiples entradas/salidas por día (cada registro es único por timestamp).

4. **Novedades simplificadas:** Solo requieren fecha, tipo y motivo. Sin foto ni descripción adicional (columnas eliminadas de DB el 5 Ene 2026).

5. **Solo datos crudos en DB:** La tabla `horarios_registros_diarios` solo almacena datos crudos del marcaje. Los cálculos (horas trabajadas, extras, etc.) se hacen en reportes/Web Admin, no en la app móvil.

6. **Pull de historial optimizado:** Al abrir Historial, se hace pull de Supabase (una sola vez por sesión) para traer registros de otros dispositivos. Limitado a últimos 90 días y campos mínimos para eficiencia en equipos antiguos.

7. **Sin marcaje de pausas:** Los empleados NO marcan pausas/almuerzo. El descanso se pre-configura por rol (ej: vendedor=60min) y se resta automáticamente al calcular horas trabajadas. Esto evita olvidos y simplifica el flujo.

8. **Configuración por rol + excepciones:** Los límites de jornada (max horas, horario permitido, descanso) se configuran por rol. Si un empleado específico necesita algo diferente, se crea excepción por cédula.

9. **Ajuste de marcaje simplificado:** Las "novedades" ahora son solo solicitudes de ajuste de marcaje. El empleado selecciona un marcaje desde el Historial, indica la hora correcta y el motivo. El admin aprueba/rechaza desde Web Admin.

10. **Efecto de aprobación de ajuste:** El Web Admin implementó que al aprobar un ajuste se actualiza `ajustado_por_novedad_id` en el registro original para trazabilidad.

11. **Sistema de Horas Especiales (Web Admin - Sesión 16):**
    - La Web Admin detecta automáticamente cuando un empleado excede `max_horas_dia` o trabaja en horario nocturno (19:00-06:00)
    - Crea novedades tipo `horas_extra` o `horas_nocturnas` con estado `pendiente`
    - El admin las aprueba/rechaza desde Novedades
    - Solo las horas **aprobadas** se contabilizan en cierres semanales
    - **App Móvil debe**: Mostrar warning al marcar salida si se detectan horas especiales

---

## Pendientes Conocidos

### ✓ RESUELTO: Integridad de Sincronización (Sesión 6)

**Síntoma detectado:** Registro (entrada 14:19) marcado como "synced" en WatermelonDB local pero ausente en Supabase.

**Solución implementada:** Función "Verificar Sincronización" en Settings > Gestión de Datos
- Compara registros locales "synced" contra Supabase por `timestamp_local`
- Detecta y lista registros huérfanos
- Opción de reparar: re-marca como "pending" para re-sincronización automática

### ✅ COMPLETADO: Web Admin Next.js (Sesiones 13-16)

El Web Admin fue reconstruido completamente. Ver `~/CascadeProjects/logiflow-admin-nextjs/CLAUDE-CONTEXT.md` para detalles.

**Módulos completados:**
- Dashboard con alertas y estado sync
- Empleados CRUD con Admin API
- Marcajes con edición/eliminación
- Novedades con aprobación de horas especiales
- Configuración por rol
- Cierres semanales
- Reportes analíticos

---

### ✅ RESUELTO: Sesión Offline (Sesión 13 - 8 Ene 2026)

**Problema original:** Al cerrar la app estando offline y reabrirla, pedía login nuevamente aunque el usuario ya estuviera autenticado. Esto impedía marcar asistencia sin conexión.

**Causa raíz:** `AuthService.getCurrentUser()` requiere conexión a Supabase. Cuando está offline, retornaba `null` y el sistema interpretaba esto como "no hay sesión".

**Solución implementada en `authStore.ts`:**
1. Verificar conexión con NetInfo **antes** de validar con Supabase
2. Si está offline → usar datos cacheados en AsyncStorage
3. Si está online → validar normalmente con Supabase
4. Fallback adicional: si hay cualquier error, intentar usar cache

**Resultado:** Los empleados pueden cerrar y reabrir la app offline, y seguir marcando. Los marcajes se sincronizan cuando recuperen conexión.

**Nota sobre B1 (Persistencia Cola Offline):** El análisis confirmó que WatermelonDB SÍ persiste correctamente los marcajes en SQLite. Los registros "pending" sobreviven al cierre de la app.

---

### ✅ RESUELTO: Badges Historial (Sesión 13 - 8 Ene 2026)

**Problema original:** Los badges de estado (Pendiente/Ajustado/Rechazado) no aparecían en el Historial. Error en consola de Supabase.

**Causa raíz:** Query de Supabase ambigua. Hay dos relaciones entre `horarios_novedades` y `horarios_registros_diarios`, y Supabase no sabía cuál usar.

**Solución:** Especificar la FK explícitamente en la query:
```typescript
// Antes (ambiguo):
horarios_registros_diarios!inner(timestamp_local)

// Después (explícito):
horarios_registros_diarios!horarios_novedades_marcaje_id_fkey(timestamp_local)
```

**Mejora adicional:** El pull de historial ahora incluye marcajes agregados por admin desde Web Admin (se quitó filtro `fuente = 'mobile'`).

---

### ✅ B4: Feature - Warning Horas Especiales (COMPLETADO - Sesión 15)

**Contexto del Sistema:**
- La tabla `configuracion` define límites por rol: `max_horas_dia`, `minutos_descanso`, `hora_inicio_nocturno`, `hora_fin_nocturno`
- Web Admin detecta horas especiales **solo cuando se editan/guardan marcajes** (NO hay cron)
- La función `crearNovedadesHorasEspeciales()` en Web Admin crea novedades automáticas tipo `horas_extra` o `horas_nocturnas`
- El objetivo es que la App Móvil **advierta** al empleado ANTES de que Web Admin detecte

**Flujo Completo:**

```
ENTRADA (App Móvil):
├── ¿Hora actual en rango nocturno? (ej: 19:00-06:00)
│   ├── SÍ → Modal: "Estás entrando en horario nocturno..."
│   │         [Entendido] → Procede a marcar
│   └── NO → Marcar entrada normal

SALIDA (App Móvil):
├── Calcular horas netas = horas brutas - (minutos_descanso / 60)
├── Verificar:
│   ├── ¿Horas netas > max_horas_dia?
│   │   └── SÍ → Modal warning horas extra
│   └── ¿Hora actual en rango nocturno?
│       └── SÍ → Modal warning horas nocturnas
├── Mostrar modal combinado si aplica ambos
│   [Entendido] → Procede a marcar salida
└── El marcaje NUNCA se bloquea, solo informa

WEB ADMIN (post-marcaje):
├── Al sincronizar, detecta si hay horas especiales
├── Crea novedades automáticas tipo horas_extra/horas_nocturnas
├── Admin aprueba/rechaza
└── Solo horas aprobadas cuentan en cierres semanales
```

**Implementación Requerida:**

1. **Nuevo servicio `configuracion.service.ts`:**
   - Fetch config del rol del usuario desde tabla `configuracion`
   - Cache en memoria para no consultar en cada marcaje
   - Campos: `max_horas_dia`, `minutos_descanso`, `hora_inicio_nocturno`, `hora_fin_nocturno`

2. **Función utilitaria para cálculo de horas:**
   - Sumar pares entrada/salida del día
   - Restar `minutos_descanso / 60` para obtener horas netas
   - Verificar si está en rango nocturno

3. **Componente `SpecialHoursWarningModal`:**
   - Props: `type` (extra | nocturna | ambas), `horasExtra`, `onConfirm`
   - Solo botón "Entendido" (sin "Cancelar")
   - Muestra cantidad de horas extra si aplica

4. **Modificar `attendance.service.ts` (clock-in/out):**
   - Antes de marcar, verificar condiciones
   - Si aplica warning, mostrar modal y esperar confirmación
   - Proceder con marcaje independientemente

5. **Modificar HomeScreen "Horas trabajadas":**
   - Actualmente muestra horas brutas
   - Cambiar a: `horasNetas = horasBrutas - (minutosDescanso / 60)`
   - Mostrar como "X.X h trabajadas (netas)"

**Comportamiento Offline:**
- Si no hay conexión, no se puede obtener config
- Marcar sin warning (mejor permitir que bloquear)
- El warning es informativo, no crítico

---

### ✅ B5: Vista de Cierres Semanales (COMPLETADO - Sesión 17)

**Feature implementada:** Sistema completo para que empleados vean y gestionen sus cierres semanales.

**Archivos creados:**
- `src/types/cierres.types.ts` - Tipos: EstadoCierre, DiaCierre, TotalesCierre, CierreSemanal, ObjecionDia
- `src/services/cierresService.ts` - Service con type assertions para tabla no tipada
- `src/hooks/useCierres.ts` - Hook con NetInfo para validar conexión
- `src/components/cierres/CierreStatusBadge.tsx` - Badge con colores por estado
- `src/components/cierres/CierreCard.tsx` - Card memoizado para lista
- `src/components/cierres/CierresList.tsx` - FlatList con empty/offline states
- `src/screens/cierres/DetalleCierreScreen.tsx` - Pantalla de detalle completa
- `src/navigation/CierresNavigator.tsx` - Stack navigator

**Archivos modificados:**
- `src/types/navigation.types.ts` - Agregado CierresStackParamList
- `src/navigation/MainNavigator.tsx` - Tab oculto para Cierres
- `src/hooks/useAttendanceRecords.ts` - 'cierres' agregado a DateFilter
- `src/screens/main/HistoryScreen.tsx` - Filtro "Cierres" + renderizado condicional

**Funcionalidad:**
- Filtro "Cierres" en HistoryScreen (junto a Hoy|Semana|Mes)
- Lista de cierres publicados (no borradores) con estado visual
- Pantalla de detalle con resumen semanal y tabla de días
- **Confirmar cierre:** estado → 'confirmado', confirmado_at = now()
- **Objetar cierre:** Modal para seleccionar días + comentario (min 10 chars)
- Requiere conexión (no funciona offline)

**Nota técnica:** La tabla `cierres_semanales` no está en los tipos generados de Supabase. Se usaron type assertions (`as never`) y una interfaz interna `CierreRow`.

---

### ✅ B6: Flujo Completo de Objeciones (COMPLETADO - Sesión 17)

**Feature implementada:** Ciclo completo de objeciones con respuesta del admin.

**Cambios en BD:**
- Migración: `add_respuesta_admin_to_cierres`
- Nuevas columnas en `cierres_semanales`:
  - `respuesta_admin TEXT` - Texto de la respuesta del admin
  - `respondido_at TIMESTAMPTZ` - Cuándo respondió
  - `respondido_por UUID` - Quién respondió

**Cambios en App Móvil:**
- `src/types/cierres.types.ts` - Agregados campos de respuesta
- `src/services/cierresService.ts` - Actualizado CierreRow
- `src/screens/cierres/DetalleCierreScreen.tsx` - Nueva sección "Respuesta del administrador"
  - Aparece cuando `respuesta_admin` tiene contenido
  - Muestra el texto y fecha de respuesta
  - Hint para que el empleado revise y confirme/objetar nuevamente

**Cambios en Web Admin:**
- `src/app/(dashboard)/cierres/components/estado-cierres-panel.tsx`:
  - Actualizado tipo CierreSemanal con nuevos campos
  - Botón de respuesta rápida (icono) en cierres objetados
  - Modal de detalle muestra:
    - Sección de respuesta anterior (si existe)
    - Formulario para responder (solo si estado='objetado')
  - Función `responderObjecion()`: guarda respuesta y cambia estado a 'publicado'
- `src/app/(dashboard)/cierres/components/cierres-client.tsx`:
  - Actualizado tipo CierreSemanal

**Flujo completo implementado:**

```
1. Admin publica cierre → estado = 'publicado'
                              ↓
2. Empleado ve cierre → Confirmar o Objetar
                              ↓
   ┌──────────────────────────┴──────────────────────────┐
   ↓                                                      ↓
3a. CONFIRMAR                                    3b. OBJETAR
    estado = 'confirmado'                            estado = 'objetado'
    ✅ FIN                                           objecion_dias = [{fecha, comentario}]
                                                            ↓
                                                 4. Admin ve objeción en Web Admin
                                                            ↓
                                                 5. Admin responde (min 10 chars)
                                                    respuesta_admin = "texto"
                                                    estado = 'publicado' (de nuevo)
                                                            ↓
                                                 6. Empleado ve respuesta + cierre re-publicado
                                                    → Vuelve a confirmar o objetar

TIMEOUT: 48h sin respuesta → estado = 'vencido' (cron existente)
```

---

### ✅ B7: Validación Selfie en Confirmación (COMPLETADO - Sesión 18)

**Feature implementada:** Validación de confirmación de cierres con selfie como evidencia.

**Nota:** Inicialmente se planificó selfie + firma digital, pero la dependencia `react-native-signature-canvas` causaba problemas con WebView. Se simplificó a solo selfie para evitar complicaciones.

**Cambios en BD:**
- Migración: `add_confirmation_evidence_to_cierres`
- Nuevas columnas en `cierres_semanales`:
  - `foto_confirmacion_url TEXT` - URL de la selfie al confirmar
  - `firma_confirmacion_url TEXT` - (Reservado para futuro, no usado actualmente)

**Archivos creados (App Móvil):**
| Archivo | Propósito |
|---------|-----------|
| `src/components/cierres/ConfirmacionCierreFlow.tsx` | Orquestador del flujo (selfie→procesando→éxito) |

**Archivos modificados (App Móvil):**
| Archivo | Cambio |
|---------|--------|
| `src/types/cierres.types.ts` | Campo `foto_confirmacion_url` |
| `src/services/cierresService.ts` | Métodos `uploadFotoConfirmacion()`, `confirmarCierreConFoto()` |
| `src/hooks/useCierres.ts` | Método `confirmarCierreConFoto()` |
| `src/screens/cierres/DetalleCierreScreen.tsx` | Integración del flujo de confirmación |

**Flujo implementado:**
```
Usuario presiona "Confirmar"
    ↓
Alert: "Se te pedirá selfie como evidencia"
    ↓
Modal CameraCapture (selfie)
    ↓
Procesando: sube foto a Storage
    ↓
UPDATE cierres_semanales con URL + estado + timestamp
    ↓
Éxito: navega atrás
```

**Storage:**
- Bucket: `attendance_photos` (reutilizado)
- Ruta: `cierres/{cedula}/{cierre_id}_foto_{timestamp}.jpg`

---

## Roadmap: Sistema de Control de Jornadas

### Fase 1: Ajuste de Marcaje (Sesión 8-10 - COMPLETADA)
- [x] Diseño de arquitectura
- [x] Limpieza de BD (eliminadas 4 tablas + 1 función obsoletas)
- [x] Crear tabla `configuracion_jornadas_rol`
- [x] Simplificar `horarios_novedades` a solo ajustes
- [x] UI: Botón "Solicitar ajuste" en cada marcaje del Historial
- [x] UI: Formulario simple (hora nueva + motivo)
- [x] Navegación: HistoryScreen → Novedades tab → SolicitarAjusteScreen
- [x] Service: Lookup de marcaje_id por timestamp_local
- [x] Indicadores visuales en Historial (pendiente/aprobado/rechazado)
- [x] Detección de novedades existentes → navegar a detalle en vez de crear
- [x] Tab Novedades oculto (acceso solo desde Historial)

### Estructura de `configuracion_jornadas_rol`
```sql
-- Config por ROL (base) o por CÉDULA (excepción)
CREATE TABLE configuracion_jornadas_rol (
  id UUID PRIMARY KEY,
  rol app_role,                    -- NULL si es excepción por cédula
  cedula VARCHAR,                  -- NULL si es config por rol
  max_horas_dia DECIMAL(4,2) DEFAULT 10.0,
  hora_inicio_permitida TIME DEFAULT '06:00',
  hora_fin_permitida TIME DEFAULT '19:00',
  minutos_descanso_diario INTEGER DEFAULT 60,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_rol_o_cedula CHECK (
    (rol IS NOT NULL AND cedula IS NULL) OR
    (rol IS NULL AND cedula IS NOT NULL)
  )
);

-- Prioridad: 1) cédula específica, 2) rol, 3) defaults
```

---

## Historial de Sesiones

### 10 de Enero 2026 (Sesión 19) - Mejoras UX Cierres + Panel Web

**Mejoras en App Móvil:**

1. **Fix KeyboardAvoidingView en modal de objeción:**
   - Problema: Al objetar un cierre, el teclado tapaba el campo de comentario
   - Solución: Envolver contenido del modal con `KeyboardAvoidingView`
   - Archivo: `src/screens/cierres/DetalleCierreScreen.tsx`
   ```typescript
   <Modal>
     <KeyboardAvoidingView
       style={styles.modalOverlay}
       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
     >
       <View style={styles.modalContent}>...</View>
     </KeyboardAvoidingView>
   </Modal>
   ```

2. **Estilos para badges de modificación en días:**
   - `diaNombreRow`: Flexbox row para nombre del día + badge
   - `modificacionBadge`: Padding y border-radius para los íconos

**Mejoras en Web Admin:**

1. **Regeneración de datos al responder objeciones:**
   - Nueva función `regenerarDatosCierre()` que recalcula `datos_semana` con marcajes actuales
   - El admin puede editar marcajes y al republicar, los datos reflejan los cambios
   - Checkbox "Actualizar datos con marcajes corregidos" (activado por defecto)
   - Archivo: `estado-cierres-panel.tsx`

2. **Visualización de foto de confirmación:**
   - Cuando un cierre está confirmado y tiene `foto_confirmacion_url`, se muestra en el modal
   - Thumbnail clicable que abre la imagen completa
   - Incluye timestamp de confirmación
   - Archivo: `estado-cierres-panel.tsx`

3. **Tipo CierreSemanal actualizado:**
   - Agregado campo `foto_confirmacion_url` al tipo
   - Archivo: `cierres-client.tsx`

**Archivos modificados:**
| Proyecto | Archivo | Cambio |
|----------|---------|--------|
| Mobile | `DetalleCierreScreen.tsx` | KeyboardAvoidingView + estilos |
| Web Admin | `estado-cierres-panel.tsx` | regenerarDatosCierre + foto display |
| Web Admin | `cierres-client.tsx` | tipo actualizado |

---

### 9 de Enero 2026 (Sesión 18) - B7: Validación Selfie en Confirmación

(Ver sección B7 en Pendientes Conocidos para detalles completos)

---

### 9 de Enero 2026 (Sesión 17) - B5 + B6: Cierres Semanales Completo

**Features implementadas:**
1. **B5:** Sistema para que empleados vean y gestionen sus cierres semanales
2. **B6:** Flujo completo de objeciones con respuesta del admin

---

#### B5: Vista de Cierres

**Archivos creados (App Móvil):**
| Archivo | Propósito |
|---------|-----------|
| `src/types/cierres.types.ts` | Tipos: EstadoCierre, DiaCierre, TotalesCierre, CierreSemanal, ObjecionDia |
| `src/services/cierresService.ts` | CRUD para cierres con type assertions (tabla no tipada) |
| `src/hooks/useCierres.ts` | Hook con NetInfo para validar conexión antes de acciones |
| `src/components/cierres/CierreStatusBadge.tsx` | Badge con colores por estado |
| `src/components/cierres/CierreCard.tsx` | Card memoizado para lista |
| `src/components/cierres/CierresList.tsx` | FlatList con empty/offline states |
| `src/screens/cierres/DetalleCierreScreen.tsx` | Detalle completo con confirmar/objetar |
| `src/navigation/CierresNavigator.tsx` | Stack navigator para cierres |

**Archivos modificados (App Móvil):**
| Archivo | Cambio |
|---------|--------|
| `src/types/navigation.types.ts` | Agregado `CierresStackParamList` |
| `src/navigation/MainNavigator.tsx` | Tab oculto para Cierres |
| `src/hooks/useAttendanceRecords.ts` | 'cierres' agregado a DateFilter |
| `src/screens/main/HistoryScreen.tsx` | Filtro "Cierres" + renderizado condicional |

**Funcionalidad B5:**
- Nuevo filtro "Cierres" en Historial (junto a Hoy|Semana|Mes)
- Lista de cierres publicados con estado visual (badge coloreado)
- Detalle: resumen semanal (horas trabajadas, extras, nocturnas) + tabla de días
- **Confirmar:** Cambia estado a 'confirmado' + guarda timestamp
- **Objetar:** Modal para seleccionar días + comentario (mínimo 10 caracteres)
- Requiere conexión a internet (botones deshabilitados offline)

---

#### B6: Flujo de Respuesta a Objeciones

**Migración BD:** `add_respuesta_admin_to_cierres`
- `respuesta_admin TEXT` - Texto de respuesta
- `respondido_at TIMESTAMPTZ` - Cuándo respondió
- `respondido_por UUID` - Quién respondió

**Archivos modificados (App Móvil):**
- `src/types/cierres.types.ts` - Campos de respuesta
- `src/services/cierresService.ts` - CierreRow actualizado
- `src/screens/cierres/DetalleCierreScreen.tsx` - Sección "Respuesta del administrador"

**Archivos modificados (Web Admin):**
- `estado-cierres-panel.tsx` - Formulario de respuesta + botón en tabla
- `cierres-client.tsx` - Tipo actualizado

**Flujo implementado:**
```
Empleado objeta → Admin responde en Web Admin →
Cierre vuelve a 'publicado' → Empleado ve respuesta + confirma/objetar
```

---

**Problema técnico resuelto:**
La tabla `cierres_semanales` no está en los tipos generados de Supabase. Solución:
```typescript
// Interfaz interna
interface CierreRow { id: string; cedula: string; ... }

// Query con type assertion
const { data, error } = await (supabase
  .from('cierres_semanales' as never)
  .select('*') as unknown as Promise<{ data: CierreRow[] | null; error: Error | null }>);
```

---

### 8 de Enero 2026 (Sesión 16) - Correcciones Web Admin + Arquitectura Final Horas Especiales

**Contexto:** Se identificaron 5 bugs críticos en la función de detección de horas especiales en Web Admin Next.js.

**Archivo modificado:** `~/CascadeProjects/logiflow-admin-nextjs/src/app/(dashboard)/marcajes/actions.ts`

**Bugs corregidos:**

| # | Bug | Antes | Después |
|---|-----|-------|---------|
| 1 | Solo tomaba primera entrada/salida | `.find()` | Arreglo con pairing cronológico |
| 2 | No restaba descanso | Horas brutas | `horasNetas = horasBrutas - (minutosDescanso/60)` |
| 3 | Tabla incorrecta | `horarios_configuracion` (no existe) | `configuracion` |
| 4 | Horas nocturnas hardcodeadas | 19:00-06:00 fijo | Lee `hora_inicio_nocturno` y `hora_fin_nocturno` de config |
| 5 | Cálculo nocturno confuso | Lógica incorrecta | Algoritmo con manejo de cruce de medianoche |

**GAP resuelto con trigger SQL:**
- Los marcajes desde la app móvil ahora SÍ disparan detección automática
- Creado trigger `trigger_horas_especiales` en tabla `horarios_registros_diarios`

**Funciones SQL creadas:**

1. `obtener_config_empleado(cedula)` - Obtiene config del empleado por rol
2. `calcular_horas_nocturnas_sesion(...)` - Calcula horas en periodo nocturno
3. `trigger_detectar_horas_especiales()` - Función principal del trigger

**Bugs del trigger corregidos:**

| # | Bug | Fix |
|---|-----|-----|
| 1 | Tipo marcaje incorrecto | `'salida'` → `'clock_out'` |
| 2 | Columna perfil no existe | `p.display_name` → `CONCAT(p.nombre, ' ', p.apellido)` |
| 3 | Format specifier inválido | `format('%.1f')` → concatenación con `ROUND()` |
| 4 | Constraint muy restrictivo | Agregados `horas_extra` y `horas_nocturnas` a `chk_tipo_novedad` |

**Arquitectura Final - Decisión de Diseño:**

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER SQL (Supabase)                   │
│  - Se ejecuta automáticamente en INSERT/UPDATE de marcajes  │
│  - CREA las novedades de horas_extra/horas_nocturnas        │
│  - Fuente de verdad para novedades automáticas              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                TypeScript (Web Admin)                        │
│  - Función: obtenerInfoHorasEspeciales()                    │
│  - SOLO DETECTA valores para mostrar en UI                  │
│  - NO CREA novedades (evita duplicación)                    │
│  - Muestra mensaje informativo al usuario                   │
└─────────────────────────────────────────────────────────────┘
```

**Razón:** Evitar duplicación de lógica y novedades. El trigger es la fuente única de creación de novedades automáticas.

**Comportamiento del trigger:**
- Se ejecuta en INSERT/UPDATE de `horarios_registros_diarios`
- Solo procesa marcajes de tipo `clock_out`
- Obtiene TODOS los marcajes del día para el empleado
- Empareja entradas/salidas cronológicamente
- Calcula horas brutas, resta descanso, obtiene horas netas
- Si horas extra > 5 min → crea novedad `horas_extra`
- Si horas nocturnas > 5 min → crea novedad `horas_nocturnas`
- Si ya existe novedad del día → la actualiza en vez de duplicar

**Cron jobs de Supabase:**
- ❌ Eliminado: `cerrar_jornadas_extendidas_automatico` (función no existía)
- ✅ Mantiene: `marcar_cierres_vencidos` (cada hora, marca cierres como vencidos después de 48h)

---

### 8 de Enero 2026 (Sesión 15) - B4: Warning Horas Especiales

**Feature implementada:** Sistema de advertencias para horas especiales (extra y nocturnas)

**Archivos creados:**
- `src/services/configuracion.service.ts` - Servicio para obtener configuración por rol desde Supabase
- `src/components/SpecialHoursWarning/SpecialHoursWarningModal.tsx` - Modal de advertencia
- `src/components/SpecialHoursWarning/index.ts` - Exports del componente

**Archivos modificados:**
- `src/screens/main/HomeScreen.tsx` - Integración de warnings en clock-in/out
- `src/screens/main/HomeScreen.styles.ts` - Nuevo estilo `workedHoursSubtext`

**Funcionalidad implementada:**

1. **Servicio de configuración (`configuracion.service.ts`):**
   - Obtiene config del rol del usuario desde tabla `configuracion`
   - Cache de 5 minutos para evitar queries repetidas
   - Funciones: `getConfigForUser()`, `calculateNetHours()`, `getExtraHours()`, `isNocturnalDecimalHour()`

2. **Modal de warning (`SpecialHoursWarningModal`):**
   - Tipos de warning: `extra`, `nocturna`, `ambas`
   - Solo botón "Entendido" (NO bloquea el marcaje)
   - Muestra cantidad de horas extra si aplica
   - Diferencia entre entrada y salida

3. **Integración en HomeScreen:**
   - **Al marcar entrada:** Verifica si es horario nocturno → muestra warning
   - **Al marcar salida:** Verifica horas extra Y horario nocturno → muestra warning
   - Después del warning, procede a cámara normalmente

4. **Horas netas en pantalla principal:**
   - Cambiado de "Horas trabajadas" a "Horas trabajadas (netas)"
   - Resta `minutos_descanso` de la configuración del rol
   - Muestra subtexto: "Descanso: X min descontados"

**Comportamiento offline:**
- Si no hay conexión, no se puede obtener config → marcaje sin warning
- Es mejor permitir que bloquear (el warning es informativo)

**Pendientes:**
- B5: Feature vista de cierres semanales

---

### 8 de Enero 2026 (Sesión 14) - Bugs B1-B3 Resueltos

**Bugs resueltos:**

1. **B1/B2: Sesión Offline Persistente** - Empleados pueden cerrar/reabrir app offline y seguir marcando
   - Modificado `authStore.ts` para verificar NetInfo antes de validar con Supabase
   - Si offline → usa cache de AsyncStorage
   - Fallback adicional si hay cualquier error de red

2. **B3: Badges en Historial** - Completamente funcional
   - Fix query ambigua de Supabase (especificar FK explícita)
   - Pull-to-refresh ahora incluye marcajes de admin (quitado filtro `fuente = 'mobile'`)
   - Query local con `Q.or` para incluir registros pulled (userId OR userCedula)
   - Sincronización de ediciones de admin (comparando `ajustado_at`)
   - Badges visuales: "Manual" (púrpura) y "Editado" (azul)
   - Sincronización de eliminaciones desde Web Admin

**Cambios técnicos:**
- Schema v3: campos `fuente` y `remote_updated_at` para tracking de admin
- Nuevo método `deleteByTimestamp()` en attendanceRecord.service
- Pull detecta registros con `deleted_at IS NOT NULL` y los elimina localmente

**Pendientes:**
- B4: Feature warning horas especiales
- B5: Feature vista de cierres semanales

---

### 8 de Enero 2026 - Migración Contexto Web Admin

**Contexto:** Se completó el Web Admin Next.js (Sesiones 13-16). Este archivo fue actualizado con información relevante.

**Cambios en DB (aplicados desde Web Admin):**
- Nueva tabla `configuracion` para límites por rol (reemplaza `configuracion_jornadas_rol`)
- Columnas nuevas en `horarios_novedades`: `horas_cantidad`, `generado_automaticamente`
- Tipos de novedad expandidos: `horas_extra`, `horas_nocturnas`
- Tablas de cierres: `horarios_cierres_semanales`, `horarios_cierres_detalle`

**Sistema de Horas Especiales (cómo funciona):**
1. Empleado marca salida en App
2. Web Admin detecta si excede `max_horas_dia` o trabajó en horario nocturno
3. Crea novedad automática tipo `horas_extra` o `horas_nocturnas`
4. Admin aprueba/rechaza desde Web Admin
5. Solo horas aprobadas cuentan en cierres semanales

**Pendientes identificados para App Móvil:**
- ✅ B1: Bug persistencia offline (RESUELTO Sesión 14)
- ✅ B2: Bug sesión + offline (RESUELTO Sesión 14)
- ✅ B3: Bug historial badges (RESUELTO Sesión 14)
- B4: Feature warning horas especiales
- B5: Feature vista de cierres

---

### 7 de Enero 2026 (Sesión 12) - Generación APK Producción

**Objetivo:** Generar APK para distribución interna (sin Google Play Store)

#### APK Generado
- **Archivo:** `LogiFlow-Marcaje-v1.0.apk`
- **Ubicación:** `~/Desktop/LogiFlow-Marcaje-v1.0.apk`
- **Tamaño:** ~100 MB
- **Build time:** ~60 minutos (primera compilación)

#### Proceso de Build
```bash
# 1. Prebuild (genera proyecto Android nativo)
npx expo prebuild --platform android --clean

# 2. Build release APK
cd android && ./gradlew assembleRelease

# 3. APK resultante
android/app/build/outputs/apk/release/app-release.apk
```

#### Notas de Build
- Primera compilación incluye descarga de dependencias + compilación nativa (~60min)
- Builds subsecuentes son más rápidos (~5-10min)
- JVM Metaspace warning (non-fatal, puede ignorarse)
- APK unsigned (para distribución interna, no requiere firma de Play Store)

#### Distribución
Para instalar en dispositivos de empleados:
1. Compartir APK por WhatsApp/Drive/correo
2. En el dispositivo: Ajustes → Seguridad → Permitir "Orígenes desconocidos"
3. Abrir el APK descargado e instalar

---

### 7 de Enero 2026 (Sesión 11) - Auditoría de Performance

**Contexto:** App corriendo en equipos Android antiguos/lentos de trabajadores de campo.

**Auditoría realizada:** Análisis completo del codebase enfocado en rendimiento para dispositivos de baja gama.

#### Optimizaciones Implementadas (HIGH + MEDIUM Impact)

| Categoría | Cambio | Impacto | Archivo(s) |
|-----------|--------|---------|------------|
| **Assets** | Compresión iconos 780KB → 183KB (76% reducción) | HIGH | `assets/icon.png`, `adaptive-icon.png` |
| **Dependencies** | Eliminadas react-native-maps y uuid (no usadas) | HIGH | `package.json` |
| **React.memo** | AttendanceCard con comparador custom | HIGH | `AttendanceCard.tsx` |
| **React.memo** | Button memoizado | MEDIUM | `Button.tsx` |
| **Component extraction** | ClockDisplay aislado (evita re-render cada segundo) | MEDIUM | `KioskHomeScreen.tsx` |
| **DB Query** | Eliminada debug query en getPendingSync | MEDIUM | `attendanceRecord.service.ts` |
| **FlatList** | useCallback en renderItem + useMemo filtros | MEDIUM | `NovedadesList.tsx` |
| **Battery** | Sync interval 30s → 60s | MEDIUM | `config.ts` |

#### Detalles Técnicos

**AttendanceCard memoization:**
```typescript
export const AttendanceCard = memo(AttendanceCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.record.id === nextProps.record.id &&
    prevProps.record.isSynced === nextProps.record.isSynced &&
    prevProps.record.attendanceSyncStatus === nextProps.record.attendanceSyncStatus &&
    prevProps.adjustmentStatus === nextProps.adjustmentStatus
  );
});
```

**ClockDisplay extraction:**
```typescript
const ClockDisplay = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  // ... render solo el reloj
});
```

**Compresión de iconos:**
- Herramienta: pngquant (lossy 80-90% quality)
- icon.png: 780KB → 183KB
- adaptive-icon.png: 780KB → 183KB
- Sin pérdida visual perceptible

#### Issues NO Implementados (Low Priority)

| Issue | Razón para no implementar |
|-------|---------------------------|
| Hermes optimizations | Ya habilitado por defecto en Expo SDK 54 |
| ProGuard rules | Requiere eject de Expo (no recomendado) |
| Image lazy loading | Lista de novedades es pequeña (< 50 items) |

#### Fixes Adicionales

- **Fix indicador sync ⏳ que no desaparecía:**
  - Problema: React.memo con comparador custom no detectaba cambios de WatermelonDB
  - Solución: Cambiado a comparación shallow por defecto (`memo(Component)` sin comparador)

- **Formato AM/PM en toda la app:**
  - Cambiado de formato 24h a 12h con AM/PM para mejor UX
  - Archivos modificados:
    - `AttendanceRecord.ts` (getter `formattedTime`)
    - `HomeScreen.tsx` (reloj principal)
    - `KioskHomeScreen.tsx` (reloj kiosco)
    - `DetalleNovedadScreen.tsx` (horas de ajuste)
  - Ejemplo: `14:30` → `2:30 PM`

### 7 de Enero 2026 (Sesión 10)
- **Fix DateTimePicker en Android:**
  - Cambiado de API declarativa a imperativa (`DateTimePickerAndroid.open()`)
  - iOS mantiene spinner, Android usa dialog nativo
- **Indicadores visuales en Historial:**
  - Nuevo método `obtenerNovedadesPorTimestamp()` en novedadesService (join con registros)
  - Hook `useAttendanceRecords` ahora retorna `novedadesInfo` (id + estado)
  - AttendanceCard muestra badges: Pendiente (amarillo), Ajustado (verde), Rechazado (rojo)
  - Removido icono de lápiz, agregado chevron-right
  - Removido filtro "Todos" (solo Hoy/Semana/Mes)
- **Navegación inteligente desde Historial:**
  - Si no hay novedad → navega a SolicitarAjusteScreen (crear solicitud)
  - Si ya existe novedad → navega a DetalleNovedadScreen (ver estado/comentarios)
- **Tab Novedades oculto:**
  - Removido del tab bar usando `tabBarButton: () => null` + `tabBarItemStyle: { display: 'none' }`
  - Screen movido al final del Tab.Navigator para evitar espacio en blanco
  - Navigator sigue existiendo para navegación programática desde Historial
  - Tab bar ahora muestra solo: Inicio, Historial, Ajustes (3 tabs)
- **Pull-to-refresh en Historial:**
  - Agregado `RefreshControl` al SectionList
  - Nueva función `onRefresh` en hook para recargar novedades sin reiniciar app
  - Útil para ver novedades recién creadas
- **DetalleNovedadScreen mejorado:**
  - Nueva sección "Solicitud de Ajuste" que muestra hora registrada → hora solicitada
  - Permite verificar qué hora se pidió antes de que admin apruebe/rechace
- **Ajustes estéticos finales:**
  - Header azul más alto (60 → 90 en theme.ts) para evitar corte por notch
  - Botones sync reordenados: Verificar primero, Forzar después (lógica correcta)
- **Fase 1 del Roadmap 100% completada**

### 7 de Enero 2026 (Sesión 9)
- **Completada UI de ajuste de marcaje:**
  - AttendanceCard ahora es tocable con icono de lápiz (pencil)
  - HistoryScreen navega a Novedades tab → SolicitarAjusteScreen
  - Navegación entre tabs con parámetros: `navigation.navigate('Novedades', { screen: 'SolicitarAjuste', params: {...} })`
- **Agregado SolicitarAjusteScreen al NovedadesNavigator:**
  - Screen con header "Solicitar Ajuste"
  - Formulario: info del marcaje, selector de hora (DateTimePicker), campo motivo
  - Validación: motivo mínimo 10 caracteres
- **Actualizado novedadesService para lookup por timestamp:**
  - `crearAjusteMarcaje()` busca `marcaje_id` en Supabase usando `timestamp_local`
  - Necesario porque WatermelonDB no almacena IDs de Supabase
- **Limpieza de código obsoleto:**
  - TipoNovedadPicker simplificado a solo 'ajuste_marcaje'
  - NovedadCard: eliminadas referencias a latitud/longitud
  - DetalleNovedadScreen: eliminada sección de ubicación
- **Fix imports y tipos:**
  - Button: `@components/common` → `@components/ui/Button`
  - Navigation typing: `useNavigation<any>()` con eslint-disable para navegación entre tabs
- **Fase 1 del Roadmap completada** - Sistema de ajuste de marcaje funcional

### 7 de Enero 2026 (Sesión 8)
- **Rediseño del sistema de novedades → ajustes de marcaje:**
  - Análisis completo de tablas existentes y flujo actual
  - Decisión: Simplificar "novedades" a solo "solicitudes de ajuste de marcaje"
  - Eliminar tipos: ausencia, permiso, jornada_extendida, otro (no se usan)
  - Nuevo flujo: Historial → tocar marcaje → solicitar ajuste → hora nueva + motivo
- **Limpieza de BD ejecutada:**
  - ✅ Eliminada: `horarios_cierres_automaticos_log` (5,983 registros)
  - ✅ Eliminada: `horarios_sync_control` (vacía)
  - ✅ Eliminada: `horarios_asignaciones_diarias` (70 registros)
  - ✅ Eliminada: `horarios_configuracion_descansos` (vacía)
  - ✅ Eliminada función: `cerrar_jornadas_extendidas_automatico`
- **Simplificación de `horarios_novedades`:**
  - ✅ Eliminadas columnas: `latitud`, `longitud`, `hora_planificada`
  - ✅ Unificado tipo_novedad a solo `ajuste_marcaje`
  - ✅ Eliminado 1 registro tipo `ausencia` (quedan 8 registros)
- **Nueva tabla `configuracion_jornadas_rol` creada:**
  - Configuración de límites por ROL (base) + excepciones por CÉDULA
  - Campos: max_horas_dia, hora_inicio/fin_permitida, minutos_descanso_diario
  - Constraints: solo una config activa por rol/cédula
- **Decisiones de diseño:**
  - Sin marcaje de pausas: descanso pre-configurado por rol, se resta automático
  - Límite default: 10 horas/día, horario 06:00-19:00
  - Prioridad config: 1) cédula específica, 2) rol, 3) defaults globales
- **Roadmap documentado:** 3 fases (ajustes, tracking ubicación, límites automáticos)

### 5 de Enero 2026 (Sesión 7)
- **Rediseño completo de Historial:**
  - Cambiado de FlatList a SectionList con agrupación por fecha ("Hoy", "Ayer", "Lunes 6 de enero")
  - Simplificado AttendanceCard a formato compacto de fila (icono, tipo, hora, estado sync)
  - Eliminada foto y ubicación del historial (no aportaban valor en esta vista)
  - Eliminada sección de estadísticas (Entradas/Salidas) redundante
  - Eliminado refresh falso que no hacía nada
- **Implementado pull desde Supabase:**
  - Nuevo método `pullFromSupabase(userCedula)` en `sync.service.ts`
  - Nuevo método `createFromRemote()` en `attendanceRecord.service.ts`
  - Actualizado `useAttendanceRecords` hook para hacer pull automático al abrir Historial
  - Soporta rotación de dispositivos y modo kiosco (trae historial de otros equipos)
- **Optimizaciones de rendimiento:**
  - Limitado pull a últimos 90 días (vs 500 registros arbitrarios)
  - Reducido SELECT de 11 a 7 campos esenciales (~40% menos datos)
  - Eliminados campos no usados en historial: foto_url, observaciones, latitud, longitud
  - Pull se ejecuta una sola vez por sesión (useRef para evitar duplicados)

### 5 de Enero 2026 (Sesión 6)
- Investigación de problema de sincronización: registro 14:19 ausente en Supabase
- Identificado que WatermelonDB tiene 14 registros pero Supabase solo 13
- **Implementado:** Función "Verificar Sincronización" en DataManagement
  - Nuevo método `verifySyncIntegrity()` en `sync.service.ts`
  - Compara registros locales "synced" contra Supabase por `timestamp_local`
  - Detecta registros huérfanos (marcados como synced pero no en servidor)
  - Opción de reparar: re-marca como "pending" para re-sincronización
  - Nuevos métodos en `attendanceRecord.service.ts`: `getSyncedRecords()`, `markAsPending()`
  - Nuevo botón "Verificar Sincronización" en Settings > Gestión de Datos
- **Validado:** Registro 14:19 recuperado exitosamente - ahora 14 registros en Supabase
- **Limpieza de Settings:** Eliminadas secciones redundantes
  - Removida sección "Información de la App" (versión y entorno)
  - Removida sección "Estadísticas" (StatsSection) - info redundante con Home
  - Eliminado import de `APP_CONFIG` y `StatsSection` de SettingsScreen
- **Mejorado banner de conexión:** En `LocationStatusBanner`
  - Cambiado "Modo avión" → "Sin conexión" (más claro y genérico)
  - Mensaje: "Tus marcajes se guardan localmente"
  - Aplica cuando no hay WiFi, datos o cualquier conexión (no solo modo avión)
- **Mejorado manejo offline en Novedades:**
  - `useNovedades.ts`: Verifica conexión antes de llamar Supabase, silencia errores de red esperados
  - `NovedadesList.tsx`: Muestra mensaje "Sin conexión" con icono wifi-off cuando está offline
  - `NovedadesScreen.tsx`: Pasa estado `isOffline` al componente de lista
  - Si intenta crear novedad offline, muestra alerta explicativa
- **Limpieza de errores TypeScript:** Todos los errores de TypeScript resueltos
  - Instalado `@expo/vector-icons` (faltaba el paquete)
  - Arreglados tipos de Supabase (`never`) en `novedadesService.ts` y `pinAuth.service.ts` con casting explícito
  - Removidas opciones de navegación obsoletas (`animationEnabled`, `headerBackTitleVisible`) en React Navigation 7
  - Agregada variante `ghost` a componente `Button`
  - Agregados alias `base` y `'2xl'` a `FONT_SIZES` en `theme.ts`
  - Corregido tipo de `kioskPin` en `attendance.service.ts` (null → undefined)
  - Tipado correcto de navegación en `NovedadesScreen.tsx`
  - Corregidos estilos que usaban `COLORS.text.primary` → `COLORS.text`
- **Mejora visual botones de marcaje:**
  - Agregadas variantes `clockIn` (verde) y `clockOut` (rojo) al componente Button
  - Actualizados HomeScreen y KioskHomeScreen para usar las nuevas variantes
  - Colores: entrada usa `COLORS.clockIn` (#10b981), salida usa `COLORS.clockOut` (#ef4444)

### 5 de Enero 2026 (Sesión 5)
- Eliminadas 4 columnas de cálculos derivados de `horarios_registros_diarios`:
  - `horas_trabajadas`, `horas_extras`, `jornada_completa`, `tiene_extras`
- Actualizado código de sincronización (`sync.service.ts`) para no calcular estos valores
- Actualizados tipos TypeScript en app móvil
- **Nueva funcionalidad:** Mostrar "Horas trabajadas (en curso)" en HomeScreen
  - Calcula sumando todos los pares entrada-salida del día
  - Si hay entrada abierta, calcula hasta hora actual
  - Ubicado entre la fecha y los botones de marcar
- **Decisión:** Solo guardar datos crudos en DB, cálculos se harán en Web Admin futuro
- **Decisión:** Mantener timestamps en UTC en DB, hora local en `hora_*_decimal`. Conversión solo al mostrar en Web Admin

### 5 de Enero 2026 (Sesión 4)
- Configurado Web Admin local (puerto 8080) para visualización
- Resuelto error "Acceso Restringido": faltaba `VITE_MASTER_EMAIL=admin@logiflow.com` en `.env`
- Análisis de Web Admin v2: No tiene páginas de fotos ni coordenadas (solo dashboard, empleados, reportes, configuración)
- **Decisión estratégica:** Priorizar app móvil, luego reconstruir Web Admin desde cero con Next.js

### 5 de Enero 2026 (Sesión 3) - Continuación
- Eliminadas columnas `centro_trabajo` y `horas_descanso` de `horarios_registros_diarios` (nunca usadas, 647 registros con valores NULL/0)
- Actualizado RPC `get_kpis_dinamicos_activos` para usar `user_roles.role` como agrupación en vez de `centro_trabajo`
  - Parámetro renombrado: `centro_filtro` → `rol_filtro`
  - Campo de retorno: `centro_trabajo` → `rol`
- Actualizados 10+ archivos en Web Admin para usar el nuevo campo `rol`:
  - `useGlobalData.ts`, `useControlSemanal.ts`, `useEmpleadosDataIndependent.ts`
  - `useReportesAusencias.ts`, `useConfiguracionJornadas.ts`, `useConfiguracionDescansos.ts`
  - `ReportsNew.tsx`, `CorreccionManual.tsx`, `ChartsSection.tsx`
- Los roles disponibles son: master, auxiliar, administrativo, operario_bodega, vendedor

### 5 de Enero 2026 (Sesión 3)
- Análisis flujo de datos marcaje entrada/salida → tabla `horarios_registros_diarios`
- Eliminadas 11 columnas obsoletas de `horarios_registros_diarios`:
  - ETL: `hora_inicio_original`, `hora_fin_original`, `horas_jornada_original`, `horas_extras_original`, `horas_descanso_original`, `periodo_original`, `tipo_dia`, `fecha_procesamiento`, `created_by`
  - Empresa (single-tenant): `empresa`, `cif`
- Ajustada Web Admin (`Empleados.tsx`) para usar `hora_inicio_decimal`/`hora_fin_decimal` con conversión a formato HH:MM
- Actualizados tipos TypeScript en ambos proyectos

### 5 de Enero 2026 (Sesión 2)
- Auditoría completa de tablas Supabase
- Eliminadas 10 tablas obsoletas: `planillas`, `planillas_facturas`, `planillas_facturas_productos`, `planillas_progreso_auxiliar`, `cuadres`, `clientes_maestros`, `inventario_maestro`, `movimientos_productos`, `novedades_inventario`, `empleados_configuracion_descansos`
- Eliminadas columnas `descripcion` y `foto_url` de `horarios_novedades`
- Limpieza de código en: `novedadesService.ts`, `useNovedades.ts`, `NovedadCard.tsx`, `DetalleNovedadScreen.tsx`, `CrearNovedadScreen.tsx`
- Eliminados archivos obsoletos: `SPEC.txt`, `test-connection.js`, `App LogiFlow Marcajes Azul.png`
- Documentado protocolo de mantenimiento de este archivo

### 5 de Enero 2026 (Sesión 1)
- 16 mejoras implementadas y validadas (A1-A10, mejoras adicionales)
- Simplificación del formulario de novedades (removido foto y descripción del UI)
- Configuración de MCP Supabase con Personal Access Token
- Limpieza de documentación (de 12 archivos .md a 2)
- Definición de forma de trabajo Claude + Julián
