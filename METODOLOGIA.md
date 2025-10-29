# Metodología de Desarrollo - Control Horario Mobile App

## 📐 Principios Fundamentales

### 1. Separación de Responsabilidades

Cada archivo tiene una responsabilidad única y clara:

- **Screens:** Lógica de presentación de pantallas completas
- **Components:** Componentes reutilizables sin lógica de negocio pesada
- **Services:** Lógica de negocio, llamadas a APIs, operaciones complejas
- **Hooks:** Lógica de estado compartida y reutilizable
- **Store:** Estado global de la aplicación
- **Utils:** Funciones de utilidad puras (sin side effects)

### 2. Límites Estrictos de Líneas

**¿Por qué?** Archivos grandes son difíciles de mantener, revisar y debuggear.

| Tipo de Archivo | Máximo de Líneas | Qué Hacer si Excede |
|------------------|------------------|---------------------|
| **Screen** | 300 líneas | Extraer componentes a `components/` |
| **Component** | 200 líneas | Dividir en sub-componentes |
| **Service** | 400 líneas | Dividir en múltiples servicios |
| **Hook** | 150 líneas | Crear hooks más específicos |
| **Utils** | 200 líneas | Dividir en archivos por funcionalidad |
| **Store** | 300 líneas | Dividir en múltiples stores |

**Ejemplo Práctico:**

```typescript
// ❌ INCORRECTO - HomeScreen.tsx de 500 líneas
export const HomeScreen = () => {
  // 100 líneas de lógica
  // 200 líneas de JSX
  // 100 líneas de funciones helper
  // 100 líneas de estilos
};

// ✅ CORRECTO - Dividido en múltiples archivos
// HomeScreen.tsx (200 líneas)
import { ClockInButton } from '@components/Clock/ClockInButton';
import { ClockOutButton } from '@components/Clock/ClockOutButton';
import { useAttendance } from '@hooks/useAttendance';
import { styles } from './HomeScreen.styles';

export const HomeScreen = () => {
  const { clockIn, clockOut, loading } = useAttendance();
  // Lógica de presentación simple
  return (
    <View style={styles.container}>
      <ClockInButton onPress={clockIn} loading={loading} />
      <ClockOutButton onPress={clockOut} loading={loading} />
    </View>
  );
};

// components/Clock/ClockInButton.tsx (80 líneas)
// components/Clock/ClockOutButton.tsx (80 líneas)
// hooks/useAttendance.ts (150 líneas)
// HomeScreen.styles.ts (50 líneas)
```

### 3. Estilos Siempre Separados

**Regla de oro:** NUNCA estilos inline o en el mismo archivo del componente.

**❌ INCORRECTO:**

```typescript
// HomeScreen.tsx
export const HomeScreen = () => (
  <View style={{ flex: 1, padding: 20 }}> {/* NO! */}
    <Text style={{ fontSize: 24, color: '#333' }}>{/* NO! */}</Text>
  </View>
);

// También incorrecto
const styles = StyleSheet.create({ ... }); // NO en el mismo archivo!
```

**✅ CORRECTO:**

```typescript
// HomeScreen.tsx
import { styles } from './HomeScreen.styles';

export const HomeScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Título</Text>
  </View>
);

// HomeScreen.styles.ts
import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.text,
  },
});
```

### 4. Path Aliases Obligatorios

**Nunca uses rutas relativas largas:**

```typescript
// ❌ INCORRECTO
import { LoginScreen } from '../../../screens/auth/LoginScreen';
import { Button } from '../../../../components/ui/Button';

// ✅ CORRECTO
import { LoginScreen } from '@screens/auth/LoginScreen';
import { Button } from '@components/ui/Button';
import { supabase } from '@services/supabase/client';
import { useAuth } from '@hooks/useAuth';
import { COLORS } from '@constants/theme';
```

**Aliases disponibles:**

- `@/*` → `src/*`
- `@screens/*` → `src/screens/*`
- `@components/*` → `src/components/*`
- `@services/*` → `src/services/*`
- `@hooks/*` → `src/hooks/*`
- `@store/*` → `src/store/*`
- `@utils/*` → `src/utils/*`
- `@constants/*` → `src/constants/*`
- `@types/*` → `src/types/*`
- `@assets/*` → `src/assets/*`

### 5. TypeScript Estricto

**Reglas:**

- ✅ **SIEMPRE** tipar props de componentes
- ✅ **SIEMPRE** tipar retornos de funciones públicas
- ✅ **EVITAR** `any` (usar `unknown` si es necesario)
- ✅ **USAR** tipos de navegación proporcionados

```typescript
// ✅ CORRECTO
type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export const Button: React.FC<Props> = ({ title, onPress, disabled = false }) => {
  return <TouchableOpacity onPress={onPress} disabled={disabled}>...</TouchableOpacity>;
};

// Para screens
type Props = MainTabScreenProps<'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // ...
};
```

## 🔧 Convenciones Específicas

### Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| **Componentes/Screens** | PascalCase | `LoginScreen`, `ClockInButton` |
| **Archivos TypeScript** | Igual al export | `LoginScreen.tsx`, `ClockInButton.tsx` |
| **Archivos de estilos** | `{Nombre}.styles.ts` | `LoginScreen.styles.ts` |
| **Funciones/Variables** | camelCase | `getCurrentDate`, `isAuthenticated` |
| **Constantes** | UPPER_SNAKE_CASE | `APP_CONFIG`, `SYNC_CONFIG` |
| **Hooks** | `use{Nombre}` | `useAuth`, `useAttendance` |
| **Tipos/Interfaces** | PascalCase | `AttendanceRecord`, `SyncStatus` |
| **Servicios** | `{nombre}.service.ts` | `auth.service.ts` |

### Estructura de Archivos

**Componente típico:**

```
ClockInButton/
├── ClockInButton.tsx         # Componente principal
├── ClockInButton.styles.ts   # Estilos
└── ClockInButton.test.tsx    # Tests (opcional, Fase 10)
```

**Screen típica:**

```
home/
├── HomeScreen.tsx
└── HomeScreen.styles.ts
```

**Service típico:**

```
services/
├── supabase/
│   ├── client.ts        # Cliente singleton
│   ├── auth.service.ts  # Funciones de auth
│   ├── attendance.service.ts
│   └── types.ts         # Tipos compartidos
└── storage/
    ├── database.ts
    ├── sync.service.ts
    └── queue.service.ts
```

### Documentación con JSDoc

```typescript
/**
 * Converts time string to decimal hours
 *
 * @param time - Time in format "HH:mm:ss"
 * @returns Decimal hours (e.g., "14:30:00" -> 14.5)
 *
 * @example
 * timeToDecimal("14:30:00") // 14.5
 * timeToDecimal("08:15:30") // 8.2583
 */
export const timeToDecimal = (time: string): number => {
  const [hours, minutes, seconds = '0'] = time.split(':').map(Number);
  return hours + minutes / 60 + seconds / 3600;
};
```

## 🎨 Sistema de Diseño

### Usar Constantes del Theme

**❌ NUNCA valores mágicos:**

```typescript
// INCORRECTO
<View style={{ padding: 16, backgroundColor: '#2563eb' }}>
  <Text style={{ fontSize: 24, color: '#111827' }}>
```

**✅ SIEMPRE desde theme:**

```typescript
import { COLORS, SPACING, FONT_SIZES } from '@constants/theme';

<View style={{ padding: SPACING.lg, backgroundColor: COLORS.primary }}>
  <Text style={{ fontSize: FONT_SIZES.xxl, color: COLORS.text }}>
```

### Espaciados Disponibles

```typescript
SPACING.xs   // 4px
SPACING.sm   // 8px
SPACING.md   // 16px
SPACING.lg   // 24px
SPACING.xl   // 32px
SPACING.xxl  // 48px
```

### Colores Disponibles

```typescript
// Primary
COLORS.primary
COLORS.primaryDark
COLORS.primaryLight

// Status
COLORS.success
COLORS.error
COLORS.warning
COLORS.info

// Text
COLORS.text
COLORS.textSecondary
COLORS.textTertiary
COLORS.textInverse

// Attendance specific
COLORS.clockIn   // Verde
COLORS.clockOut  // Rojo
```

## 📦 Gestión de Estado

### Cuándo Usar Cada Solución

**useState (Local):**
- Estado de UI simple (mostrar/ocultar modal)
- Estado específico de un componente
- No se comparte entre componentes

```typescript
const [loading, setLoading] = useState(false);
const [modalVisible, setModalVisible] = useState(false);
```

**Zustand (Global):**
- Estado de autenticación
- Estado de sincronización
- Configuración de usuario
- Datos que se comparten entre múltiples screens

```typescript
// store/authStore.ts
import { create } from 'zustand';

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => { /* ... */ },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

**WatermelonDB (Persistente):**
- Registros de asistencia
- Cola de sincronización
- Datos que deben sobrevivir al cierre de la app
- Datos offline

## 🔄 Flujo de Trabajo Offline-First

### Principios

1. **Guardar local primero**
2. **UI optimista** (mostrar éxito inmediatamente)
3. **Sync en background**
4. **Indicadores claros** de estado de sync

### Ejemplo de Implementación

```typescript
// 1. Usuario hace clock-in
const handleClockIn = async (photo: string, observations: string) => {
  try {
    // Guardar local PRIMERO
    const localRecord = await saveToLocal({
      type: 'clock_in',
      timestamp: Date.now(),
      photo,
      observations,
      syncStatus: 'pending',
    });

    // Mostrar éxito al usuario INMEDIATAMENTE
    Alert.alert('Éxito', 'Marcaje registrado');

    // Agregar a cola de sync
    await addToSyncQueue(localRecord.id);

    // Intentar sync si hay conexión
    if (await isOnline()) {
      syncInBackground();
    }
  } catch (error) {
    // Solo errores locales llegan aquí
    Alert.alert('Error', 'No se pudo guardar el marcaje');
  }
};

// 2. Sync en background
const syncInBackground = async () => {
  const pending = await getPendingRecords();

  for (const record of pending) {
    try {
      // Subir foto
      const photoUrl = await uploadPhotoToSupabase(record.photo);

      // Insertar registro
      await insertAttendanceRecord({
        ...record,
        photoUrl,
      });

      // Marcar como sincronizado
      await markAsSynced(record.id);
    } catch (error) {
      // Marcar error pero no fallar el proceso
      await markAsSyncError(record.id, error.message);
    }
  }
};
```

## 🧪 Debugging y Logging

### Console Logs

```typescript
// ❌ NO en producción
console.log('Debug info');

// ✅ CORRECTO - Solo en desarrollo
if (__DEV__) {
  console.log('[Auth] Login attempt:', email);
}

// ✅ Para errores importantes (siempre)
console.error('[Sync] Failed to upload photo:', error);
```

### ESLint Rules

Ya configurado en `.eslintrc.js`:

```javascript
rules: {
  'no-console': ['warn', { allow: ['warn', 'error'] }],
}
```

## 📱 Testing (Fase 10)

### Criterios de Aceptación

**Cada feature debe:**
- ✅ Funcionar online
- ✅ Funcionar offline
- ✅ Manejar errores gracefully
- ✅ Mostrar estados de loading
- ✅ Validar inputs del usuario
- ✅ Ser accesible (a11y básica)

### Checklist Pre-Build

- [ ] Todos los archivos < 500 líneas
- [ ] Todos los estilos separados
- [ ] Todos los imports usan path aliases
- [ ] Todos los tipos definidos
- [ ] Sin console.logs en producción
- [ ] Sin valores hardcodeados (usar theme)
- [ ] Todas las funciones públicas documentadas
- [ ] Manejo de errores implementado
- [ ] Estados de loading implementados

## 🎯 Buenas Prácticas

### Do's ✅

- Usar theme constants
- Separar estilos
- Documentar funciones complejas
- Manejar estados de loading
- Manejar errores
- Validar inputs
- Usar TypeScript estricto
- Mantener componentes pequeños
- Reutilizar componentes
- Seguir la estructura de directorios

### Don'ts ❌

- Estilos inline
- Valores mágicos hardcodeados
- Archivos > 500 líneas
- Uso de `any` en TypeScript
- Console.logs en producción
- Imports relativos largos
- Componentes monolíticos
- Lógica de negocio en screens
- Mezclar responsabilidades

## 📚 Recursos

- **React Native Docs:** https://reactnative.dev/
- **Expo Docs:** https://docs.expo.dev/
- **React Navigation:** https://reactnavigation.org/
- **Supabase Docs:** https://supabase.com/docs
- **TypeScript:** https://www.typescriptlang.org/

---

**Este documento es la biblia del proyecto. Síguelo religiosamente. 📖**
