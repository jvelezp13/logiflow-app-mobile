# LogiFlow Marcaje - Contexto para Claude

**Última actualización:** 7 de Enero 2026 (Sesión 10)
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

### Tablas Solo Web Admin

| Tabla | Propósito |
|-------|-----------|
| `horarios_alertas_gestion` | Alertas automáticas para admin (ausencias, excesos, etc.) |
| `configuracion_jornadas_rol` | **NUEVA** - Config de límites por rol + excepciones por cédula |

---

## Proyectos Relacionados

| Proyecto | Ruta | Descripción |
|----------|------|-------------|
| **App Móvil** | `~/CascadeProjects/logiflow-app-mobile` | Este proyecto |
| **Web Admin v2** | `~/CascadeProjects/logiflow-control-horarios-v2` | Dashboard administrativo |

### Protocolo de Modificación de Base de Datos

**OBLIGATORIO antes de modificar cualquier tabla/columna:**

```
1. Identificar tabla/columna a modificar
          ↓
2. Buscar en App Móvil (este proyecto)
   → grep del nombre en src/
          ↓
3. Buscar en Web Admin v2
   → grep en ~/CascadeProjects/logiflow-control-horarios-v2/src
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

10. **Efecto de aprobación de ajuste (PENDIENTE - Web Admin):** Cuando el admin aprueba una novedad, actualmente solo cambia `estado` a 'aprobada'. El marcaje original NO se modifica automáticamente. Al construir el nuevo Web Admin, elegir una de estas opciones:
    - **Opción A) Solo informativo:** La novedad queda como registro. Los reportes consultan `hora_nueva` de novedades aprobadas.
    - **Opción B) Actualizar marcaje:** Al aprobar, se actualiza `hora` en `horarios_registros_diarios`. El dato original se pierde.
    - **Opción C) Campo separado (RECOMENDADA):** Agregar columna `hora_ajustada` al registro. Si existe, reportes usan esa. Preserva el dato original para auditoría. Los reportes usarían `COALESCE(hora_ajustada, hora)`.

---

## Pendientes Conocidos

### ✓ RESUELTO: Integridad de Sincronización (Sesión 6)

**Síntoma detectado:** Registro (entrada 14:19) marcado como "synced" en WatermelonDB local pero ausente en Supabase.

**Solución implementada:** Función "Verificar Sincronización" en Settings > Gestión de Datos
- Compara registros locales "synced" contra Supabase por `timestamp_local`
- Detecta y lista registros huérfanos
- Opción de reparar: re-marca como "pending" para re-sincronización automática

### Futuro: Web Admin Next.js

- Reconstruir desde cero con Next.js + Supabase
- Incluir: Dashboard, Fotos con mapa, Reportes, Gestión empleados
- Usar la misma base de datos Supabase
- El Web Admin v2 actual queda "congelado" (no mantener)

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

### Fase 2: Tracking de Ubicación (Futuro)
- Nueva tabla `ubicaciones_jornada` para tracking periódico
- Servicio background que envía ubicación cada 30-60 min
- Solo activo entre entrada y salida
- Trazabilidad de que el empleado estuvo trabajando

### Fase 3: Límites Automáticos (Futuro - requiere Web Admin)
- Alertas cuando jornada > max_horas_dia configurado
- Bloqueo/alerta de marcajes en horario nocturno (antes 6am, después 7pm)
- Requiere autorización especial para extender jornada

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
