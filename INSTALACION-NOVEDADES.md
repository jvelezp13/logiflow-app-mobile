# Instalación y Configuración - Sistema de Novedades

## ✅ Archivos Creados

### Servicios (1)
- `src/services/novedadesService.ts` ✅

### Hooks (1)
- `src/hooks/useNovedades.ts` ✅

### Componentes (5)
- `src/components/novedades/NovedadCard.tsx` ✅
- `src/components/novedades/NovedadStatusBadge.tsx` ✅
- `src/components/novedades/NovedadesList.tsx` ✅
- `src/components/novedades/TipoNovedadPicker.tsx` ✅
- `src/components/novedades/NovedadForm.tsx` ✅

### Pantallas (3)
- `src/screens/novedades/NovedadesScreen.tsx` ✅
- `src/screens/novedades/CrearNovedadScreen.tsx` ✅
- `src/screens/novedades/DetalleNovedadScreen.tsx` ✅

---

## 📦 Paso 1: Instalar Dependencias

Ejecuta los siguientes comandos en el directorio de la app móvil:

```bash
cd control-horario-mobile-app

# Dependencias de navegación
npx expo install @react-navigation/native
npx expo install @react-navigation/stack
npx expo install @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Dependencias de funcionalidad
npx expo install expo-location
npx expo install expo-image-picker
npx expo install @react-native-community/datetimepicker
npx expo install @react-native-picker/picker
npx expo install react-native-maps

# Dependencias de UI
npx expo install react-native-tab-view
npx expo install date-fns

# Gestores de gestos (requerido por navegación)
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
```

---

## 🔧 Paso 2: Configurar Navegación

### 2.1 Crear Stack Navigator de Novedades

Crea el archivo `src/navigation/NovedadesNavigator.tsx`:

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NovedadesScreen from '../screens/novedades/NovedadesScreen';
import CrearNovedadScreen from '../screens/novedades/CrearNovedadScreen';
import DetalleNovedadScreen from '../screens/novedades/DetalleNovedadScreen';

export type NovedadesStackParamList = {
  NovedadesList: undefined;
  CrearNovedad: undefined;
  DetalleNovedad: { novedadId: string };
};

const Stack = createStackNavigator<NovedadesStackParamList>();

const NovedadesNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#059669',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="NovedadesList"
        component={NovedadesScreen}
        options={{ title: 'Mis Novedades' }}
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
  );
};

export default NovedadesNavigator;
```

### 2.2 Agregar Tab en el Bottom Navigator

Modifica tu archivo principal de navegación (ej: `src/navigation/AppNavigator.tsx`):

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NovedadesNavigator from './NovedadesNavigator';
import useNovedades from '../hooks/useNovedades';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  const { estadisticas } = useNovedades();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      {/* ... tus tabs existentes ... */}

      <Tab.Screen
        name="Novedades"
        component={NovedadesNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-alert-outline"
              size={size}
              color={color}
            />
          ),
          tabBarBadge: estadisticas.pendientes > 0 ? estadisticas.pendientes : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#F59E0B',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
```

---

## 🔐 Paso 3: Configurar Permisos

### 3.1 Actualizar `app.json`

Agrega los permisos necesarios en tu `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "La aplicación necesita acceso a tu ubicación para registrar la ubicación de las novedades."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "La aplicación necesita acceso a tus fotos para adjuntar evidencia a las novedades.",
          "cameraPermission": "La aplicación necesita acceso a la cámara para tomar fotos de evidencia."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Necesitamos tu ubicación para registrar donde reportas las novedades",
        "NSCameraUsageDescription": "Necesitamos acceso a la cámara para tomar fotos de evidencia",
        "NSPhotoLibraryUsageDescription": "Necesitamos acceso a tu galería para seleccionar fotos de evidencia"
      }
    },
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

---

## 🎨 Paso 4: Configurar Reanimated (Requerido)

### 4.1 Actualizar `babel.config.js`

Agrega el plugin de Reanimated:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Debe ser el último plugin
    ],
  };
};
```

### 4.2 Reiniciar Bundler

Después de modificar `babel.config.js`, debes limpiar la caché:

```bash
npx expo start --clear
```

---

## 🧪 Paso 5: Testing

### 5.1 Verificar Compilación

```bash
# Desarrollo
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android
```

### 5.2 Test Manual del Flujo

1. **Abrir app** → Ver tab "Novedades"
2. **Click en FAB "+"** → Abrir formulario
3. **Llenar formulario:**
   - Seleccionar fecha (no futura)
   - Elegir tipo de novedad
   - Escribir motivo (>10 caracteres)
   - Opcional: agregar descripción
   - Opcional: tomar/seleccionar foto
4. **Enviar** → Loading → Success → Volver a lista
5. **Ver novedad creada** → Estado "Pendiente"
6. **Click en novedad** → Ver detalle completo
7. **Admin aprueba en web** → App recibe notificación
8. **Badge cambia a verde** → Estadísticas actualizadas

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'react-native-reanimated'"
```bash
npx expo install react-native-reanimated
# Luego reiniciar con --clear
npx expo start --clear
```

### Error: "Invariant Violation: requireNativeComponent"
```bash
# Reinstalar pods (solo iOS)
cd ios
pod install
cd ..
npx expo start --clear
```

### Error de permisos en Android
1. Desinstalar app del dispositivo/emulador
2. Reinstalar con permisos actualizados
3. Otorgar permisos manualmente en Configuración del dispositivo

### Error: "Google Maps not working"
- **Android:** Necesitas una API Key de Google Maps
  1. Obtén API Key en Google Cloud Console
  2. Agrega en `app.json`:
  ```json
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "TU_API_KEY_AQUI"
      }
    }
  }
  ```

- **iOS:** Generalmente funciona sin configuración adicional con Expo

### Imágenes no se suben a Supabase
- Verifica que el bucket `attendance_photos` existe
- Verifica permisos RLS del bucket
- Revisa que la URL de Supabase es correcta en `.env`

---

## 📱 Paso 6: Build para Producción

### Android APK

```bash
# Configurar EAS (una sola vez)
npm install -g eas-cli
eas login
eas build:configure

# Build de desarrollo (para testing interno)
eas build --platform android --profile preview

# Build de producción
eas build --platform android --profile production
```

### iOS (requiere cuenta de Apple Developer)

```bash
eas build --platform ios --profile production
```

---

## 🔗 Integración con Backend

### Verificar conexión a Supabase

El servicio `novedadesService.ts` usa la configuración de Supabase existente en:
- `src/config/supabase.ts`

Asegúrate de que tu `.env` tiene:
```
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### Testing de Realtime

1. Abre la app en un dispositivo/emulador
2. Abre la web en un navegador
3. Crea una novedad desde el móvil
4. Verifica que aparece en la web
5. Aprueba desde la web
6. Verifica que la app móvil recibe la notificación

---

## ✅ Checklist Final

Antes de considerar completa la implementación:

- [ ] Todas las dependencias instaladas sin errores
- [ ] Navegación configurada correctamente
- [ ] Permisos agregados en `app.json`
- [ ] App compila sin errores en iOS/Android
- [ ] Se pueden crear novedades
- [ ] Se pueden ver novedades en lista
- [ ] Se puede ver detalle de novedad
- [ ] Fotos se suben correctamente
- [ ] Geolocalización se captura
- [ ] Mapa se muestra correctamente
- [ ] Realtime funciona (notificaciones)
- [ ] Badges de estado muestran correctamente
- [ ] Formulario valida correctamente
- [ ] Loading states funcionan
- [ ] Error handling funciona

---

## 🎯 Próximos Pasos Opcionales

### Offline Support (Futuro)
- Implementar cola con AsyncStorage
- Sincronización automática al reconectar
- Indicador "Pendiente de sync"

### Notificaciones Push (Futuro)
- Configurar Expo Notifications
- Enviar push cuando admin aprueba/rechaza
- Badge count en ícono de app

### Analytics (Futuro)
- Trackear creación de novedades
- Trackear tasa de aprobación/rechazo
- Tiempo promedio de respuesta

---

**Última actualización:** 24 de octubre de 2025
**Estado:** Implementación completa lista para testing
**Siguiente acción:** Instalar dependencias y probar
