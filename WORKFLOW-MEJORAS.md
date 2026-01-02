# Workflow de Mejoras - Control Horario Mobile App

**Fecha de creación:** Enero 2025
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
3. [Los 3 Problemas a Resolver](#3-los-3-problemas-a-resolver)
4. [Plan de Implementación](#4-plan-de-implementación)
5. [Checklist de Validación](#5-checklist-de-validación)
6. [Registro de Cambios](#6-registro-de-cambios)
7. [Troubleshooting](#7-troubleshooting)
8. [Hallazgos Adicionales y Mejoras Futuras](#8-hallazgos-adicionales-y-mejoras-futuras)

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

### Cambios Pendientes

| Fecha | Problema | Estado | Validado |
|-------|----------|--------|----------|
| - | 3. Fechas | Pendiente | ⬜ |
| - | 1. Sync Kiosco | Pendiente | ⬜ |
| - | 2. Hora Servidor | Pendiente | ⬜ |

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

## 8. Hallazgos Adicionales y Mejoras Futuras

Durante el análisis exhaustivo del código se identificaron los siguientes puntos que no son críticos pero deben considerarse para futuras mejoras.

### 8.1 Problemas Potenciales Identificados

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

### 8.2 Mejoras de Seguridad Recomendadas

| ID | Mejora | Descripción | Esfuerzo |
|----|--------|-------------|----------|
| S1 | Encriptar PIN en tránsito | Actualmente PIN viaja en JSON a Edge Function (solo protegido por HTTPS). Considerar hash adicional. | Medio |
| S2 | Expiración de PIN kiosco | PIN de kiosco sigue válido indefinidamente. Considerar expiración después de X minutos de inactividad. | Bajo |
| S3 | Validar base64 antes de envío | Prevenir potenciales inyecciones si base64 es muy grande o malformado. | Bajo |

### 8.3 Mejoras de UX Recomendadas

| ID | Mejora | Descripción | Esfuerzo |
|----|--------|-------------|----------|
| U1 | Indicador de sync en tiempo real | Mostrar claramente cuándo hay registros pendientes de sincronizar. | Bajo |
| U2 | Notificación de sync exitoso | Confirmar al usuario cuando sus fichajes se sincronizaron correctamente. | Bajo |
| U3 | Modo offline explícito | Indicar claramente cuando la app está funcionando sin conexión. | Bajo |

### 8.4 Deuda Técnica

| ID | Item | Descripción | Acción Recomendada |
|----|------|-------------|-------------------|
| D1 | Tabla sync_queue | No se usa, genera confusión | Eliminar modelo y migraciones |
| D2 | Comentarios TODO | Hay varios `// TODO:` sin resolver en el código | Revisar y resolver o eliminar |
| D3 | Console.logs | Muchos logs de debug en producción | Crear sistema de logging condicional |

### 8.5 Orden de Prioridad Post-Mejoras Actuales

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

**Última actualización:** Enero 2025
**Estado general:** Listo para iniciar cuando Julián tenga el entorno configurado
