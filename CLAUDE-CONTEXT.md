# LogiFlow Marcaje - Contexto para Claude

**Última actualización:** 5 de Enero 2026 (Sesión 2)
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
| `horarios_alertas_gestion` | Alertas para admin |
| `horarios_asignaciones_diarias` | Asignación de horarios |
| `horarios_configuracion_descansos` | Config de descansos |
| `horarios_cierres_automaticos_log` | Log de cierres automáticos |
| `horarios_sync_control` | Control de sincronización ETL |

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

---

## Pendientes Conocidos

(Sin pendientes actualmente)

---

## Historial de Sesiones

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
