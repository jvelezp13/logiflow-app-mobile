# Solución de Problemas - Control Horario Mobile App

## 🔴 Error: "Invalid API key"

### Causa
El bundler de Expo está usando una versión cacheada del `.env` y no ha cargado las credenciales actualizadas de Supabase local.

### ✅ Solución (Sigue estos pasos en orden)

#### Paso 1: Detener la app
Si tienes Expo corriendo, detenlo con **Ctrl+C**

#### Paso 2: Verificar variables de entorno
```bash
cd /Users/carlosroa1/workana/julian/control-horario-mobile-app
npm run debug:env
```

Deberías ver:
```
✅ SUPABASE_URL: http://localhost:54321
✅ SUPABASE_ANON_KEY: Configurado (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...)
✅ Configurado para Supabase LOCAL
```

#### Paso 3: Limpiar cache de Expo y reiniciar
```bash
npm run start:clear
```

O manualmente:
```bash
expo start --clear
```

#### Paso 4: Recargar la app

**iOS Simulator:**
- Presiona **Cmd + D** en el simulador
- Selecciona "Reload"

O simplemente presiona **'r'** en la terminal de Expo

#### Paso 5: Intentar login nuevamente

---

## 🔴 Persiste el error después de limpiar cache

### Causa Posible 1: Estás usando Android Emulator

Android Emulator no puede conectarse a `localhost`. Necesitas usar `10.0.2.2`.

**Solución:**

1. Editar `.env`:
   ```env
   SUPABASE_URL=http://10.0.2.2:54321
   ```

2. Reiniciar con cache limpio:
   ```bash
   npm run start:clear
   ```

### Causa Posible 2: Supabase local no está corriendo

**Verificar:**
```bash
cd ../logiflow-control-horarios
supabase status
```

Si ves error, iniciar Supabase:
```bash
supabase start
```

### Causa Posible 3: Variables de entorno no se cargan

**Verificar que babel.config.js tiene el plugin:**
```javascript
[
  'module:react-native-dotenv',
  {
    moduleName: '@env',
    path: '.env',
    // ...
  },
],
```

---

## 🔴 Error: "Network request failed"

### Causa
No puede conectarse a Supabase local.

### ✅ Solución

1. **Verificar que Supabase esté corriendo:**
   ```bash
   cd ../logiflow-control-horarios
   supabase status
   ```

2. **Verificar la URL según tu plataforma:**

   | Plataforma | URL correcta |
   |------------|--------------|
   | iOS Simulator | `http://localhost:54321` |
   | Android Emulator | `http://10.0.2.2:54321` |
   | Dispositivo Físico | `http://TU_IP_LOCAL:54321` |

3. **Para dispositivo físico, obtener tu IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

4. **Actualizar `.env` con la URL correcta**

5. **Reiniciar con cache limpio:**
   ```bash
   npm run start:clear
   ```

---

## 🔴 Error: "Invalid login credentials"

### Causa
El usuario no existe en Supabase local o la contraseña es incorrecta.

### ✅ Solución

#### Opción 1: Crear usuario via Supabase Studio

1. Abrir Supabase Studio:
   ```
   http://localhost:54323
   ```

2. Ir a **Authentication** > **Users**

3. Click **Add User**

4. Ingresar:
   - Email: `test@test.com`
   - Password: `123456`

5. Crear perfil en tabla `profiles`:
   ```sql
   INSERT INTO profiles (user_id, nombre, cedula, activo, email)
   VALUES (
     'UUID_DEL_USUARIO',  -- Copiar de la tabla auth.users
     'Usuario Test',
     '123456789',
     true,
     'test@test.com'
   );
   ```

#### Opción 2: Via Web App (si tienes seeds)

```bash
cd ../logiflow-control-horarios
supabase db reset  # Esto recrea la BD con seeds si existen
```

---

## 🔴 Error: "Usuario inactivo"

### Causa
El usuario existe pero tiene `activo = false` en la tabla `profiles`.

### ✅ Solución

1. Abrir Supabase Studio:
   ```
   http://localhost:54323
   ```

2. Ir a **Table Editor** > **profiles**

3. Encontrar el usuario y cambiar `activo` a `true`

---

## 🔴 Error: "Usuario sin cédula asignada"

### Causa
El usuario existe pero no tiene `cedula` en la tabla `profiles`.

### ✅ Solución

1. Abrir Supabase Studio:
   ```
   http://localhost:54323
   ```

2. Ir a **Table Editor** > **profiles**

3. Encontrar el usuario y agregar una `cedula` (ej: "123456789")

---

## 🔧 Comandos Útiles

### Verificar configuración
```bash
npm run debug:env
```

### Limpiar cache y reiniciar
```bash
npm run start:clear
```

### Verificar compilación TypeScript
```bash
npm run tsc
```

### Ver logs de Supabase
```bash
cd ../logiflow-control-horarios
supabase status
```

### Reiniciar Supabase local
```bash
cd ../logiflow-control-horarios
supabase stop
supabase start
```

---

## 📝 Checklist de Debugging

Cuando tengas un error, sigue este checklist:

- [ ] ¿Supabase local está corriendo? (`supabase status`)
- [ ] ¿El `.env` tiene las credenciales correctas? (`npm run debug:env`)
- [ ] ¿La URL es correcta para mi plataforma? (localhost/10.0.2.2/IP)
- [ ] ¿Limpié el cache de Expo? (`npm run start:clear`)
- [ ] ¿El usuario existe en Supabase local?
- [ ] ¿El usuario tiene `activo = true`?
- [ ] ¿El usuario tiene `cedula` asignada?
- [ ] ¿Recargué la app después de cambios? (Presionar 'r')

---

## 🆘 Último Recurso

Si nada funciona:

```bash
# 1. Detener todo
# Ctrl+C en terminal de Expo

# 2. Limpiar completamente
cd /Users/carlosroa1/workana/julian/control-horario-mobile-app
rm -rf node_modules
rm -rf .expo

# 3. Reinstalar
npm install

# 4. Verificar .env
cat .env
# Debe tener SUPABASE_URL y SUPABASE_ANON_KEY correctos

# 5. Reiniciar Supabase
cd ../logiflow-control-horarios
supabase stop
supabase start

# 6. Copiar anon key de Supabase al .env mobile
supabase status | grep "anon key"
# Copiar el key al .env

# 7. Iniciar con cache limpio
cd ../control-horario-mobile-app
npm run start:clear

# 8. Presionar 'i' para iOS o 'a' para Android
```

---

## 📞 Soporte Adicional

Si el problema persiste:

1. Verificar `src/services/supabase/client.ts` tenga:
   ```typescript
   import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
   ```

2. Verificar `babel.config.js` tenga el plugin de dotenv configurado

3. Revisar la consola de Expo para errores adicionales

4. Verificar la consola del navegador (si usas web) o logs del simulador
