# LogiFlow Marcaje - Mobile App

Aplicación móvil React Native para registro de asistencia de empleados con funcionalidad offline-first.

## Funcionalidades

- Marcaje de entrada/salida con foto selfie
- Funcionamiento offline con sincronización automática
- Modo Kiosco para dispositivos compartidos (login con PIN)
- Historial de marcajes
- Solicitud de novedades/ajustes
- Visualización de cierres semanales
- Notificaciones de recordatorio

## 📱 Stack Tecnológico

- **Framework:** React Native con Expo SDK 54
- **Lenguaje:** TypeScript 5.0+
- **Navegación:** React Navigation 6 (Stack + Bottom Tabs)
- **Backend:** Supabase (mismo que logiflow-control-horarios)
- **Estado:** Zustand + React Context
- **Almacenamiento Offline:** WatermelonDB (SQLite)
- **Cámara:** expo-camera
- **Notificaciones:** expo-notifications
- **Utilidades:** date-fns, NetInfo

## 🏗️ Arquitectura

### Estructura de Directorios

```
src/
├── screens/              # Pantallas (max 300 líneas c/u)
│   ├── auth/            # Login
│   ├── home/            # Marcaje principal
│   ├── history/         # Historial
│   └── settings/        # Configuración
├── components/          # Componentes reutilizables (max 200 líneas)
│   ├── ui/             # Botones, inputs, cards
│   ├── Camera/         # Captura de fotos
│   └── Clock/          # Botones de marcaje
├── navigation/          # Configuración de navegación
├── services/            # Lógica de negocio (max 400 líneas)
│   ├── supabase/       # Cliente y autenticación
│   ├── storage/        # Base de datos local + sync
│   └── notifications/  # Programación de alertas
├── hooks/               # Custom hooks (max 150 líneas)
├── store/               # Estado global (max 300 líneas)
├── utils/               # Utilidades (max 200 líneas)
├── constants/           # Configuración y temas
├── types/               # Tipos TypeScript
└── assets/              # Imágenes, fuentes, íconos
```

### Principios de Diseño

- ✅ **Offline-first:** Funciona sin conexión
- ✅ **Máximo 500 líneas por archivo**
- ✅ **Estilos separados:** Archivos `.styles.ts` independientes
- ✅ **Type-safe:** TypeScript estricto
- ✅ **Path aliases:** `@screens`, `@components`, etc.

## 🚀 Comandos Disponibles

### Desarrollo
```bash
# Iniciar servidor de desarrollo
npm start

# Android
npm run android

# iOS
npm run ios

# Web (para testing)
npm run web
```

### Linting
```bash
npm run lint
```

### Variables de Entorno
```bash
# Copiar ejemplo y configurar
cp .env.example .env
```

## 🔧 Configuración Inicial

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Supabase

**⚠️ IMPORTANTE:** La app está configurada por defecto para **Supabase LOCAL** (desarrollo).

#### Opción A: Desarrollo Local (Recomendado) ✅

1. **Iniciar Supabase local:**
   ```bash
   cd ../logiflow-control-horarios
   supabase start
   ```

2. **El archivo `.env` ya está configurado para local:**
   ```env
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Plataformas:**
   - **iOS Simulator**: ✅ Funciona con `localhost` (sin cambios)
   - **Android Emulator**: Cambiar a `http://10.0.2.2:54321`
   - **Dispositivo físico**: Cambiar a tu IP local (ej: `http://192.168.1.x:54321`)

**📚 Ver guía completa:** [SUPABASE-LOCAL.md](./SUPABASE-LOCAL.md)

#### Opción B: Producción

Editar `.env` y descomentar las líneas de producción:

```env
SUPABASE_URL=https://efwzahzuqghcfscsncrg.supabase.co
SUPABASE_ANON_KEY=tu-production-key-aqui
```

### 3. Ejecutar App

```bash
npm start
# Para iOS: presiona 'i'
# Para Android: presiona 'a'
```

## 📊 Estado del Proyecto

### ✅ Fase 1: Configuración y Base (COMPLETADA)

- [x] Proyecto Expo inicializado con TypeScript
- [x] Estructura de directorios completa
- [x] Dependencias instaladas (Supabase, Zustand, React Navigation, etc.)
- [x] TypeScript y ESLint configurados
- [x] Path aliases configurados
- [x] Babel con soporte para dotenv
- [x] Supabase client configurado
- [x] Sistema de temas y constantes
- [x] Navegación básica (Auth + Main stacks)
- [x] Pantallas base creadas (Login, Home, History, Settings)
- [x] Utilidades de fecha (date-fns)

### 🔄 Próximas Fases

**Fase 2: Autenticación (1-2 días)**
- [ ] Diseño completo UI de Login
- [ ] Servicio de autenticación con Supabase
- [ ] Store de autenticación con Zustand
- [ ] Persistencia de sesión
- [ ] Manejo de errores y estados de carga

**Fase 3: Captura de Cámara (1 día)**
- [ ] Componente CameraCapture
- [ ] Permisos de cámara
- [ ] Compresión de imágenes
- [ ] Hook useCamera

**Fase 4: Almacenamiento Offline (2 días)**
- [ ] Configuración WatermelonDB
- [ ] Modelos (Attendance, SyncQueue)
- [ ] Operaciones CRUD locales

**Fase 5: Marcaje de Asistencia (2-3 días)**
- [ ] HomeScreen con botones Clock In/Out
- [ ] Servicio de asistencia
- [ ] Integración con cámara
- [ ] Campo de observaciones
- [ ] Guardar en BD local + cola de sync

**Fase 6: Sincronización (2-3 días)**
- [ ] Servicio de sincronización
- [ ] Detector de conectividad
- [ ] Cola con prioridad FIFO
- [ ] Subida de fotos a Supabase Storage
- [ ] Inserción en horarios_registros_diarios
- [ ] Reintentos con exponential backoff

**Fase 7: Historial (1-2 días)**
- [ ] HistoryScreen con lista
- [ ] Filtros (fecha, estado sync)
- [ ] Ver fotos
- [ ] Pull to refresh

**Fase 8: Notificaciones (1-2 días)**
- [ ] Permisos
- [ ] Scheduler de notificaciones
- [ ] Configuración en Settings

**Fase 9: Settings (1 día)**
- [ ] Diseño Settings
- [ ] Cerrar sesión
- [ ] Ver perfil
- [ ] Configurar notificaciones

**Fase 10: Testing y Build (2 días)**
- [ ] Testing manual completo
- [ ] Pruebas offline/online
- [ ] Build APK con EAS
- [ ] Documentación de usuario

## 📐 Metodología de Desarrollo

### Límites de Líneas por Archivo

| Tipo | Máximo |
|------|--------|
| Screens | 300 líneas |
| Components | 200 líneas |
| Services | 400 líneas |
| Hooks | 150 líneas |
| Utils | 200 líneas |
| Stores | 300 líneas |

### Separación de Estilos

**✅ CORRECTO:**
```typescript
// HomeScreen.tsx
import { styles } from './HomeScreen.styles';

// HomeScreen.styles.ts
export const styles = StyleSheet.create({ ... });
```

**❌ INCORRECTO:**
```typescript
// HomeScreen.tsx
const styles = StyleSheet.create({ ... }); // NO HACER
```

### Path Aliases

```typescript
import { LoginScreen } from '@screens/auth/LoginScreen';
import { Button } from '@components/ui/Button';
import { supabase } from '@services/supabase/client';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
```

## 🔗 Integración con Backend

Comparte el backend de Supabase con `logiflow-control-horarios`.

### Tablas Principales

- **profiles:** Información de empleados
- **horarios_registros_diarios:** Registros de asistencia
- **Supabase Storage:** Fotos de marcajes

### Flujo de Sincronización

```
1. Usuario marca entrada/salida (offline)
   ↓
2. Guardar en WatermelonDB local
   ↓
3. Agregar a cola de sincronización
   ↓
4. Detectar conectividad
   ↓
5. Subir foto a Supabase Storage
   ↓
6. Insertar registro en horarios_registros_diarios
   ↓
7. Marcar como sincronizado en local
```

## 🎨 Sistema de Temas

Todos los colores, espaciados y estilos están centralizados en `src/constants/theme.ts`:

```typescript
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from '@constants/theme';
```

## 📝 Convenciones de Código

- **Componentes:** PascalCase (`LoginScreen`, `CameraCapture`)
- **Archivos:** Igual al componente (`LoginScreen.tsx`)
- **Funciones/Variables:** camelCase (`getCurrentDate`, `isAuthenticated`)
- **Constantes:** UPPER_SNAKE_CASE (`APP_CONFIG`, `COLORS`)
- **Tipos:** PascalCase (`AttendanceRecord`, `SyncStatus`)

## 📄 Documentación

- `README.md`: Guía principal del proyecto
- `SUPABASE-LOCAL.md`: Guía de conexión a Supabase local
- `METODOLOGIA.md`: Metodología de desarrollo y convenciones
- `SPEC.txt`: Especificación original del proyecto
- JSDoc en funciones públicas

## 🤝 Contribución

Este proyecto sigue la metodología de desarrollo definida en el plan inicial:
- Máximo 500 líneas por archivo
- Estilos separados obligatorios
- TypeScript estricto
- Offline-first architecture

## 📞 Soporte

Para dudas sobre el proyecto, revisar:
1. Este README
2. Documentación en `../CLAUDE.md` (raíz del workspace)
3. Especificación en `SPEC.txt`

---

**Version:** 2.0.0
**Estado:** Produccion
**Backend:** Supabase
