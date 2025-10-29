# Implementación de Sistema de Novedades - App Móvil

## ✅ Progreso Actual (Paso 3 - Parcial)

### Archivos Completados:

#### 1. **Servicio de Novedades** (`src/services/novedadesService.ts`)
**Funcionalidades implementadas:**
- ✅ `obtenerUbicacionActual()` - Captura geolocalización con permisos
- ✅ `subirFotoEvidencia(userId, fotoUri)` - Upload a Supabase Storage
- ✅ `crearNovedad(data)` - Crear con datos completos del perfil
- ✅ `obtenerNovedades(filtroEstado?)` - Listar con filtro opcional
- ✅ `obtenerNovedadPorId(id)` - Consulta individual
- ✅ `obtenerEstadisticas()` - Contadores por estado
- ✅ `suscribirACambios(userId, callback)` - Realtime subscriptions
- ✅ `obtenerUsuarioActual()` - Helper para auth

**Tipos exportados:**
```typescript
- NovedadData
- TipoNovedad
- EstadoNovedad
- Novedad
- TIPOS_NOVEDAD_LABELS
```

#### 2. **Hook Personalizado** (`src/hooks/useNovedades.ts`)
**Funcionalidades implementadas:**
- ✅ `cargarNovedades(filtroEstado?)` - Carga con loading/error
- ✅ `cargarEstadisticas()` - Actualiza contadores
- ✅ `crearNovedad(data)` - Con foto, ubicación y validación
- ✅ `obtenerNovedadPorId(id)` - Consulta específica
- ✅ `filtrarPorEstado(estado?)` - Filtro local
- ✅ **Realtime:** Subscription automática a cambios
- ✅ **Notificaciones:** Alert cuando estado cambia
- ✅ **Auto-refresh:** Refresca stats después de updates

**Estado manejado:**
```typescript
{
  novedades: Novedad[],
  loading: boolean,
  error: string | null,
  estadisticas: { pendientes, aprobadas, rechazadas, total }
}
```

---

## 📋 Pendiente de Implementación

### Componentes a Crear:

#### 1. **NovedadCard.tsx** (`src/components/novedades/`)
```typescript
interface Props {
  novedad: Novedad;
  onPress: () => void;
}

// Debe mostrar:
- Fecha de la novedad
- Tipo (con badge de color)
- Motivo (truncado)
- Estado (badge: amarillo/verde/rojo)
- Timestamp de creación
```

#### 2. **NovedadesList.tsx**
```typescript
interface Props {
  novedades: Novedad[];
  onNovedadPress: (novedad: Novedad) => void;
  filtroEstado?: EstadoNovedad;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Debe usar:
- FlatList con pull-to-refresh
- NovedadCard como renderItem
- EmptyState cuando no hay datos
- Loading skeleton
```

#### 3. **NovedadForm.tsx**
```typescript
interface Props {
  onSubmit: (data: FormData) => Promise<void>;
  loading?: boolean;
}

// Debe incluir:
- DatePicker (fecha) - react-native-community/datetimepicker
- Dropdown (tipo_novedad) - @react-native-picker/picker
- TextInput (motivo) - multiline, validación 10-500 chars
- TextInput (descripción) - multiline, opcional
- Botón cámara - expo-camera o expo-image-picker
- Preview de foto seleccionada
- Indicador de geolocalización capturada
- Validaciones en tiempo real
- Botón Submit con loading state
```

#### 4. **TipoNovedadPicker.tsx**
```typescript
// Picker especializado con iconos por tipo:
- entrada_tardia: Clock icon
- salida_temprana: Clock icon
- ausencia: UserX icon
- incapacidad: Heart icon
- permiso: FileCheck icon
- otro: FileQuestion icon
```

#### 5. **NovedadStatusBadge.tsx**
```typescript
interface Props {
  estado: EstadoNovedad;
}

// Colores:
- pendiente: #FFA500 (naranja)
- aprobada: #22C55E (verde)
- rechazada: #EF4444 (rojo)
```

---

### Pantallas a Crear:

#### 1. **NovedadesScreen.tsx** (`src/screens/novedades/`)
```typescript
// Layout:
- Tabs horizontales: Todas | Pendientes | Aprobadas | Rechazadas
- Cards de estadísticas (opcional, espacio limitado)
- NovedadesList con filtro según tab activo
- FAB "+" para crear nueva novedad
- Pull to refresh
```

#### 2. **CrearNovedadScreen.tsx**
```typescript
// Layout:
- Header con título "Reportar Novedad"
- NovedadForm
- Botón "Cancelar" y "Enviar"
- Loading overlay durante creación
- Navegación de regreso al confirmar
```

#### 3. **DetalleNovedadScreen.tsx**
```typescript
// Layout:
- Toda la información de la novedad
- Foto de evidencia (si existe) - zoom habilitado
- Mapa con ubicación (MapView de react-native-maps)
- Estado destacado con badge grande
- Comentarios del administrador (si existen)
- Timestamp de creación
- Si aprobada/rechazada: timestamp de revisión
```

---

### Navegación a Configurar:

#### Stack Navigator:
```typescript
<Stack.Navigator>
  <Stack.Screen
    name="NovedadesList"
    component={NovedadesScreen}
    options={{ title: 'Novedades' }}
  />
  <Stack.Screen
    name="CrearNovedad"
    component={CrearNovedadScreen}
    options={{ title: 'Reportar Novedad' }}
  />
  <Stack.Screen
    name="DetalleNovedad"
    component={DetalleNovedadScreen}
    options={{ title: 'Detalle de Novedad' }}
  />
</Stack.Navigator>
```

#### Bottom Tab:
```typescript
<Tab.Screen
  name="Novedades"
  component={NovedadesStack}
  options={{
    tabBarIcon: ({ color, size }) => (
      <MaterialCommunityIcons
        name="file-document-alert-outline"
        size={size}
        color={color}
      />
    ),
    tabBarBadge: estadisticas.pendientes > 0 ? estadisticas.pendientes : undefined
  }}
/>
```

---

### Dependencias Necesarias:

```bash
# Instalaciones requeridas
npx expo install expo-location
npx expo install expo-image-picker
npx expo install @react-native-community/datetimepicker
npx expo install @react-native-picker/picker
npx expo install react-native-maps
npx expo install @react-navigation/native
npx expo install @react-navigation/stack
npx expo install @react-navigation/bottom-tabs
```

---

### Offline Support (Opcional - Futuro):

#### AsyncStorage Queue:
```typescript
// src/services/offlineQueue.ts
interface QueueItem {
  id: string;
  type: 'create_novedad';
  data: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

// Funciones:
- addToQueue(item)
- processQueue()
- clearSyncedItems()
```

---

## 🧪 Flujo de Testing

### 1. Crear Novedad:
```
Usuario abre app → Tab "Novedades" → FAB "+" →
Selecciona fecha → Elige tipo → Escribe motivo (>10 chars) →
Opcional: toma foto → Click "Enviar" →
Loading → Success → Navega a lista → Ve novedad con estado "pendiente"
```

### 2. Recibir Aprobación:
```
Admin web aprueba → Realtime update →
Alert automático en app: "Tu novedad ha sido aprobada" →
Badge cambia a verde → Estadísticas actualizadas
```

### 3. Ver Detalle:
```
Click en novedad → Modal/Screen con todos los detalles →
Ve foto, mapa, comentarios del admin
```

---

## 📊 Estado Actual del Proyecto

### Completado (Web + Backend):
- ✅ Tabla `horarios_novedades` en Supabase
- ✅ RLS policies configuradas
- ✅ Tipos TypeScript generados
- ✅ Hook web `useNovedades.ts`
- ✅ Componentes web completos
- ✅ Página web `/novedades`
- ✅ Navegación web actualizada

### Completado (Móvil - Parcial):
- ✅ Servicio `novedadesService.ts`
- ✅ Hook `useNovedades.ts`

### Pendiente (Móvil):
- ⏳ 5 componentes visuales
- ⏳ 3 pantallas principales
- ⏳ Configuración de navegación
- ⏳ Instalación de dependencias
- ⏳ Testing E2E

---

## 🎯 Próximos Pasos Recomendados

### Opción A: Continuar con Móvil (Implementación Completa)
1. Crear los 5 componentes visuales
2. Crear las 3 pantallas
3. Configurar navegación
4. Instalar dependencias
5. Testing

**Tiempo estimado:** 2-3 horas de desarrollo

### Opción B: Testing Web Primero
1. Probar interfaz web creada
2. Crear novedades de prueba manualmente en Supabase
3. Verificar flujo de aprobación/rechazo
4. Validar realtime (abrir 2 navegadores)

**Tiempo estimado:** 30 minutos

### Opción C: Deploy Incremental
1. Hacer commit de cambios actuales
2. Deploy de web a producción (Vercel)
3. Deploy de migración a Supabase remoto (`supabase db push`)
4. Continuar con móvil después

---

## 📝 Notas Importantes

1. **Supabase Local:** Todo está probado con Supabase local. **NO** hacer push a producción hasta testear completamente.

2. **Tipos TypeScript:** Los tipos están sincronizados entre web y móvil gracias a la generación automática.

3. **Permisos:** La app móvil requiere permisos de:
   - Ubicación (Location)
   - Cámara (ImagePicker)
   - Almacenamiento (para fotos)

4. **Realtime:** La suscripción a cambios ya está implementada. Cuando admin aprueba/rechaza, el usuario recibe notificación automática.

5. **Offline:** El código base está listo para agregar queue offline (AsyncStorage) en el futuro.

---

## 🔗 Enlaces Útiles

- **Documentación Expo Location:** https://docs.expo.dev/versions/latest/sdk/location/
- **Documentación Expo ImagePicker:** https://docs.expo.dev/versions/latest/sdk/imagepicker/
- **React Navigation:** https://reactnavigation.org/docs/getting-started/
- **Supabase Realtime:** https://supabase.com/docs/guides/realtime

---

**Última actualización:** 24 de octubre de 2025
**Estado:** Paso 3 parcialmente completado (2/6 tareas)
**Siguiente acción:** Decidir entre Opción A, B o C
