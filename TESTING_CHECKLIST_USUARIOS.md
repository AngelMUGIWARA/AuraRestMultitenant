# Validación Usuarios - OWNER Role

## Requisitos Previos
- Backend corriendo en `http://localhost:4000`
- MFE core_auth_dashboard_mf corriendo en `http://localhost:5011`
- Login como OWNER completado
- Sucursales creadas: Central, Norte, Oeste

## Datos de Prueba a Crear

### Sucursales
- [ ] Central (ubicación principal)
- [ ] Norte (sucursal norte)
- [ ] Oeste (sucursal oeste)

### Usuarios
Distribuir usuarios entre sucursales para validar filtrado:

**Sucursal Central:**
- [ ] Usuario Manager Central (role: MANAGER)
- [ ] Usuario Waiter Central (role: WAITER)

**Sucursal Norte:**
- [ ] Usuario Manager Norte (role: MANAGER)
- [ ] Usuario Cashier Norte (role: CASHIER)

**Sucursal Oeste:**
- [ ] Usuario Manager Oeste (role: MANAGER)
- [ ] Usuario Chef Oeste (role: CHEF)

## Validaciones - Tabla Usuarios

### Columna Acciones
- [ ] Botón Editar (lápiz) visible para todos los usuarios
- [ ] Botón Activar/Desactivar (power) visible para todos los usuarios
- [ ] Botones NO visibles para usuarios SUPER_ADMIN
- [ ] Botones correctamente deshabilitados durante operaciones

### Funcionalidad Editar
- [ ] Clic en Editar abre modal en modo edición
- [ ] Campos precargados con datos del usuario (nombre, email, rol, phone, sucursal)
- [ ] Campo email es readonly
- [ ] Campo password NO visible en modo edición
- [ ] Guardar cambios actualiza en BD
- [ ] F5 persiste cambios
- [ ] Modal cierra después de guardar exitosamente

### Funcionalidad Desactivar
- [ ] Clic en power (usuario ACTIVE) abre modal de confirmación
- [ ] Modal muestra texto: "¿Estás seguro de que deseas desactivar este usuario?"
- [ ] Botón "Cancelar" cierra modal sin cambios
- [ ] Botón "Desactivar" desactiva usuario y actualiza BD
- [ ] Estado en tabla cambia de "Activo" a "Inactivo"
- [ ] F5 persiste estado inactivo

### Funcionalidad Activar
- [ ] Usuario INACTIVE muestra botón power con opacidad
- [ ] Clic activa usuario inmediatamente (SIN modal de confirmación)
- [ ] Estado en tabla cambia de "Inactivo" a "Activo"
- [ ] F5 persiste estado activo

### Filtro por Sucursal
**Pruebas de filtrado:**
1. **Filtro "Global" (sin seleccionar sucursal)**
   - [ ] Muestra TODOS los usuarios (6 creados)
   - [ ] Red Inspector: GET request a `/admin/users` SIN parámetro `branchId`

2. **Filtro "Central"**
   - [ ] Muestra solo 2 usuarios de Central
   - [ ] Red Inspector: GET request incluye `branchId=<central-id>`

3. **Filtro "Norte"**
   - [ ] Muestra solo 2 usuarios de Norte
   - [ ] Red Inspector: GET request incluye `branchId=<norte-id>`

4. **Filtro "Oeste"**
   - [ ] Muestra solo 2 usuarios de Oeste
   - [ ] Red Inspector: GET request incluye `branchId=<oeste-id>`

## Breadcrumb
- [ ] En página de Usuarios: muestra solo "Usuarios"
- [ ] En página de Alexa Skill: muestra solo "Alexa Skill" (SIN "Admin >")
- [ ] Rutas funcionan correctamente

## Validaciones Inventario

### Filtro por Sucursal
1. **Crear inventario diferenciado por sucursal**
   - Central: producto A con 10 unidades
   - Norte: producto A con 5 unidades
   - Oeste: producto A con 15 unidades

2. **Pruebas de filtrado:**
   - [ ] Filtro Global muestra stock total (30 unidades)
   - [ ] Filtro Central muestra 10 unidades
   - [ ] Filtro Norte muestra 5 unidades
   - [ ] Filtro Oeste muestra 15 unidades

## Validaciones CSV Export

- [ ] Export incluye solo datos de sucursal seleccionada
- [ ] Export Global incluye datos de todas las sucursales
- [ ] Archivo CSV contiene headers correctos
- [ ] Datos corresponden a filtro activo

## Resumen de Validaciones
- Fecha de Validación: ____________________
- Validador: ____________________
- Resultado: ☐ PASÓ  ☐ FALLÓ
- Notas: ___________________________________
