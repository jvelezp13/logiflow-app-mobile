# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

App móvil React Native (Expo SDK 54) para registro de asistencia de empleados. Funciona offline-first con sincronización a Supabase.

**Modos de operación:**
- **Modo Normal:** Usuario autenticado con email/contraseña
- **Modo Kiosco:** Múltiples usuarios con PIN en dispositivo compartido

## Comandos de Desarrollo

```bash
# Desarrollo
npm run android              # Compilar y ejecutar en Android
npm run ios                  # Compilar y ejecutar en iOS
npm run start:clear          # Limpiar cache de Metro

# Verificación
npx tsc --noEmit             # Verificar errores TypeScript
npm run lint                 # ESLint

# Build producción
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk

# Dispositivo Android
~/Library/Android/sdk/platform-tools/adb devices    # Ver dispositivos
~/Library/Android/sdk/platform-tools/adb logcat -d  # Ver logs
```

## Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| React Native + Expo SDK 54 | Framework móvil |
| TypeScript | Lenguaje |
| Supabase | Backend (auth, DB, storage) |
| WatermelonDB | Base de datos local SQLite (offline-first) |
| Zustand | Estado global |
| React Navigation 7 | Navegación (Stack + Bottom Tabs) |

## Arquitectura

```
src/
├── screens/           # Pantallas de la app
│   ├── auth/         # LoginScreen
│   ├── main/         # HomeScreen, HistoryScreen, SettingsScreen
│   ├── kiosk/        # PinLoginScreen, KioskHomeScreen
│   ├── novedades/    # Solicitudes de ajuste de marcaje
│   └── cierres/      # Cierres semanales
├── components/        # Componentes reutilizables
│   ├── ui/           # Button, Input (primitivos)
│   ├── Camera/       # CameraCapture (selfie para marcaje)
│   ├── cierres/      # CierreCard, CierresList
│   └── novedades/    # NovedadCard, NovedadesList
├── services/          # Lógica de negocio
│   ├── attendance/   # attendance.service.ts - clock in/out
│   ├── storage/      # WatermelonDB (schema, models, migrations)
│   ├── sync/         # sync.service.ts - sincronización con Supabase
│   ├── supabase/     # client.ts, auth.service.ts
│   └── time/         # timeValidation.service.ts
├── hooks/             # useAuth, useAttendanceRecords, useCierres, etc.
├── store/             # authStore.ts (Zustand)
├── navigation/        # Navigators (Root, Auth, Main, Kiosk)
├── types/             # TypeScript types
└── constants/         # theme.ts, config.ts
```

### Flujo de Datos Principal

```
Marcaje (clock in/out)
       ↓
WatermelonDB local (status: 'pending')
       ↓
SyncService detecta conexión
       ↓
Upload foto → Supabase Storage
       ↓
Insert registro → horarios_registros_diarios
       ↓
Update local (status: 'synced')
```

### Path Aliases

```typescript
import { Button } from '@components/ui/Button';
import { supabase } from '@services/supabase/client';
import { useAuth } from '@hooks/useAuth';
import { COLORS, SPACING } from '@constants/theme';
```

## Base de Datos

### Supabase (Remota)

**IMPORTANTE:** Esta DB es compartida con Web Admin (`~/CascadeProjects/logiflow-admin-nextjs`). Verificar impacto en ambos proyectos antes de modificar.

| Tabla | Uso en App |
|-------|------------|
| `profiles` | Usuarios (nombre, cédula, PIN) |
| `user_roles` | Roles de usuario |
| `horarios_registros_diarios` | Marcajes entrada/salida |
| `horarios_novedades` | Solicitudes de ajuste |
| `configuracion` | Límites por rol (max_horas_dia, minutos_descanso) |
| `cierres_semanales` | Cierres publicados por admin |

### WatermelonDB (Local)

Schema en `src/services/storage/schema.ts`:
- `attendance_records`: Marcajes locales con status de sincronización
- Model: `src/services/storage/models/AttendanceRecord.ts`

## Decisiones de Diseño Clave

1. **Offline-first:** Marcajes se guardan localmente primero, se sincronizan cuando hay conexión
2. **Validación de hora:** Marcaje rechazado si hora del dispositivo difiere >5min del servidor
3. **Sin marcaje de pausas:** Descanso pre-configurado por rol, se resta automáticamente
4. **Pull optimizado:** Historial limitado a 30 días, limpieza automática de registros antiguos
5. **Sesión offline:** Si no hay conexión, usa cache de AsyncStorage para mantener sesión
6. **Timestamps UTC:** DB almacena UTC, conversión a hora local solo en UI

## MCP Supabase

Configurado en `.mcp.json` para ejecutar queries SQL directamente.

```bash
# Listar tablas
mcp__supabase__list_tables

# Ejecutar SQL
mcp__supabase__execute_sql query="SELECT * FROM profiles LIMIT 5"
```

**URL Proyecto:** `https://xzrhjeghgrjlhihspdcp.supabase.co`

## Protocolo de Modificación de BD

Antes de modificar cualquier tabla:

1. Buscar uso en App Móvil: `grep -r "nombre_columna" src/`
2. Buscar uso en Web Admin: `grep -r "nombre_columna" ~/CascadeProjects/logiflow-admin-nextjs/src`
3. Analizar impacto en ambos proyectos
4. Solo proceder si no rompe ninguno

## Convenciones de Código

- **Estilos separados:** `ComponentName.styles.ts` junto al componente
- **Máximo líneas:** Screens 300, Components 200, Services 400, Hooks 150
- **Memoización:** Usar `React.memo` en componentes de listas (AttendanceCard, CierreCard)
- **Formato hora:** 12h con AM/PM en toda la UI

## Proyectos Relacionados

| Proyecto | Ruta | Estado |
|----------|------|--------|
| **App Móvil** | `~/CascadeProjects/logiflow-app-mobile` | Este proyecto |
| **Web Admin Next.js** | `~/CascadeProjects/logiflow-admin-nextjs` | Activo |
| **Web Admin v2** | `~/CascadeProjects/logiflow-control-horarios-v2` | Congelado |

## Usuario

Julián no es programador. Claude es el ejecutor técnico. Siempre:
- Explicar cambios antes de implementar
- Presentar opciones cuando hay decisiones
- Validar en dispositivo antes de continuar
- No romper App NI Web Admin al modificar DB
