# Workflow de Mejoras - Control Horario Mobile App

**Fecha de creación:** Enero 2026
**Responsable técnico:** Claude (AI Assistant)
**Responsable de validación:** Julián Vélez

---

## Resumen Ejecutivo

Este documento describe el proceso completo para implementar 3 mejoras críticas en la aplicación móvil de Control Horario. Incluye la configuración del entorno de desarrollo, el diagnóstico detallado de cada problema, y el plan de implementación paso a paso.

**Filosofía de trabajo:**
- Claude realiza todos los cambios de código
- Julián valida cada cambio en su dispositivo Android
- No se avanza al siguiente paso sin validación exitosa
- Documentación continua de todo el proceso

---

## Tabla de Contenidos

1. [Configuración del Entorno de Desarrollo](#1-configuración-del-entorno-de-desarrollo)
2. [Arquitectura del Proyecto (Resumen)](#2-arquitectura-del-proyecto-resumen)
3. [Los 3 Problemas Críticos a Resolver](#3-los-3-problemas-a-resolver)
4. [Plan de Implementación](#4-plan-de-implementación)
5. [Checklist de Validación](#5-checklist-de-validación)
6. [Registro de Cambios](#6-registro-de-cambios)
7. [Troubleshooting](#7-troubleshooting)
8. [Ajustes Pendientes del Desarrollador Original](#8-ajustes-pendientes-del-desarrollador-original)
9. [Hallazgos Adicionales y Mejoras Futuras](#9-hallazgos-adicionales-y-mejoras-futuras)

---

## 1. Configuración del Entorno de Desarrollo

### 1.1 Requisitos Previos

| Requisito | Versión Mínima | Estado |
|-----------|----------------|--------|
| macOS | 10.15+ | ⬜ Verificar |
| Node.js | 18+ | ⬜ Verificar |
| npm | 9+ | ⬜ Verificar |
| Android Studio | Latest | ⬜ Instalar |
| Dispositivo Android | Android 8+ | ⬜ Preparar |
| Cable USB-C | - | ⬜ Tener listo |

### 1.2 Instalación de Android Studio

**Paso 1: Descargar Android Studio**
1. Ir a: https://developer.android.com/studio
2. Hacer clic en "Download Android Studio"
3. Aceptar términos y descargar el archivo `.dmg`

**Paso 2: Instalar Android Studio**
1. Abrir el archivo `.dmg` descargado
2. Arrastrar Android Studio a la carpeta Aplicaciones
3. Abrir Android Studio desde Aplicaciones
4. Seguir el asistente de configuración inicial:
   - Seleccionar "Standard" installation
   - Aceptar las licencias
   - Esperar a que descargue los componentes SDK

**Paso 3: Configurar Variables de Entorno**

Abrir Terminal y ejecutar:

```bash
# Abrir archivo de configuración de shell
nano ~/.zshrc
```

Agregar estas líneas al final del archivo:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Guardar (Ctrl+O, Enter) y salir (Ctrl+X).

Luego ejecutar:

```bash
source ~/.zshrc
```

**Paso 4: Verificar instalación**

```bash
adb --version
# Debería mostrar: Android Debug Bridge version X.X.X
```

### 1.3 Preparar Dispositivo Android

**Paso 1: Habilitar Opciones de Desarrollador**
1. Ir a **Configuración** → **Acerca del teléfono**
2. Buscar **"Número de compilación"** (puede estar en "Información del software")
3. Tocar **7 veces** seguidas sobre "Número de compilación"
4. Aparecerá mensaje: "Ahora eres desarrollador"

**Paso 2: Habilitar Depuración USB**
1. Volver a **Configuración**
2. Buscar **"Opciones de desarrollador"** (puede estar en Sistema → Avanzado)
3. Activar **"Depuración USB"**
4. Confirmar en el diálogo

**Paso 3: Conectar y Autorizar**
1. Conectar el teléfono a la Mac con cable USB-C
2. En el teléfono aparecerá: "¿Permitir depuración USB?"
3. Marcar "Permitir siempre desde esta computadora"
4. Tocar "Permitir"

**Paso 4: Verificar conexión**

En Terminal:

```bash
adb devices
```

Debe mostrar algo como:

```
List of devices attached
XXXXXXXX    device
```

Si dice "unauthorized", desconectar y reconectar el cable, luego autorizar en el teléfono.

### 1.4 Preparar el Proyecto

```bash
# Navegar al proyecto
cd /Users/julianvelez/CascadeProjects/logiflow-app-mobile

# Instalar dependencias (si no están instaladas)
npm install

# Verificar que todo esté bien
npm run tsc
```

### 1.5 Primera Ejecución de Prueba

```bash
# Con el teléfono conectado por USB
npm run android
```

**Qué esperar:**
1. Se abrirá Metro Bundler en la terminal
2. Gradle compilará el proyecto (puede tomar 2-5 minutos la primera vez)
3. La app se instalará automáticamente en el teléfono
4. La app se abrirá mostrando la pantalla de Login

**Si funciona correctamente:** El entorno está listo para desarrollo.

### 1.6 Flujo de Trabajo Durante el Desarrollo

```
┌─────────────────────────────────────────────────────────────┐
│                    CICLO DE DESARROLLO                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Claude modifica código                                  │
│              ↓                                               │
│   2. Guardar archivos (automático)                          │
│              ↓                                               │
│   3. Metro detecta cambio → Hot Reload                      │
│              ↓                                               │
│   4. App se actualiza en teléfono (2-5 segundos)            │
│              ↓                                               │
│   5. Julián prueba la funcionalidad                         │
│              ↓                                               │
│   6. ¿Funciona?                                              │
│         │                                                    │
│    Sí ──┴── No                                               │
│    │        │                                                │
│    ↓        ↓                                                │
│  Siguiente  Claude                                           │
│   mejora    ajusta                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitectura del Proyecto (Resumen)

### 2.1 Estructura de Carpetas

```
src/
├── screens/           # Pantallas de la app
│   ├── auth/         # LoginScreen
│   ├── home/         # HomeScreen (marcaje principal)
│   ├── kiosk/        # KioskHomeScreen, PinLoginScreen
│   ├── main/         # HomeScreen, HistoryScreen, SettingsScreen
│   └── novedades/    # Gestión de novedades
│
├── components/        # Componentes reutilizables
│   ├── Camera/       # CameraCapture
│   ├── ui/           # Button, Input
│   └── ...
│
├── services/          # Lógica de negocio
│   ├── attendance/   # attendanceService (clock in/out)
│   ├── storage/      # WatermelonDB (base datos local)
│   ├── sync/         # syncService (sincronización)
│   └── supabase/     # Cliente y autenticación
│
├── hooks/             # Custom hooks
│   ├── useAuth.ts
│   ├── useAutoSync.ts
│   └── ...
│
├── store/             # Estado global (Zustand)
│   └── authStore.ts
│
└── utils/             # Utilidades
    └── dateUtils.ts   # Manejo de fechas
```

### 2.2 Flujo de Datos Principal

```
Usuario marca entrada/salida
        ↓
attendanceService.clock()
        ↓
Guarda en WatermelonDB (local)
        ↓
Dispara evento RECORD_CREATED
        ↓
useAutoSync detecta evento
        ↓
syncService.syncPendingRecords()
        ↓
Sube foto a Supabase Storage
        ↓
Inserta/actualiza en horarios_registros_diarios
        ↓
Marca registro como 'synced'
```

### 2.3 Modos de Autenticación

| Modo | Uso | Persistencia | Sincronización |
|------|-----|--------------|----------------|
| **Normal** | Usuario con email/contraseña | Sesión persistente | Directa con Supabase |
| **Kiosco** | Múltiples usuarios con PIN | Solo durante sesión | Via Edge Function |

### 2.4 Archivos Clave para las Mejoras

| Archivo | Propósito | Problemas Relacionados |
|---------|-----------|------------------------|
| `src/components/SyncProvider.tsx` | Control de sincronización global | Problema 1 |
| `src/hooks/useAutoSync.ts` | Lógica de auto-sync | Problema 1 |
| `src/services/storage/attendanceRecord.service.ts` | Crea registros locales | Problema 2, 3 |
| `src/utils/dateUtils.ts` | Funciones de fecha/hora | Problema 2, 3 |
| `src/components/novedades/NovedadForm.tsx` | Formulario de novedades | Problema 3 |
| `src/services/sync/sync.service.ts` | Sincroniza con Supabase | Problema 1 |

---

## 3. Los 3 Problemas a Resolver

### 3.1 Problema 1: Fichajes en Modo Kiosco No Sincronizan

**Síntoma:**
Cuando un empleado marca entrada/salida usando PIN en modo kiosco, el registro se guarda localmente pero no se sincroniza con el servidor.

**Causa Raíz:**
El `SyncProvider` verifica `isAnyAuthenticated` (línea 66) antes de permitir sincronización. Cuando el usuario de kiosco hace logout después de marcar, la autenticación se pierde y el sync se detiene.

```typescript
// SyncProvider.tsx - Línea 66
if (!isAnyAuthenticated) {
  return <>{children}</>;  // ← No ejecuta sync si no hay auth
}
```

**Archivos Afectados:**
- `src/components/SyncProvider.tsx`
- `src/hooks/useAutoSync.ts`

**Solución Propuesta:**
Modificar el `SyncProvider` para que sincronice registros pendientes independientemente del estado de autenticación, siempre que los registros tengan `kioskPin` almacenado.

---

### 3.2 Problema 2: Hora Manipulable desde el Dispositivo

**Síntoma:**
Si un usuario cambia la hora de su teléfono manualmente, puede registrar fichajes con horas falsas.

**Causa Raíz:**
El sistema usa `Date.now()` y `new Date()` directamente del dispositivo sin validación con el servidor.

```typescript
// attendanceRecord.service.ts - Líneas 49-58
const now = Date.now();           // ← Hora del dispositivo
const nowDate = new Date(now);    // ← Sin validación
```

**Archivos Afectados:**
- `src/services/storage/attendanceRecord.service.ts`
- `src/utils/dateUtils.ts`

**Solución Propuesta:**
1. Crear un servicio que obtenga la hora del servidor (Supabase)
2. Comparar hora local vs servidor
3. Si la diferencia es > 5 minutos, mostrar advertencia o rechazar

---

### 3.3 Problema 3: Desincronización de Fechas (1 Día Atrasado)

**Síntoma:**
Los fichajes del día 2 aparecen como día 1. Hay un desfase de 1 día en las fechas.

**Causa Raíz:**
En `NovedadForm.tsx` se usa `toISOString()` que convierte a UTC, causando que fechas nocturnas cambien de día.

```typescript
// NovedadForm.tsx - Línea 86
fecha: formData.fecha.toISOString().split('T')[0]  // ← Problema!
```

**Ejemplo del Bug:**
```
Hora local Colombia: 2 de enero, 11:00 PM (23:00)
Hora UTC:            3 de enero, 4:00 AM (04:00)
toISOString():       "2024-01-03T04:00:00Z"
split('T')[0]:       "2024-01-03"  ← ¡Día incorrecto!
```

**Archivos Afectados:**
- `src/components/novedades/NovedadForm.tsx`

**Solución Propuesta:**
Usar `format(fecha, 'yyyy-MM-dd')` de date-fns que respeta la zona horaria local.

---

## 4. Plan de Implementación

### 4.1 Orden de Implementación

| Orden | Problema | Complejidad | Riesgo | Tiempo Est. |
|-------|----------|-------------|--------|-------------|
| 1 | Problema 3 (Fechas) | Baja | Bajo | 15 min |
| 2 | Problema 1 (Sync Kiosco) | Media | Medio | 1-2 horas |
| 3 | Problema 2 (Hora Servidor) | Alta | Medio | 2-3 horas |

**Justificación del orden:**
- Problema 3 es el más fácil y sirve como "calentamiento" para verificar que el entorno funciona
- Problema 1 es crítico para el negocio y tiene complejidad media
- Problema 2 requiere más cambios y un nuevo servicio

---

### 4.2 Fase 1: Fix de Fechas (Problema 3)

#### Descripción del Cambio

**Archivo:** `src/components/novedades/NovedadForm.tsx`
**Línea:** 86
**Cambio:** Reemplazar `toISOString().split('T')[0]` por `format(fecha, 'yyyy-MM-dd')`

#### Código Actual
```typescript
fecha: formData.fecha.toISOString().split('T')[0],
```

#### Código Nuevo
```typescript
fecha: format(formData.fecha, 'yyyy-MM-dd'),
```

#### Pasos de Implementación

1. **Claude:** Modificar el archivo
2. **Julián:** Verificar que la app sigue funcionando (hot reload)
3. **Julián:** Crear una novedad y verificar que la fecha es correcta
4. **Julián:** Confirmar que el fix funciona

#### Criterios de Aceptación

- [ ] La app compila sin errores
- [ ] Se puede crear una novedad
- [ ] La fecha de la novedad coincide con la fecha seleccionada
- [ ] No hay desfase de 1 día

---

### 4.3 Fase 2: Fix de Sincronización Kiosco (Problema 1)

#### Descripción del Cambio

**Archivos a modificar:**
1. `src/components/SyncProvider.tsx` - Permitir sync sin auth
2. `src/hooks/useAutoSync.ts` - Ajustar lógica de sync

#### Estrategia

El sync debe ejecutarse siempre que haya registros pendientes con `kioskPin`, independientemente del estado de autenticación.

#### Cambios Detallados

**Archivo 1: SyncProvider.tsx**

Antes:
```typescript
if (!isAnyAuthenticated) {
  return <>{children}</>;
}
```

Después:
```typescript
// Siempre renderizar el provider
// El useAutoSync manejará internamente cuándo sincronizar
```

**Archivo 2: useAutoSync.ts**

Agregar lógica para:
1. Verificar si hay registros pendientes con `kioskPin`
2. Si los hay, ejecutar sync aunque no haya autenticación activa
3. Usar el `kioskPin` del registro para la autenticación del upload

#### Pasos de Implementación

1. **Claude:** Modificar SyncProvider.tsx
2. **Julián:** Verificar que la app funciona en modo normal
3. **Claude:** Modificar useAutoSync.ts
4. **Julián:** Probar flujo completo de kiosco:
   - Entrar a modo kiosco
   - Marcar con PIN
   - Verificar que el registro se sincroniza después del logout

#### Criterios de Aceptación

- [ ] La app funciona en modo normal (login con email)
- [ ] La app funciona en modo kiosco (login con PIN)
- [ ] Los fichajes en modo kiosco se sincronizan correctamente
- [ ] Los fichajes aparecen en Supabase después del logout de kiosco

---

### 4.4 Fase 3: Validación de Hora con Servidor (Problema 2)

#### Descripción del Cambio

**Archivos a crear:**
1. `src/services/time/timeValidation.service.ts` - Nuevo servicio

**Archivos a modificar:**
1. `src/services/storage/attendanceRecord.service.ts` - Usar hora validada
2. `src/utils/dateUtils.ts` - Agregar función de validación

#### Estrategia

1. Crear función que obtiene hora del servidor Supabase
2. Comparar hora local vs servidor
3. Si diferencia > 5 minutos:
   - Opción A: Mostrar advertencia pero permitir
   - Opción B: Rechazar el fichaje
   - Opción C: Usar hora del servidor

**Pregunta para Julián:** ¿Cuál opción prefieres?

#### Pasos de Implementación

1. **Claude:** Crear timeValidation.service.ts
2. **Julián:** Probar que obtiene hora del servidor
3. **Claude:** Integrar validación en attendanceRecord.service.ts
4. **Julián:** Probar cambiando hora del dispositivo manualmente
5. **Julián:** Verificar que la validación funciona

#### Criterios de Aceptación

- [ ] La app obtiene hora del servidor correctamente
- [ ] Detecta cuando la hora local está desfasada
- [ ] Maneja el caso según la opción elegida (A, B o C)
- [ ] Los fichajes usan hora confiable

---

## 5. Checklist de Validación

### 5.1 Antes de Cada Cambio

- [ ] App funcionando correctamente
- [ ] Teléfono conectado por USB
- [ ] Metro Bundler corriendo (`npm run android`)
- [ ] Supabase local o producción accesible

### 5.2 Después de Cada Cambio

- [ ] App no crashea
- [ ] Funcionalidad modificada funciona correctamente
- [ ] Funcionalidades NO modificadas siguen funcionando
- [ ] No hay errores en consola (Metro Bundler)

### 5.3 Pruebas por Funcionalidad

#### Modo Normal
- [ ] Login con email/contraseña
- [ ] Marcar entrada con foto
- [ ] Marcar salida con foto
- [ ] Ver historial
- [ ] Crear novedad
- [ ] Sincronización automática

#### Modo Kiosco
- [ ] Activar modo kiosco
- [ ] Login con PIN
- [ ] Marcar entrada con foto
- [ ] Auto-logout después de marcar
- [ ] Sincronización de fichaje (después del logout)

#### Fechas y Horas
- [ ] Fecha de fichaje es correcta
- [ ] Hora de fichaje es correcta
- [ ] Fecha de novedad es correcta
- [ ] No hay desfase de 1 día

---

## 6. Registro de Cambios

### Plantilla de Registro

```
### [Fecha] - [Problema X] - [Estado]

**Cambios realizados:**
- Archivo: ruta/al/archivo.ts
- Descripción: Qué se cambió

**Resultado de pruebas:**
- [ ] Compilación exitosa
- [ ] Funcionalidad probada
- [ ] Sin regresiones

**Observaciones:**
Notas adicionales...

**Validado por:** Julián Vélez
```

---

### Cambios Realizados

| Fecha | Problema | Cambio | Estado | Validado |
|-------|----------|--------|--------|----------|
| 2026-01-05 | 3. Fechas | Cambiar `toISOString()` por `format()` en NovedadForm.tsx | ✅ Completado | ✅ |
| 2026-01-05 | Bug Login | Eliminar validación redundante de cédula en LoginScreen.tsx | ✅ Completado | ✅ |
| 2026-01-05 | 1. Sync Kiosco | Modificar SyncProvider.tsx para sync sin auth | ✅ Completado | ✅ |
| 2026-01-05 | Jornadas Partidas | Permitir múltiples entradas/salidas por día | ✅ Completado | ✅ |
| 2026-01-05 | Kiosco Multi-Dispositivo | Consultar Supabase para estado entre dispositivos | ✅ Completado | ⬜ Pendiente |
| 2026-01-05 | 2. Hora Servidor | Validar hora del dispositivo vs servidor antes de marcar | ✅ Completado | ✅ |
| 2026-01-05 | A1 - Nombre App | Cambiar nombre a "LogiFlow Marcaje" en app.json y strings.xml | ✅ Completado | ⬜ APK |
| 2026-01-05 | A2 - Cámara frontal | Configurar cámara frontal por defecto para selfies | ✅ Completado | ⬜ APK |
| 2026-01-05 | A6 - Incapacidad | Eliminar opción "Incapacidad" del picker de novedades | ✅ Completado | ⬜ APK |
| 2026-01-05 | A7 - Opciones peligrosas | Eliminar "Reset BD" y "Recordatorios" de Ajustes | ✅ Completado | ⬜ APK |
| 2026-01-05 | A8 - Problemas acceder | Eliminar zona sin funcionalidad del LoginScreen | ✅ Completado | ⬜ APK |
| 2026-01-05 | A9 - Icono App | Actualizar icono con reloj azul LogiFlow | ✅ Completado | ⬜ APK |
| 2026-01-05 | Fix Duplicados | Mutex en sync para evitar errores 23505 en paralelo | ✅ Completado | ✅ |

### Detalle de Cambios del 2026-01-05

#### Cambio 1: Fix de Fechas (Problema 3)
**Archivo:** `src/components/novedades/NovedadForm.tsx`
**Línea:** 86

```typescript
// Antes:
fecha: formData.fecha.toISOString().split('T')[0]

// Después:
fecha: format(formData.fecha, 'yyyy-MM-dd')
```

**Import agregado:**
```typescript
import { format } from 'date-fns';
```

**Resultado:** Las fechas de novedades ahora respetan la zona horaria local.

---

#### Cambio 2: Fix de Login (Bug adicional)
**Archivo:** `src/screens/auth/LoginScreen.tsx`
**Problema:** El login mostraba "Perfil Incompleto" aunque el usuario sí tenía cédula. Era una condición de carrera (race condition) donde el setTimeout verificaba `userCedula` antes de que el store se actualizara.

```typescript
// Antes (líneas 106-126):
if (success) {
  setTimeout(() => {
    if (!userCedula) {
      Alert.alert('Perfil Incompleto', ...);
    }
  }, 500);
}

// Después:
// Validación eliminada - ya se hace en auth.service.ts
await login(email.trim().toLowerCase(), password);
```

**Resultado:** Los usuarios con cédula pueden hacer login correctamente.

---

#### Cambio 3: SyncProvider (Problema 1 - Completado)
**Archivo:** `src/components/SyncProvider.tsx`
**Cambio:** Eliminada la verificación de `isAnyAuthenticated` que bloqueaba el sync cuando el usuario de kiosco cerraba sesión.

```typescript
// Antes:
if (!isAnyAuthenticated) {
  return <>{children}</>;
}

// Después:
// Sync corre siempre, independiente del estado de auth
// Los registros de kiosco tienen kioskPin guardado para auth
```

**Estado:** ✅ Completado y validado

---

#### Cambio 4: Jornadas Partidas (Bug descubierto y corregido)
**Archivo:** `src/services/sync/sync.service.ts`
**Problema:** Cuando un usuario hacía múltiples marcajes de entrada el mismo día (jornadas partidas), los registros se sobrescribían en lugar de crearse nuevos.

**Causa:** La lógica de sync usaba `cedula + fecha + tipo_marcaje` como identificador único, lo que causaba que el segundo clock_in del día actualizara el primero en vez de crear un nuevo registro.

```typescript
// Antes (líneas 228-235):
const { data: existingRecords, error: selectError } = await supabase
  .from('horarios_registros_diarios')
  .select('id')
  .eq('cedula', record.userCedula)
  .eq('fecha', record.date)
  .eq('tipo_marcaje', record.attendanceType)  // ← Problema!
  .limit(1);

// Después:
const { data: existingRecords, error: selectError } = await supabase
  .from('horarios_registros_diarios')
  .select('id')
  .eq('cedula', record.userCedula)
  .eq('fecha', record.date)
  .eq('timestamp_local', record.timestamp)  // ← Cada registro es único por timestamp
  .limit(1);
```

**Resultado:** Ahora se permiten múltiples entradas/salidas por día (jornadas partidas), cada registro es identificado únicamente por su `timestamp_local`.

**Estado:** ✅ Completado y validado

---

#### Cambio 5: Kiosco Multi-Dispositivo (Nuevo requerimiento)
**Archivos modificados:**
- `src/services/attendance/attendance.service.ts`
- `src/screens/kiosk/KioskHomeScreen.tsx`

**Problema:** En modo kiosco, el estado de marcajes (puede entrar / puede salir) se consultaba desde la base de datos local (WatermelonDB/SQLite). Si un empleado marcaba entrada desde su teléfono personal y luego iba a la tablet kiosco, el kiosco no veía ese marcaje porque estaba en otra base de datos local.

**Solución:** Crear funciones que consultan Supabase (cloud) en vez de la BD local para obtener el estado de marcajes en modo kiosco.

**Nuevas funciones en attendance.service.ts:**
```typescript
// Imports agregados
import { supabase } from '@services/supabase/client';
import { format } from 'date-fns';

// Nueva función para obtener último tipo de marcaje desde cloud
async getLastClockTypeFromCloud(userCedula: string): Promise<AttendanceType | null> {
  try {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('horarios_registros_diarios')
      .select('tipo_marcaje, timestamp_local')
      .eq('cedula', userCedula)
      .eq('fecha', todayStr)
      .order('timestamp_local', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0].tipo_marcaje as AttendanceType;
  } catch (error) {
    console.error('[AttendanceService] Get cloud status error:', error);
    return null;
  }
}

// Nueva función: puede hacer entrada (consulta cloud)
async canClockInFromCloud(userCedula: string): Promise<boolean> {
  const lastType = await this.getLastClockTypeFromCloud(userCedula);
  return lastType === null || lastType === 'clock_out';
}

// Nueva función: puede hacer salida (consulta cloud)
async canClockOutFromCloud(userCedula: string): Promise<boolean> {
  const lastType = await this.getLastClockTypeFromCloud(userCedula);
  return lastType === 'clock_in';
}
```

**Cambios en KioskHomeScreen.tsx:**
```typescript
// Antes (líneas 85-88):
const [canIn, canOut] = await Promise.all([
  attendanceService.canClockIn(kioskUser.user_id),
  attendanceService.canClockOut(kioskUser.user_id),
]);

// Después:
const [canIn, canOut] = await Promise.all([
  attendanceService.canClockInFromCloud(kioskUser.cedula),
  attendanceService.canClockOutFromCloud(kioskUser.cedula),
]);
```

**Nota importante:** El cambio usa `cedula` en vez de `user_id` para consultar, ya que la tabla `horarios_registros_diarios` identifica usuarios por cédula.

**Estado:** ✅ Código completado - ⬜ Pendiente validación con segundo dispositivo

---

#### Cambio 6: Validación de Hora del Servidor (Problema 2)
**Archivos creados:**
- `src/services/time/timeValidation.service.ts` (nuevo)
- `src/services/time/index.ts` (nuevo)

**Archivos modificados:**
- `src/services/attendance/attendance.service.ts`

**Problema:** Los usuarios podían manipular la hora de su dispositivo para registrar marcajes con horas falsas.

**Solución:** Crear un servicio que valida la hora del dispositivo contra el servidor antes de permitir un marcaje. Si la diferencia es mayor a 5 minutos, el marcaje es rechazado.

**Nuevo servicio timeValidation.service.ts:**
```typescript
// Constantes
const MAX_TIME_DIFF_MS = 5 * 60 * 1000; // 5 minutos

// Métodos principales:
// 1. getServerTimeFromHeaders() - Obtiene hora del header HTTP "Date" (más confiable)
// 2. getServerTimeFallback() - Estima hora basado en latencia de red
// 3. validateTime() - Compara hora local vs servidor

// Ejemplo de resultado:
type TimeValidationResult = {
  isValid: boolean;      // true si diferencia < 5 minutos
  serverTime: Date;      // Hora del servidor
  deviceTime: Date;      // Hora del dispositivo
  diffMs: number;        // Diferencia en milisegundos
  diffMinutes: number;   // Diferencia en minutos
  error?: string;        // Mensaje de error si aplica
};
```

**Integración en attendance.service.ts:**
```typescript
// Antes de crear el registro:
const timeValidation = await timeValidationService.validateTime();

if (!timeValidation.isValid) {
  const errorMessage = timeValidationService.getTimeDiffMessage(timeValidation.diffMinutes);
  return {
    success: false,
    error: `${errorMessage}. Por favor ajusta la hora de tu dispositivo.`,
    timeValidation,
  };
}
```

**Comportamiento:**
- Si la hora del dispositivo difiere más de 5 minutos del servidor, el marcaje es **rechazado**
- El usuario recibe un mensaje indicando cuánto está desfasado (ej: "Tu dispositivo está 15 minutos adelantado")
- Si no se puede obtener la hora del servidor (sin conexión), el marcaje **se permite** para no bloquear operaciones offline

**Estado:** ✅ Código completado - ⬜ Pendiente validación

---

## 7. Troubleshooting

### 7.1 Problemas Comunes de Configuración

#### "adb: command not found"

**Causa:** Variables de entorno no configuradas.

**Solución:**
```bash
# Verificar que ANDROID_HOME está configurado
echo $ANDROID_HOME

# Si está vacío, agregar a ~/.zshrc:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Recargar configuración
source ~/.zshrc
```

#### "No devices/emulators found"

**Causa:** Teléfono no conectado o no autorizado.

**Solución:**
1. Verificar cable USB conectado
2. En el teléfono, verificar "Depuración USB" activada
3. Desconectar y reconectar cable
4. Aceptar diálogo de autorización en teléfono
5. Ejecutar `adb devices` para verificar

#### "Build failed" o errores de Gradle

**Causa:** Cache corrupto o dependencias desactualizadas.

**Solución:**
```bash
# Limpiar cache
cd /Users/julianvelez/CascadeProjects/logiflow-app-mobile

# Limpiar node_modules
rm -rf node_modules
npm install

# Limpiar build Android
cd android
./gradlew clean
cd ..

# Reintentar
npm run android
```

### 7.2 Problemas Durante Desarrollo

#### Hot Reload no funciona

**Solución:**
1. Agitar el teléfono para abrir menú de desarrollo
2. Tocar "Reload"
3. O en terminal presionar `r` para reload manual

#### App crashea después de un cambio

**Solución:**
1. Revisar errores en Metro Bundler (terminal)
2. Claude revierte el cambio
3. Analizar el error antes de reintentar

#### Sync no funciona

**Verificar:**
1. ¿Hay conexión a internet en el teléfono?
2. ¿Supabase está accesible?
3. Revisar logs en Metro Bundler
4. Verificar en Supabase Dashboard si llegan los datos

### 7.3 Comandos Útiles

```bash
# Ver logs del dispositivo
adb logcat | grep -i "react\|sync\|attendance"

# Reinstalar app
npm run android

# Limpiar cache de Metro
npm run start:clear

# Ver dispositivos conectados
adb devices

# Desinstalar app del teléfono (si hay problemas)
adb uninstall com.logiflow.controlhorario
```

---

## Notas Finales

### Comunicación Durante el Desarrollo

- **Claude** explica cada cambio antes de hacerlo
- **Julián** confirma que entiende el cambio
- **Julián** prueba y reporta resultados
- **Claude** documenta en este archivo

### Principios de Trabajo

1. **Seguridad primero:** No romper funcionalidad existente
2. **Cambios pequeños:** Un cambio a la vez, validar antes de continuar
3. **Documentación:** Todo queda registrado para futuro
4. **Comunicación:** Preguntar si hay dudas, nunca asumir

---

## 8. Ajustes Pendientes del Desarrollador Original

Estos ajustes fueron solicitados al desarrollador original pero no se confirmó si fueron implementados. El código en GitHub puede no estar actualizado con la última versión del APK de producción.

### 8.1 Lista de Ajustes Solicitados

| # | Ajuste | Descripción Detallada | Estado | Prioridad |
|---|--------|----------------------|--------|-----------|
| A1 | Nombre de la App | Cambiar a "LogiFlow Marcaje" | ✅ Completado | Alta |
| A2 | Cámara frontal | Solicitar permiso para cámara frontal en vez de trasera para selfies de marcaje | ✅ Completado | Alta |
| A3 | Marcajes con PIN | Los marcajes con PIN no quedan registrados en LogiFlow (relacionado con Problema 1) | ✅ Resuelto | Crítica |
| A4 | Badge de sincronización | Hay marcajes "phantom" en el badge de sincronización | ⬜ Pendiente revisión | Media |
| A5 | Novedades: Ajuste de hora | Cambiar "Entrada tardía" y "Salida temprana" por "Ajuste Entrada" y "Ajuste Salida". Debe permitir seleccionar a qué marcaje hace referencia y cuál es la hora nueva que se debe aplicar | ⬜ Pendiente revisión | Media |
| A6 | Eliminar Incapacidad | Eliminar la opción de incapacidad desde novedades en la app | ✅ Completado | Baja |
| A7 | Eliminar opciones peligrosas | Eliminar opciones de "Borrar base de datos local" y "Notificaciones/Recordatorios" del módulo Ajustes | ✅ Completado | Media |
| A8 | Zona "Problemas para acceder" | En la página de login, la zona "¿Problemas para acceder? Contacta al administrador" no tiene funcionalidad. Decidir si omitir o configurar | ✅ Completado (eliminada) | Baja |
| A9 | Icono de la App | Actualizar con la imagen proporcionada (reloj azul) | ✅ Completado | Media |
| A10 | Imagen de novedades | Revisar imagen en la sección de novedades | ⬜ Pendiente revisión | Baja |

### 8.2 Detalle de Ajuste A5: Novedades de Ajuste de Hora

**Objetivo:** Permitir que el usuario solicite un cambio en la hora de ingreso o salida de un marcaje existente.

**Requerimientos:**
1. Renombrar tipos de novedad:
   - "Entrada tardía" → "Ajuste Entrada"
   - "Salida temprana" → "Ajuste Salida"

2. Nuevos campos en el formulario:
   - Selector de marcaje al que hace referencia (lista de marcajes del día)
   - Campo de hora nueva que se debe aplicar
   - Campo de explicación/justificación (ya existe como "motivo")

3. Flujo esperado:
   - Usuario selecciona "Ajuste Entrada" o "Ajuste Salida"
   - Sistema muestra los marcajes del día
   - Usuario selecciona el marcaje a ajustar
   - Usuario ingresa la hora correcta
   - Usuario explica el motivo del ajuste

---

## 9. Hallazgos Adicionales y Mejoras Futuras

Durante el análisis exhaustivo del código se identificaron los siguientes puntos que no son críticos pero deben considerarse para futuras mejoras.

### 9.1 Problemas Potenciales Identificados

| ID | Hallazgo | Descripción | Riesgo | Prioridad |
|----|----------|-------------|--------|-----------|
| H1 | Turnos nocturnos | Entrada 22:00 (día 1) y salida 02:00 (día 2) generan registros en días diferentes. El cálculo de horas trabajadas busca entrada en el MISMO día, no encuentra la del día anterior. | Medio | Futuro |
| H2 | Foto sin subir | Si la foto falla al subir pero el sync del registro sucede, queda `foto_url=null` en la base de datos. No hay retry automático para fotos fallidas. | Bajo | Futuro |
| H3 | Código muerto | La tabla `sync_queue` está definida en WatermelonDB pero nunca se usa. El sistema usa `sync_status` directamente en `attendance_records`. | Ninguno | Limpieza |
| H4 | Múltiples solicitudes de permisos | Location se pide en PermissionsRequest (startup), luego en getCurrentLocation() si falla, y otra vez en novedades. UX confusa. | Bajo | UX |
| H5 | Mensajes de error vagos | "Error de conexión" se usa para múltiples casos (network, BD, storage). Dificulta debugging remoto. | Bajo | UX |
| H6 | Reset de BD sin confirmación | `dbUtils.resetDatabase()` no tiene validación. Si se llama accidentalmente, pérdida total de datos locales. | Medio | Seguridad |
| H7 | Precisión decimal inconsistente | `timeToDecimal()` no redondea, pero `calculateHoursWorked()` redondea a 2 decimales. | Bajo | Consistencia |
| H8 | Tamaño de foto no validado | Config tiene `photoMaxSize: 2MB` pero no se valida en `attendanceService`, solo en camera capture. | Bajo | Validación |

### 9.2 Mejoras de Seguridad Recomendadas

| ID | Mejora | Descripción | Esfuerzo |
|----|--------|-------------|----------|
| S1 | Encriptar PIN en tránsito | Actualmente PIN viaja en JSON a Edge Function (solo protegido por HTTPS). Considerar hash adicional. | Medio |
| S2 | Expiración de PIN kiosco | PIN de kiosco sigue válido indefinidamente. Considerar expiración después de X minutos de inactividad. | Bajo |
| S3 | Validar base64 antes de envío | Prevenir potenciales inyecciones si base64 es muy grande o malformado. | Bajo |

### 9.3 Mejoras de UX Recomendadas

| ID | Mejora | Descripción | Esfuerzo |
|----|--------|-------------|----------|
| U1 | Indicador de sync en tiempo real | Mostrar claramente cuándo hay registros pendientes de sincronizar. | Bajo |
| U2 | Notificación de sync exitoso | Confirmar al usuario cuando sus fichajes se sincronizaron correctamente. | Bajo |
| U3 | Modo offline explícito | Indicar claramente cuando la app está funcionando sin conexión. | Bajo |

### 9.4 Deuda Técnica

| ID | Item | Descripción | Acción Recomendada |
|----|------|-------------|-------------------|
| D1 | Tabla sync_queue | No se usa, genera confusión | Eliminar modelo y migraciones |
| D2 | Comentarios TODO | Hay varios `// TODO:` sin resolver en el código | Revisar y resolver o eliminar |
| D3 | Console.logs | Muchos logs de debug en producción | Crear sistema de logging condicional |

### 9.5 Orden de Prioridad Post-Mejoras Actuales

Una vez completados los 3 problemas principales, se recomienda abordar en este orden:

1. **H1 - Turnos nocturnos** (si aplica al negocio)
2. **H2 - Retry de fotos fallidas**
3. **S2 - Expiración de PIN kiosco**
4. **U1 - Indicador de sync**
5. **D1 - Limpieza de código muerto**

---

## Notas Finales

### Comunicación Durante el Desarrollo

- **Claude** explica cada cambio antes de hacerlo
- **Julián** confirma que entiende el cambio
- **Julián** prueba y reporta resultados
- **Claude** documenta en este archivo

### Principios de Trabajo

1. **Seguridad primero:** No romper funcionalidad existente
2. **Cambios pequeños:** Un cambio a la vez, validar antes de continuar
3. **Documentación:** Todo queda registrado para futuro
4. **Comunicación:** Preguntar si hay dudas, nunca asumir

---

**Última actualización:** 5 de Enero 2026
**Estado general:**
- ✅ Problema 3 (Fechas): Completado y validado
- ✅ Bug Login: Completado y validado
- ✅ Problema 1 (Sync Kiosco): Completado y validado
- ✅ Jornadas Partidas: Completado y validado (bug descubierto y corregido)
- ✅ Kiosco Multi-Dispositivo: Código completado, pendiente validación con segundo dispositivo
- ✅ Problema 2 (Hora Servidor): Completado y validado
- ✅ Ajustes A1, A2, A6, A7, A8, A9: Completados
- ⬜ Ajustes A4, A5, A10: Pendientes de revisión por Julián
