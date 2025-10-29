# Conexión a Supabase Local

## 🎯 Configuración para Desarrollo Local

La app mobile está configurada por defecto para conectarse a **Supabase local** en desarrollo.

## ✅ Pre-requisitos

1. **Supabase local debe estar corriendo:**
   ```bash
   cd ../logiflow-control-horarios
   supabase start
   ```

2. **Verificar que está corriendo:**
   ```bash
   supabase status
   ```

   Deberías ver:
   ```
   API URL: http://127.0.0.1:54321
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 📱 Configuración según Plataforma

### iOS Simulator ✅ (Recomendado para desarrollo)

**Configuración actual en `.env`:**
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

✅ **Ya está configurado** - No necesitas cambiar nada.

**Iniciar app:**
```bash
npm start
# Presiona 'i' para iOS
```

---

### Android Emulator

Android Emulator usa una red virtual donde `localhost` no funciona. Debes usar `10.0.2.2` que mapea al `localhost` del host.

**Modificar `.env`:**
```env
SUPABASE_URL=http://10.0.2.2:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**Iniciar app:**
```bash
npm start
# Presiona 'a' para Android
```

**⚠️ Nota:** Después de cambiar `.env`, reinicia el bundler de Expo.

---

### Dispositivo Físico (iPhone/Android)

Para probar en un dispositivo físico, necesitas la **IP local de tu Mac**.

**1. Obtener tu IP local:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Ejemplo de salida:
```
inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```

Tu IP es: `192.168.1.100` (la tuya será diferente)

**2. Modificar `.env`:**
```env
SUPABASE_URL=http://192.168.1.100:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**3. Asegurarse de que el dispositivo esté en la misma red WiFi**

**4. Iniciar app y escanear QR:**
```bash
npm start
```

---

## 🔄 Cambiar entre Local y Producción

### Para Desarrollo Local (Default):

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Para Producción:

```env
SUPABASE_URL=https://efwzahzuqghcfscsncrg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmd3phaHp1cWdoY2ZzY3NuY3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwMDQyNDksImV4cCI6MjAzNzU4MDI0OX0.wXb0v_1YT3Q4xKl1K2k3VZ3z5Z7dQ5Z6k3Z4Z5Z6Z7Z
```

**Importante:** Reiniciar el servidor de desarrollo después de cambiar `.env`.

---

## 🔍 Solución de Problemas

### Error: "Network request failed"

**Causa:** No puede conectarse a Supabase local.

**Soluciones:**

1. **Verificar que Supabase esté corriendo:**
   ```bash
   supabase status
   ```

2. **Verificar que la URL en `.env` sea correcta según tu plataforma:**
   - iOS Simulator: `localhost`
   - Android Emulator: `10.0.2.2`
   - Dispositivo físico: Tu IP local

3. **Reiniciar el bundler de Expo:**
   ```bash
   # Detener con Ctrl+C
   npm start
   ```

4. **Clear cache de Expo:**
   ```bash
   npm start -- --clear
   ```

### Error: "Invalid JWT"

**Causa:** La anon key no coincide con la instancia de Supabase.

**Solución:**
```bash
supabase status | grep "anon key"
```

Copiar la key mostrada al `.env`.

### La app no actualiza después de cambiar `.env`

**Solución:**
1. Detener Expo (Ctrl+C)
2. Modificar `.env`
3. Reiniciar: `npm start -- --clear`

---

## 📊 Verificar Conexión

Una vez que la app esté corriendo, intenta hacer login:

**Usuario de prueba (si existe en Supabase local):**
- Email: tu-email@test.com
- Password: tu-password

Si el login funciona, la conexión está correcta ✅

---

## 🔐 Usuarios de Prueba

Para crear un usuario de prueba en Supabase local:

```bash
cd ../logiflow-control-horarios
supabase db reset  # Esto recrea la BD con las seeds si existen
```

O crear manualmente en Supabase Studio:
```
http://localhost:54323
```

---

## 🚀 Quick Start

```bash
# 1. Asegurarse de que Supabase local esté corriendo
cd ../logiflow-control-horarios
supabase start

# 2. Volver a la app mobile
cd ../control-horario-mobile-app

# 3. Iniciar la app
npm start

# 4. Para iOS (usa localhost - default)
# Presiona 'i'

# 5. Para Android (cambiar a 10.0.2.2 primero)
# Editar .env, luego presionar 'a'
```

---

**💡 Tip:** Usa iOS Simulator durante el desarrollo por simplicidad. Solo cambia a Android o dispositivo físico cuando necesites probar funcionalidades específicas de esas plataformas.
