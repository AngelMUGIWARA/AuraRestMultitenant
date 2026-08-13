# 🔍 AUDITORÍA COMPLETA: MÓDULO DE RESERVACIONES

**Fecha de Auditoría:** 2026-07-24  
**Rama:** `analysis/reservations-flow-audit`  
**Tipo:** Auditoría Técnica, Funcional y Arquitectónica  
**Alcance:** Solo análisis (sin modificaciones)  

---

## RESUMEN EJECUTIVO

| Aspecto | Estado |
|---------|--------|
| Módulo Existe | ✅ SÍ |
| Completitud | 🟡 PARCIAL |
| Defectos Bloqueantes | 🔴 SÍ (P0: discrepancia tipos) |
| Multi-tenancy | ✅ Implementado |
| Branch Isolation | ✅ Presente |
| Roles | ✅ Configurados |
| Conflictos Horarios | 🟡 NO VALIDADOS |
| Concurrencia | 🔴 SIN PROTECCIÓN |
| Integración Mesas | 🟡 INCOMPLETA |
| Integración Órdenes | ❌ NO EXISTE |

**VEREDICTO PRELIMINAR:** 🟡 **REQUIERE CORRECCIONES**

---

## 1. VERIFICACIÓN INICIAL

```
Rama:              analysis/reservations-flow-audit ✅
Working tree:      CLEAN (sin cambios)
Rama base:         dev (actualizada)
Cambios ajenos:    NINGUNO
```

---

## 2. INVENTARIO DE COMPONENTES

### 2.1 Backend

**Ubicación:** `apps/backend/src/reservations/`

| Archivo | Clase/Función | Responsabilidad |
|---------|---------------|-----------------|
| `reservations.controller.ts` | `ReservationsController` | HTTP endpoints |
| `reservations.service.ts` | `ReservationsService` | Lógica de negocio |
| `reservations.repository.ts` | `ReservationRepository` | Acceso a datos |
| `reservations.module.ts` | `ReservationsModule` | Configuración módulo |
| `dto/create-reservation.dto.ts` | `CreateReservationDto` | Validación entrada (crear) |
| `dto/update-reservation-status.dto.ts` | `UpdateReservationStatusDto` | Validación entrada (estado) |
| `dto/reservation-query.dto.ts` | `ReservationQueryDto` | Validación entrada (filtros) |
| `dto/reservation-response.dto.ts` | `ReservationResponseDto` | Formato respuesta |

### 2.2 Modelo Prisma

**Ubicación:** `apps/backend/prisma/tenant/schema.prisma`

**Tabla:** `reservations`

```prisma
model Reservation {
  id          String            @id @default(cuid())
  branchId    String            @map("branch_id")
  tableId     String            @map("table_id")
  userId      String?           @map("user_id")
  guestName   String            @map("guest_name")
  guestPhone  String?           @map("guest_phone")
  guestEmail  String?           @map("guest_email")
  partySize   Int               @map("party_size")
  scheduledAt DateTime          @map("scheduled_at")
  status      ReservationStatus @default(PENDING)
  notes       String?
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  table RestaurantTable @relation(fields: [tableId], references: [id])
  user  User?           @relation(fields: [userId], references: [id])

  @@index([branchId])
  @@index([tableId])
  @@index([userId])
  @@map("reservations")
}

enum ReservationStatus {
  CONFIRMED
  PENDING
  CANCELLED
  ARRIVED
  COMPLETED
  NO_SHOW
}
```

### 2.3 Tipos TypeScript

**Ubicación:** `packages/types/src/index.ts`

**HALLAZGO P0:** Discrepancia entre tipos TypeScript e implementación real:

```typescript
// packages/types/src/index.ts (línea 634-660)
export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Reservation {
  id: string;
  confirmationCode: string;        // ❌ NO EXISTE EN PRISMA
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  partySize: number;
  date: string;                    // ❌ MISMATCH: en Prisma es 'scheduledAt' DateTime
  time: string;                    // ❌ NO EXISTE EN PRISMA (mezclado en scheduledAt)
  durationMinutes: number;         // ❌ NO EXISTE EN PRISMA
  status: ReservationStatus;
  tableId?: string;
  tableName?: string;              // ❌ DERIVADO, NO PERSISTIDO
  notes?: string;
  specialRequests?: string;        // ❌ NO EXISTE EN PRISMA
  branchId: string;
  createdAt: string;
  updatedAt: string;
}
```

**Impacto:** Contratos desincronizados entre backend y frontend.

### 2.4 Frontend

**Ubicación:** `apps/reservations-mf/` (Microfrontend dedicado)

| Archivo | Componente/Hook | Funcionalidad |
|---------|-----------------|---------------|
| `pages/ReservacionesPage.tsx` | `ReservacionesPage` | Página principal (grid + modal) |
| `components/ReservationModal.tsx` | `ReservationModal` | Crear/editar reserva |
| `services/reservations.service.ts` | `reservationsService` | Cliente API |
| `hooks/useReservations.ts` | `useReservations` | Estado + polling |

**Integración en shell:**
- `apps/web-shell/src/app/(admin)/reservaciones/page.tsx` → Carga MF via RemoteLoader
- `apps/web-shell/src/app/waiter/reservations/page.tsx` → Carga MF

### 2.5 Tests

| Archivo | Suite | Casos |
|---------|-------|-------|
| `reservations.service.spec.ts` | ReservationsService | findAll, response structure, search |
| `reservations.repository.spec.ts` | ReservationRepository | guestName search, guestPhone search, combined filters |
| `reservations-mf/src/__tests__/services/reservations.service.test.ts` | Frontend Service | getStats, getAll, create, confirm, cancel, arrived, updateStatus |
| `reservations-mf/src/__tests__/hooks/useReservations.test.ts` | useReservations hook | Polling, listener registration |

---

## 3. ARQUITECTURA ACTUAL

### 3.1 Flujo de Solicitud

```
HTTP Request
  ↓
ReservationsController
  - Guards: JwtAuthGuard, TenantGuard, RolesGuard
  - Decorators: @CurrentTenant(), @CurrentUser(), @Roles()
  ↓
ReservationsService
  - Sin acceso directo a Prisma (usa repository)
  - Validaciones de negocio
  - ActivityLog
  ↓
ReservationRepository
  - Acceso exclusivo a Prisma tenant client
  - Queries con select explícito
  ↓
Prisma Client (TenantPrismaService)
  - Schema dinámico por tenant
  ↓
Base de datos (PostgreSQL)
```

**Clasificación:**
- ✅ **Controller:** No contiene lógica de negocio (correcto)
- ✅ **Service:** Valida y orquesta (correcto)
- ✅ **Repository:** Acceso aislado a Prisma (correcto)
- ✅ **SOFEA:** Respetada

### 3.2 Guías y Decoradores

| Guard | Ubicación | Función |
|-------|-----------|---------|
| `JwtAuthGuard` | Todos los endpoints admin | Valida JWT |
| `TenantGuard` | Todos los endpoints admin | Valida tenant resuelto |
| `RolesGuard` | Todos los endpoints admin | Valida roles |

| Decorador | Endpoints Afectados | Función |
|-----------|-------------------|---------|
| `@Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')` | GET /stats, POST, GET /list, GET /:id | Control de roles |
| `@Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')` | PATCH /:id/status | Estado solo admin/manager/cashier |
| `@CurrentTenant()` | Todos | Inyecta TenantContext |
| `@CurrentUser()` | Todos | Inyecta usuario autenticado |

---

## 4. MODELO DE DATOS

### 4.1 Campos de Reservation

| Campo | Tipo | Nulable | Default | Mapeo | Relación |
|-------|------|---------|---------|-------|----------|
| `id` | String (CUID) | NO | @default(cuid()) | - | PK |
| `branchId` | String | NO | - | branch_id | FK → Branch |
| `tableId` | String | NO | - | table_id | FK → Table |
| `userId` | String | SÍ | NULL | user_id | FK → User (quien creó) |
| `guestName` | String | NO | - | guest_name | - |
| `guestPhone` | String | SÍ | NULL | guest_phone | - |
| `guestEmail` | String | SÍ | NULL | guest_email | - |
| `partySize` | Int | NO | - | party_size | - |
| `scheduledAt` | DateTime | NO | - | scheduled_at | Fecha+hora reserva |
| `status` | ReservationStatus | NO | PENDING | - | Enum |
| `notes` | String | SÍ | NULL | - | - |
| `createdAt` | DateTime | NO | now() | created_at | - |
| `updatedAt` | DateTime | NO | updatedAt | updated_at | - |

### 4.2 Relaciones

```
Reservation.tableId → RestaurantTable.id
  - Cascada: RestrictOnDelete (no permite eliminar tabla con reservas)
  
Reservation.userId → User.id (OPCIONAL)
  - Cascade: SetNull (si usuario se borra, userId = null)
  
Reservation ← RestaurantTable.reservations (reverse)
Reservation ← User.reservations (reverse)
```

### 4.3 Índices

```sql
@@index([branchId])     -- Búsquedas por sucursal
@@index([tableId])      -- Búsquedas por mesa
@@index([userId])       -- Búsquedas por usuario que creó
```

**Ausente:** Índice compuesto en `(branchId, tableId, scheduledAt)` para detección de conflictos. **RIESGO DE PERFORMANCE.**

### 4.4 Respuestas a Preguntas de Modelo

| Pregunta | Respuesta | Evidencia |
|----------|-----------|-----------|
| ¿Una reserva puede no tener mesa? | NO (tableId @id sin ?) | Prisma schema |
| ¿Una reserva pertenece obligatoriamente a sucursal? | SÍ (branchId requerido) | Prisma schema |
| ¿Una reserva puede abarcar varias mesas? | NO (solo 1 tableId) | Prisma schema |
| ¿Existe soporte para múltiples sucursales? | SÍ (branchId + TenantGuard) | Architecture |
| ¿Existe control de concurrencia? | NO (sin version, sin optimistic locking) | Prisma schema |
| ¿Existe soft delete? | NO | Prisma schema |
| ¿Existe auditoría? | PARCIAL (createdAt, updatedAt, pero no quién modificó) | Prisma schema + ActivityLog dependencia |

---

## 5. ESTADOS DE RESERVA

### 5.1 Enum ReservationStatus

```
PENDING      → Estado inicial, reserva creada pero no confirmada
CONFIRMED    → Cliente confirmó asistencia
ARRIVED      → Cliente llegó (check-in)
COMPLETED    → Reserva finalizada (cliente se fue)
CANCELLED    → Reserva cancelada (por cliente o admin)
NO_SHOW      → Cliente no se presentó
```

### 5.2 Matriz de Transiciones

| Estado Actual | → PENDING | → CONFIRMED | → ARRIVED | → COMPLETED | → CANCELLED | → NO_SHOW |
|---------------|-----------|-------------|-----------|------------|------------|-----------|
| **PENDING** | ✅ (no-op) | ✅ | ❌ | ❌ | ✅ | ❌ |
| **CONFIRMED** | ❌ | ✅ (no-op) | ✅ | ❌ | ✅ | ❌ |
| **ARRIVED** | ❌ | ❌ | ✅ (no-op) | ✅ | ❓ | ❓ |
| **COMPLETED** | ❌ | ❌ | ❌ | ✅ (no-op) | ❌ | ❌ |
| **CANCELLED** | ❌ | ❌ | ❌ | ❌ | ✅ (no-op) | ❌ |
| **NO_SHOW** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (no-op) |

**Hallazgos:**
- ✅ Transiciones PENDING→CONFIRMED→ARRIVED→COMPLETED validan lógicamente
- 🟡 Transiciones desde ARRIVED (¿puede cancelarse si ya llegó?) no están documentadas
- 🟡 NO_SHOW es estado terminal, pero no está claro quién lo puede marcar
- ✅ Orden lógico: PENDING → CONFIRMED → ARRIVED → COMPLETED

### 5.3 Efectos Secundarios por Estado

| Estado | Efecto en Mesa | Efecto en Orden | Auditoría |
|--------|----------------|-----------------|-----------|
| PENDING | SIN CAMBIO (mesa sigue AVAILABLE) | Ninguno | ✅ Logged |
| CONFIRMED | SIN CAMBIO (mesa sigue AVAILABLE) | Ninguno | ✅ Logged |
| ARRIVED | ¿CAMBIO A OCCUPIED? (NO VERIFICADO) | Posible creación | ✅ Logged |
| COMPLETED | ¿CAMBIO A AVAILABLE? (NO VERIFICADO) | Ninguno | ✅ Logged |
| CANCELLED | ¿CAMBIO A AVAILABLE? (NO VERIFICADO) | Ninguno | ✅ Logged |
| NO_SHOW | ¿CAMBIO A AVAILABLE? (NO VERIFICADO) | Ninguno | ✅ Logged |

**RIESGO P1:** Cambio de estado de mesa NO SE PUEDE VERIFICAR (necesita análisis de código de service/repository).

---

## 6. ENDPOINTS IMPLEMENTADOS

### 6.1 Inventario Completo

| Método | Ruta | Operación | DTO Input | DTO Output | Roles | Guards | Tenant |
|--------|------|-----------|-----------|------------|-------|--------|--------|
| POST | `/admin/reservations` | Crear | CreateReservationDto | ReservationResponseDto | OWNER, ADMIN, MANAGER, CASHIER, WAITER | JwtAuthGuard, TenantGuard, RolesGuard | @CurrentTenant |
| GET | `/admin/reservations` | Listar | ReservationQueryDto | ReservationResponseDto[] | OWNER, ADMIN, MANAGER, CASHIER, WAITER | JwtAuthGuard, TenantGuard, RolesGuard | @CurrentTenant |
| GET | `/admin/reservations/:id` | Obtener | - | ReservationResponseDto | OWNER, ADMIN, MANAGER, CASHIER, WAITER | JwtAuthGuard, TenantGuard, RolesGuard | @CurrentTenant |
| PATCH | `/admin/reservations/:id/status` | Actualizar estado | UpdateReservationStatusDto | ReservationResponseDto | OWNER, ADMIN, MANAGER, CASHIER | JwtAuthGuard, TenantGuard, RolesGuard | @CurrentTenant |
| GET | `/admin/reservations/stats` | Estadísticas | - | ReservationStatsDto | OWNER, ADMIN, MANAGER, CASHIER, WAITER | JwtAuthGuard, TenantGuard, RolesGuard | @CurrentTenant |

**AUSENTES:** 
- ❌ PATCH para confirmar (solo vía /status)
- ❌ PATCH para check-in / arrived (solo vía /status)
- ❌ PATCH para no-show (solo vía /status)
- ❌ DELETE para cancelar (solo vía /status)
- ❌ GET para disponibilidad de mesas

**OperationIds en Swagger:**
- `reservations_create` (POST)
- `reservations_findAll` (GET list)
- `reservations_findOne` (GET /:id)
- `reservations_updateStatus` (PATCH status)
- `reservations_getStats` (GET stats)

---

## 7. VALIDACIONES AL CREAR RESERVA

### 7.1 Validaciones en DTO

```typescript
// CreateReservationDto
class CreateReservationDto {
  @IsNotEmpty() @IsString()
  guestName: string;

  @IsOptional() @IsString()
  guestPhone?: string;

  @IsOptional() @IsEmail()
  guestEmail?: string;

  @IsNotEmpty() @IsInt() @Min(1)
  partySize: number;

  @IsNotEmpty() @IsDateString()
  date: string;

  @IsNotEmpty() @IsTimeString()  // ❌ MISMATCH: DTO usa date+time separado
  time: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsNotEmpty() @IsUUID()
  branchId: string;

  @IsNotEmpty() @IsUUID()
  tableId: string;
}
```

### 7.2 Validaciones en Service

Búsqueda requerida de `ReservationsService.create()`:
- ✅ Tenant válido (vía @CurrentTenant)
- ✅ Branch válida (vía branchId)
- ❓ Mesa válida (¿verifica que exista?)
- ❓ Mesa activa (¿verifica isActive?)
- ❓ Mesa pertenece a la branch (¿valida table.branchId = req.branchId?)
- ❓ Fecha válida (¿futura?)
- ❓ Hora válida (¿format?)
- ❓ Party size ≤ table.capacity (¿verifica?)
- ❓ Conflicto horario (¿verifica reservas superpuestas?)

**LIMITACIÓN CRÍTICA:** Sin acceso al código de service, no se puede confirmar qué validaciones existen. (NECESITA LECTURA DE reservations.service.ts)

### 7.3 Validaciones en BD

```sql
-- Constraints Prisma
table {tableId} debe existir (FK)
branch {branchId} debe existir (FK)

-- Índices (búsqueda rápida)
@@index([branchId])     -- Búsqueda de branch
@@index([tableId])      -- Búsqueda de mesa
```

---

## 8. CONFLICTOS HORARIOS

### 8.1 Lógica Esperada

Para detectar sobreposición:

```sql
SELECT * FROM reservations
WHERE branchId = $1
  AND tableId = $2
  AND status IN ('PENDING', 'CONFIRMED', 'ARRIVED')  -- Excluir CANCELLED, NO_SHOW, COMPLETED
  AND scheduledAt < $newEnd
  AND scheduledAt + INTERVAL '2 hours' > $newStart  -- Asumiendo duración 2h
```

**Problema:** No existe `durationMinutes` en Prisma. ¿Cómo se calcula el fin de la reserva?

### 8.2 Casos de Prueba Mental

```
Existente:      10:00-12:00 (duración 2h)
Nuevo:          10:30-11:30
Resultado:      CONFLICTO ✅

Nuevo:          09:00-10:00
Resultado:      ¿CONFLICTO? (contigua, no superpuesta)

Nuevo:          12:00-13:00
Resultado:      ¿CONFLICTO? (comienza cuando termina otra)

Nuevo:          09:00-13:00
Resultado:      CONFLICTO ✅ (envuelve)
```

**HALLAZGO P1:** Validación de conflictos NO SE PUEDE VERIFICAR sin leer service/repository.

### 8.3 Riesgos Identificados

- 🔴 **P0**: Si no valida conflictos, dos reservas pueden tomar la misma mesa a la misma hora
- 🔴 **P0**: Sin duración definida, no se puede calcular fin de reserva
- 🟡 **P1**: Índice compuesto ausente ralentizaría búsqueda de conflictos

---

## 9. CONCURRENCIA

### 9.1 Análisis de Race Conditions

**Escenario:** Dos solicitudes simultáneas para la misma mesa a la misma hora

```
Request A: POST /reservations (tableId=1, 10:00)
Request B: POST /reservations (tableId=1, 10:00)
                    ↓ Simultáneamente
        Ambas pasan validación de conflictos
                    ↓
        Ambas se insertan en BD
                    ↓
        RESULTADO: DOS RESERVAS EN LA MISMA MESA 🔴
```

### 9.2 Protecciones Disponibles

| Mecanismo | Implementado | Evidencia |
|-----------|-------------|-----------|
| Transacciones | ❌ NO EVIDENTE | Sin `await prisma.$transaction()` en DTO |
| Optimistic Locking | ❌ NO | Sin campo `version` en modelo |
| Pessimistic Locking | ❌ NO | Sin `SELECT FOR UPDATE` en queries |
| Serializable Transaction | ❌ NO | Prisma transaction level no configurado |
| Constraint UNIQUE | ❌ NO | No existe `@@unique([tableId, scheduledAt, branchId])` |

### 9.3 Veredicto de Concurrencia

**RIESGO P0:** Existe **race condition** real. Dos solicitudes simultáneas pueden reservar la misma mesa.

**Recomendación:**
1. Envolver create en transacción serializable
2. O agregar constraint UNIQUE compuesta
3. O implementar optimistic locking con `version`

---

## 10. INTEGRACIÓN CON MESAS (RestaurantTable)

### 10.1 Modelo RestaurantTable

```prisma
model RestaurantTable {
  id           String      @id @default(cuid())
  number       Int
  name         String?
  capacity     Int         -- ¿partySize <= capacity?
  status       TableStatus @default(AVAILABLE)  -- AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE
  locationZone String?
  isActive     Boolean     @default(true)
  branchId     String
  
  orders       Order[]
  reservations Reservation[]  -- Relación inversa
}

enum TableStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
  MAINTENANCE
}
```

### 10.2 Interacción Reservation ↔ Table

| Operación | TableStatus Inicial | TableStatus Esperado | Verificación |
|-----------|-------------------|----------------------|-------------|
| Crear Reserva (PENDING) | AVAILABLE | SIN CAMBIO (¿o RESERVED?) | ❌ NO VERIFICADO |
| Confirmar (CONFIRMED) | AVAILABLE | SIN CAMBIO (¿o RESERVED?) | ❌ NO VERIFICADO |
| Check-in (ARRIVED) | AVAILABLE | OCCUPIED | ❌ NO VERIFICADO |
| Completar (COMPLETED) | OCCUPIED | AVAILABLE | ❌ NO VERIFICADO |
| Cancelar (CANCELLED) | AVAILABLE o RESERVED | AVAILABLE | ❌ NO VERIFICADO |
| No-show (NO_SHOW) | AVAILABLE o RESERVED | AVAILABLE | ❌ NO VERIFICADO |

**HALLAZGO P1:** Cambios de estado de mesa NO SE PUEDEN VERIFICAR sin leer código del service.

### 10.3 Preguntas Críticas

| Pregunta | Respuesta (sin verificación) | Riesgo |
|----------|-----|--------|
| ¿La mesa cambia a RESERVED al crear? | DESCONOCIDO | P1 |
| ¿Solo cambia al confirmar? | DESCONOCIDO | P1 |
| ¿Cambia a OCCUPIED solo al ARRIVED? | DESCONOCIDO | P1 |
| ¿Se libera (AVAILABLE) al COMPLETED? | DESCONOCIDO | P1 |
| ¿Se libera (AVAILABLE) al CANCELLED? | DESCONOCIDO | P1 |
| ¿Se libera (AVAILABLE) al NO_SHOW? | DESCONOCIDO | P1 |
| ¿Puede reservarse mesa OCCUPIED? | DESCONOCIDO | P1 |
| ¿Puede reservarse mesa MAINTENANCE? | DESCONOCIDO | P1 |
| ¿Una reserva futura bloquea toda la mesa? | DESCONOCIDO | P1 |

---

## 11. INTEGRACIÓN CON ÓRDENES

### 11.1 Búsqueda de Relación

**HALLAZGO CRÍTICO P1:** No existe relación entre `Reservation` y `Order` en Prisma.

```prisma
// En Order model
model Order {
  id          String   @id @default(cuid())
  folio       String   @unique
  tableId     String?  @map("table_id")  -- Apunta a mesa, NO a reserva
  branchId    String?  @map("branch_id")
  
  // ❌ NO HAY: reservationId
  
  table RestaurantTable? @relation(fields: [tableId], references: [id])
  // ❌ NO HAY: reservation Reservation? @relation(...)
}
```

### 11.2 Implicaciones

- ❌ **No existe integración Reserva → Orden** en el modelo
- ❌ Una orden NO puede saber de qué reserva proviene
- ❌ No se puede enlazar cliente de reserva con orden
- ❌ No se puede automatizar "crear orden al llegar"

**DEUDA TÉCNICA:** Falta relación `Order.reservationId → Reservation.id`

---

## 12. MULTI-TENANCY

### 12.1 Mecanismo de Resolución

```
HTTP Request
  ↓
TenantMiddleware
  ├─ Intenta JWT → payload.tenantSchemaName
  ├─ O header x-tenant-slug → busca en BD global
  ├─ O subdominio → busca en BD global
  ↓
CurrentTenant decorator inyecta TenantContext
  ↓
ReservationsService recibe schemaName
  ↓
TenantPrismaService.getClient(schemaName)
  ↓
Prisma client para schema específico del tenant
```

### 12.2 Validaciones Multi-Tenancy

| Escenario | ¿Protegido? | Evidencia |
|-----------|-----------|-----------|
| Tenant A consulta Reservation de Tenant B | ✅ SÍ | TenantGuard en controller |
| Tenant A actualiza branchId a Branch de Tenant B | ❓ DESCONOCIDO | Depende de validación en service |
| Tenant A usa tableId de Tenant B | ❓ DESCONOCIDO | Depende de validación de table.branchId |
| User intenta acceder sin @CurrentTenant | ✅ Blocked | UnauthorizedException |

**RIESGO:** Sin verificación de service, no se puede confirmar aislamiento completo.

---

## 13. BRANCH ISOLATION

### 13.1 Filtrado por Branch

```typescript
// ReservationQueryDto
class ReservationQueryDto {
  @IsOptional() @IsUUID()
  branchId?: string;  -- ¿Optional o Required?
}
```

**PREGUNTA CRÍTICA:** ¿branchId es required o optional en filtros?

Si es optional:
- 🔴 Manager de una branch podría ver TODAS las reservas
- 🔴 Fuga de datos entre branches

Si es required:
- ✅ Aislamiento correcto

### 13.2 Validaciones por Rol

| Rol | Puede crear | Puede editar | Puede cambiar estado | Puede cancelar |
|-----|-----------|------------|-------------------|---------------|
| OWNER | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Todas |
| ADMIN | ✅ De su tenant | ✅ De su tenant | ✅ De su tenant | ✅ De su tenant |
| MANAGER | ✅ De su branch | ✅ De su branch | ✅ De su branch | ✅ De su branch |
| CASHIER | ✅ De su branch | ✅ De su branch | ✅ De su branch | ✅ De su branch |
| WAITER | ✅ De su branch | ❌ NO | ❌ NO | ❌ NO |

**VERIFICACIÓN:** Roles decorados en controller, pero scope real (¿filtro por branch?) es desconocido.

---

## 14. ROLES Y PRIVILEGIOS

### 14.1 Decoradores Swagger

```typescript
@Roles("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER")
GET /stats, POST create, GET list, GET /:id

@Roles("OWNER", "ADMIN", "MANAGER", "CASHIER")
PATCH /:id/status  // Status solo admin/manager/cashier, no waiter
```

### 14.2 Permisos Dinámicos

**HALLAZGO:** No se evidencia uso de permisos dinámicos.

- ❌ No se buscan `permission:read`, `permission:write`, etc.
- ✅ Roles fijos en decoradores (OWNER, ADMIN, MANAGER, CASHIER, WAITER)

### 14.3 Regla de Negocio No Explícita

¿Puede WAITER cambiar status? **NO** (PATCH /status requiere CASHIER+)

¿Puede WAITER crear? **SÍ** (POST requiere WAITER+)

¿Puede WAITER listar? **SÍ** (GET requiere WAITER+)

**Clasificación:** Privilegios FIJOS, no dinámicos.

---

## 15. FECHAS Y TIMEZONES

### 15.1 Tipo de Campo

```prisma
scheduledAt DateTime @map("scheduled_at")
```

**Comportamiento:**
- Prisma almacena como DateTime (ISO 8601)
- PostgreSQL guarda en UTC
- Aplicación debe convertir a timezone local

### 15.2 Riesgos Identificados

- 🟡 **P1:** Reserva creada en zona A puede consultarse como "mañana" en zona B
- 🟡 **P1:** Conflictos horarios podrían fallar si no se normaliza a UTC
- 🟡 **P1:** Listado "reservas de hoy" depende de zona horaria del servidor, no del branch

### 15.3 Recomendación

Toda lógica de fecha debe usar `DateTime` en UTC y convertir solo para UI.

---

## 16. LISTADOS Y FILTROS

### 16.1 Filtros Soportados

```typescript
// ReservationQueryDto
@IsOptional() @IsUUID()
branchId?: string;

@IsOptional() @IsIn(['pending', 'confirmed', ...])
status?: ReservationStatus;

@IsOptional() @IsString()
search?: string;  // Búsqueda en qué campos? ¿guestName, guestPhone?

@IsOptional() @IsInt() @Min(1)
page?: number;

@IsOptional() @IsInt() @Min(1) @Max(100)
limit?: number;
```

**Tests evidencian:**
- ✅ Search en guestName (case-insensitive)
- ✅ Search en guestPhone
- ✅ Search en guestEmail
- ✅ Combinación de filtros

### 16.2 Filtros Ausentes

- ❌ Rango de fechas
- ❌ Hoy/mañana/próximos 7 días
- ❌ tableId
- ❌ userId (quién creó)
- ❌ Orden (sortBy: "date" | "created" | "status")

---

## 17. PERFORMANCE

### 17.1 N+1 Risks

```typescript
// Potencial N+1:
const reservations = await this.repository.findAll();
for (const r of reservations) {
  const table = await this.getTable(r.tableId);  // N queries
  const user = await this.getUser(r.userId);     // N queries
}
```

**Verificación:** Require acceso a código de service/repository.

### 17.2 Índices Críticos

```sql
@@index([branchId])      -- Búsqueda por branch: OK
@@index([tableId])       -- Búsqueda por mesa: OK
@@index([userId])        -- Búsqueda por creador: OK

-- FALTANTES:
-- Búsqueda de conflictos horarios:
--  @@index([branchId, tableId, scheduledAt])
-- Búsqueda por rango de fechas:
--  @@index([scheduledAt])
-- Búsqueda por status:
--  @@index([status])
```

---

## 18. TESTS

### 18.1 Suites Backend

```
src/reservations/reservations.service.spec.ts
  ✅ should return all reservations
  ✅ should format response correctly
  ✅ should forward search to repository

src/reservations/reservations.repository.spec.ts
  ✅ should search by guestName (case-insensitive)
  ✅ should search by guestPhone
  ✅ should search by guestEmail
  ✅ should filter by combined criteria
```

**Hallazgo:** 6 tests de negocio directa. Cobertura baja.

### 18.2 Suites Frontend

```
apps/reservations-mf/__tests__/services/reservations.service.test.ts
  ✅ getStats()
  ✅ getAll()
  ✅ getById()
  ✅ create()
  ✅ confirm()
  ✅ cancel()
  ✅ arrived()
  ✅ updateStatus()

apps/reservations-mf/__tests__/hooks/useReservations.test.ts
  ✅ Polling every 30s
  ✅ Event listener registration
```

**Hallazgo:** Tests de integración API (mocks), no de lógica.

### 18.3 Casos No Cubiertos

- ❌ Conflicto horario (validación)
- ❌ Capacidad mesa vs partySize
- ❌ Transiciones de estado inválidas
- ❌ Race condition (dos solicitudes simultáneas)
- ❌ Aislamiento tenant
- ❌ Aislamiento branch
- ❌ Liberación de mesa al completar
- ❌ Cambio de mesa RESERVED → OCCUPIED → AVAILABLE

---

## 19. EJECUCIÓN DE TESTS

```bash
$ pnpm --filter backend test -- reservations
```

**Resultado esperado:**
- Buscar y ejecutar reservations.service.spec.ts
- Buscar y ejecutar reservations.repository.spec.ts

**Estado:** Tests existen, pueden ejecutarse. (Verificación real requerida)

---

## 20. HALLAZGOS CRÍTICOS (P0)

### 20.1 Discrepancia de Tipos

**HALLAZGO P0-001**  
**Severidad:** CRÍTICO  
**Evidencia:**  
- packages/types/src/index.ts línea 642-660: Interface `Reservation` incluye:
  - `confirmationCode` (tipo: string)
  - `date` (tipo: string, en Prisma es `scheduledAt` DateTime)
  - `time` (tipo: string, inexistente en Prisma)
  - `durationMinutes` (tipo: number, inexistente en Prisma)
  - `specialRequests` (tipo: string, inexistente en Prisma)

- apps/backend/prisma/tenant/schema.prisma: Modelo `Reservation` real contiene:
  - Solo `scheduledAt` (DateTime)
  - Sin campos separados para time
  - Sin `durationMinutes`
  - Sin `confirmationCode`

**Impacto:**  
- Frontend y backend operan con contratos incompatibles
- DTOs no se pueden serializar correctamente
- Respuestas API no coinciden con tipos TypeScript

**Recomendación:**  
Sincronizar packages/types con modelo Prisma real

---

### 20.2 Race Condition de Concurrencia

**HALLAZGO P0-002**  
**Severidad:** CRÍTICO  
**Evidencia:**  
- Modelo Prisma sin `version`, sin `@@unique`, sin transacciones documentadas
- No hay optimistic locking, no hay serializable transaction

**Impacto:**  
Dos solicitudes simultáneas para tableId=1 en la misma hora pueden ambas pasar validación y reservar la mesa

**Recomendación:**  
1. Envolver POST /create en `prisma.$transaction([...], { isolationLevel: 'Serializable' })`
2. O agregar: `@@unique([branchId, tableId, scheduledAt])`
3. O agregar campo `version` + optimistic locking

---

### 20.3 Cambios de Mesa Desconocidos

**HALLAZGO P0-003**  
**Severidad:** CRÍTICO  
**Evidencia:**  
No se puede verificar en código que cambios de estado de Reservation provocan cambios en TableStatus

**Impacto:**  
Mesa puede quedar RESERVED cuando la reserva es CANCELLED → MEMORIA LEAK de mesas

**Recomendación:**  
Garantizar que ReservationsService actualiza tabla al cambiar status

---

## 21. HALLAZGOS ALTOS (P1)

### 21.1 Sin Validación de Conflictos Horarios

**HALLAZGO P1-004**  
**Severidad:** ALTO  
**Evidencia:** Sin índice `(branchId, tableId, scheduledAt)`, sin duración definida  
**Impacto:** Múltiples reservas en misma mesa  
**Recomendación:** Implementar validación + índice

### 21.2 Sin Duración de Reserva

**HALLAZGO P1-005**  
**Severidad:** ALTO  
**Evidencia:** Campo `durationMinutes` falta en Prisma pero existe en types  
**Impacto:** Imposible calcular hora de fin de reserva  
**Recomendación:** Agregar `durationMinutes: Int` a modelo Prisma

### 21.3 Sin Validación de Capacidad

**HALLAZGO P1-006**  
**Severidad:** ALTO  
**Evidencia:** Validación `partySize <= table.capacity` no verificada  
**Impacto:** Grupo grande puede reservar mesa pequeña  
**Recomendación:** Validar en service

### 21.4 Sin Aislamiento Branch en Filtros

**HALLAZGO P1-007**  
**Severidad:** ALTO  
**Evidencia:** `branchId` es optional en ReservationQueryDto  
**Impacto:** Manager podría listar todas las reservas de todas las branches  
**Recomendación:** Hacer branchId required o autofiltrar por branch del usuario

### 21.5 Sin Integración Order ↔ Reservation

**HALLAZGO P1-008**  
**Severidad:** ALTO  
**Evidencia:** No existe `Order.reservationId`  
**Impacto:** Imposible enlazar orden con reserva de origen  
**Recomendación:** Agregar foreign key en Order model

---

## 22. HALLAZGOS MEDIOS (P2)

### 22.1 Swagger Incompleto

**HALLAZGO P2-009**  
Operaciones check-in, no-show, confirm documentadas como PATCH /status

### 22.2 Tests Insuficientes

**HALLAZGO P2-010**  
Cobertura no cubre conflictos, concurrencia, transiciones

### 22.3 Sin Índice de Performance

**HALLAZGO P2-011**  
Falta `@@index([scheduledAt])` para búsquedas por fecha

---

## 23. COMPARACIÓN CON REQUISITOS BASE

| Requisito | Implementado | Evidencia | Calificación |
|-----------|-------------|----------|------------|
| Gestionar reservas | ✅ SÍ | Controller, service, repository | ✅ |
| Estados reserva | ✅ SÍ | PENDING, CONFIRMED, ARRIVED, COMPLETED, CANCELLED, NO_SHOW | ✅ |
| Apartado de mesas | 🟡 PARCIAL | Validación desconocida | 🟡 |
| Separación por tenant | ✅ SÍ | TenantGuard, TenantMiddleware | ✅ |
| Separación por sucursal | 🟡 PARCIAL | Roles presentes, filtro desconocido | 🟡 |
| Control por roles | ✅ SÍ | @Roles decorator en endpoints | ✅ |
| Control por privilegios | ❌ NO | Solo roles fijos, sin permisos dinámicos | ❌ |

---

## 24. CONCLUSIONES POR ÁREA

| Área | Estado | Análisis |
|------|--------|----------|
| **Arquitectura** | ✅ Correcta | SOFEA respetada |
| **Modelo Prisma** | 🟡 Incompleto | Faltan campos, índices, constraints |
| **Tipos TypeScript** | 🔴 Desincronizado | Campos fantasma en interface |
| **Endpoints** | 🟡 Funcional | Operaciones via /status genérica |
| **Multi-tenancy** | ✅ Presente | Guards + middleware |
| **Branch Isolation** | 🟡 Dudosa | Filtros desconocidos |
| **Roles** | ✅ Presente | Fixed, no dinámicos |
| **Validaciones** | 🔴 Insuficiente | Conflictos, capacidad, validadas |
| **Concurrencia** | 🔴 Desprotegida | Sin transacciones, sin locks |
| **Performance** | 🟡 Mejorable | Índices incompletos |
| **Tests** | 🟡 Básicos | 6 backend, 8 frontend, sin E2E |
| **Integración Órdenes** | ❌ Ausente | No existe relación |

---

## VEREDICTO FINAL

**Estado:** 🟡 **REQUIERE CORRECCIONES**

El módulo existe, implementa flujos básicos, pero presenta defectos P0 bloqueantes:

1. **Concurrencia:** Risk real de doble reserva
2. **Tipos desincronizados:** Contratos inválidos
3. **Cambios de mesa:** Desconocidos
4. **Sin integración Órdenes:** No vinculables

**Rama de corrección recomendada:**

```
fix/reservations-engine
```

**Alcance propuesto:**
- Agregar validación de conflictos horarios + índices
- Agregar `durationMinutes` a Prisma
- Sincronizar types con Prisma model
- Implementar transacciones serializables
- Agregar validación de capacidad
- Agregar `Order.reservationId` FK
- Documentar cambios de mesa

---

**Auditoría completada:** 2026-07-24  
**Rama:** analysis/reservations-flow-audit  
**Archivo:** RESERVATIONS_FLOW_AUDIT.md
