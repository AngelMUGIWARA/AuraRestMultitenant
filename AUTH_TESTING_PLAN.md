# Plan de Pruebas de Autenticación y Autorización

## Roles del Sistema

El proyecto define 6 roles en `@maison/types`:
- **OWNER**: Propietario del tenant (acceso limitado a funciones de negocio)
- **SUPER_ADMIN**: Administrador del sistema (acceso completo a /admin/*)
- **MANAGER**: Gerente de operaciones
- **WAITER**: Mesero / Personal de contacto con cliente
- **CASHIER**: Cajero / Personal de caja
- **KITCHEN_STAFF**: Personal de cocina

## Rutas y Permisos por Rol

### OWNER (`/dashboard`, `/reportes`, etc.)
| Ruta | OWNER | SUPER_ADMIN | MANAGER | WAITER | CASHIER | KITCHEN_STAFF |
|------|-------|-----------|---------|--------|---------|---------------|
| `/dashboard` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/reportes` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/reservaciones` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/sucursales` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/settings` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/inventario` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### ADMIN (`/admin/*`)
| Ruta | OWNER | SUPER_ADMIN | MANAGER | WAITER | CASHIER | KITCHEN_STAFF |
|------|-------|-----------|---------|--------|---------|---------------|
| `/admin/dashboard` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/users` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/settings` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/dashboard-admin` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Operaciones
| Ruta | Roles Permitidos |
|------|------------------|
| `/cashier` | CASHIER, SUPER_ADMIN |
| `/kitchen`, `/chef/dashboard` | KITCHEN_STAFF, SUPER_ADMIN |
| `/waiter-orders`, `/waiter/tables` | WAITER, MANAGER, SUPER_ADMIN |
| `/orders` | MANAGER, SUPER_ADMIN |

## Casos de Prueba Obligatorios

### 1. Pruebas de Login y Ruta Inicial
Para CADA rol:
```
1. Ir a /login
2. Ingresar credenciales del rol
3. Verificar que redirige a su ruta por defecto:
   - OWNER     → /dashboard
   - SUPER_ADMIN → /admin/dashboard
   - MANAGER   → /waiter-orders
   - WAITER    → /waiter/tables
   - CASHIER   → /cashier
   - KITCHEN_STAFF → /chef/dashboard
4. Confirmar que el rol aparece en AuthClient.getRole()
```

### 2. Pruebas de Navegación Autorizada
Para CADA rol, dentro de sus rutas permitidas:
```
1. Navegar entre módulos autorizados (ej. OWNER: /dashboard → /reportes → /sucursales)
2. Verificar que la navegación funciona sin errores
3. Verificar que el contenido es el esperado
4. Confirmar que el token de sesión es válido en cada petición HTTP
```

### 5. Pruebas de Acceso Denegado
Para CADA rol, intentar acceder a rutas NO permitidas:
```
1. Escribir URL no permitida directamente (ej. WAITER intentando /admin/users)
2. Presionar Enter / Recargar
3. Verificar:
   - Que NO se muestra contenido protegido
   - Que se redirige a la ruta por defecto del rol (NO a /login)
   - Que no hay flash de contenido protegido
   - Que la petición al endpoint no se envía
```

### 6. Pruebas de Logout
Para CADA rol:
```
1. Iniciar sesión
2. Navegar a su ruta principal
3. Hacer clic en "Cerrar Sesión" en el sidebar
4. Verificar:
   - Redirige a /login
   - No hay forma de volver atrás (botón Atrás no funciona)
   - localStorage está limpio (sin maison_access_token, maison_refresh_token, etc.)
   - Escribir URL protegida va a /login
   - Refrescar la página va a /login
```

### 7. Pruebas de Botón Atrás Post-Logout
Para CADA rol (crítico):
```
1. Iniciar sesión → /dashboard (o ruta por defecto)
2. Navegar entre 3-4 rutas
3. Cerrar sesión
4. Presionar Botón Atrás
5. Presionar Botón Adelante
6. Presionar Ctrl+Shift+T (reabrir pestaña cerrada)
7. Verificar que SIEMPRE va a /login, NUNCA muestra contenido protegido
```

### 8. Pruebas de Refresh Token Expirado
```
1. Iniciar sesión
2. Abrir DevTools → Storage → eliminar maison_access_token manualmente
3. Navegar a otra ruta
4. Verificar que intenta refresh automático
5. Si refresh falla, redirige a /login
6. Confirmar que NO muestra contenido protegido mientras intenta refresh
```

### 9. Pruebas de Refresh Token Tardío (Race Condition)
```
1. Iniciar sesión
2. Simulación: esperar a que expire el access token
3. Hacer 2 peticiones HTTP simultáneamente
4. Verificar que:
   - Solo una llamada de refresh se hace
   - Ambas peticiones se reintentan con el nuevo token
   - No hay race condition de doble-logout
```

### 10. Pruebas de localStorage Limpio
Después de logout, verificar que se limpió:
```
✅ maison_access_token
✅ maison_refresh_token
✅ maison_branch_id
✅ maison_branch_name
✅ maison_tenant_slug
✅ maison_sidebar_collapsed
✅ maison_session_id
```

### 11. Pruebas Cross-Browser
Probar logout en:
- Chrome / Chromium
- Firefox
- Safari (si es posible)
Verificar que el bfcache no restaura la sesión después de logout.

### 12. Pruebas de Selector de Sucursal (Branch)
```
1. Iniciar sesión como OWNER
2. Seleccionar una sucursal diferente
3. Verificar que localStorage.maison_branch_id cambió
4. Cerrar sesión
5. Verificar que maison_branch_id se limpió
6. Iniciar sesión nuevamente
7. Verificar que NO restaura la rama anterior
```

## Checklist de Completitud

### Autenticación
- [ ] Login exitoso para cada rol
- [ ] Ruta por defecto correcta para cada rol
- [ ] Token válido en requests HTTP
- [ ] Token expirado → intenta refresh
- [ ] Refresh falla → redirige a /login

### Autorización
- [ ] OWNER accede solo a /dashboard y módulos permitidos
- [ ] SUPER_ADMIN accede a /admin/* pero no a /dashboard (debe redirigir)
- [ ] WAITER no puede acceder a /admin/users
- [ ] CASHIER no puede acceder a /waiter/tables
- [ ] KITCHEN_STAFF no puede acceder a /cashier
- [ ] Cada rol redirige a su ruta por defecto cuando acceso denegado

### Logout
- [ ] localStorage completamente limpio
- [ ] Event auth:logout emitido y escuchado por todos los MFEs
- [ ] Botón Atrás no recupera sesión
- [ ] Botón Adelante no restaura protegido
- [ ] Refresh de página va a /login
- [ ] URL directa va a /login
- [ ] Reabrir tab (Ctrl+Shift+T) va a /login

### MFEs
- [ ] cada MFE escucha auth:logout
- [ ] Cada MFE limpia su estado privado
- [ ] Sidebar se actualiza después de logout
- [ ] No hay requests HTTP con token anterior después de logout

## Ejecución de Pruebas

**Ambiente:**
- Backend corriendo en http://localhost:4000
- web-shell en http://localhost:3000
- MFEs en puertos 5011-5015

**Script de Prueba Manual (interactivo):**

```bash
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: Shell + MFEs
cd apps
npm run dev:host

# Terminal 3: Browser testing
# Abrir http://localhost:3000
# Ejecutar pruebas manualmente según checklist arriba
```

**Credenciales de Prueba:**
Solicitar al equipo de backend credenciales para cada rol.

## Notas Importantes

1. **No confundir roles:** ADMIN en URLs ≠ rol. Es SUPER_ADMIN en el JWT.
2. **Cache del bfcache:** Firefox/Chrome pueden cachear estado de página. Logout debe limpiar localStorage explícitamente.
3. **Event Bus Global:** auth:logout debe alcanzar todos los MFEs montados, incluso los lazy-loaded.
4. **Timeout de sesión:** Confirmar que 30s buffer en expiración de token funciona correctamente.
5. **CORS:** Verificar headers Authorization en requests después de refresh.
