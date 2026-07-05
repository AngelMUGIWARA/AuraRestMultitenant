# DOMAIN & DATA MODEL REVIEW — AuraRest Multitenant

---

## 1. Veredicto ejecutivo

1. El modelo de dominio **cubre los conceptos correctos** pero tiene **inconsistencias de diseño** que impactan la integridad del negocio.
2. El **flujo de Órdenes → Pagos** es el más robusto: validación de estado, transiciones, split payments, propinas. Sin embargo carece de manejo transaccional.
3. **KitchenTicket es un modelo huérfano**: existe en el schema pero **no hay código que lo cree**. La orden se puede confirmar pero nunca llega a cocina.
4. **Sistema de roles dual**: `User.role` (enum) y `UserBranch.roleId` → `Role` model coexisten sin que quede claro cuál es la fuente de verdad.
5. **Sin soporte para pagos parciales**: el sistema rechaza explícitamente pagos que no cubran el total exacto — esto bloquea escenarios reales como "pago a cuenta".
6. **Sin manejo de concurrencia**: no hay optimistic locking, versionado de órdenes, ni idempotency keys. Riesgo real de doble cobro.
7. **Sin transacciones en flujos críticos**: crear orden + ocupar mesa debería ser atómico. Pagar + liberar mesa también.
8. **Sin inventario ni control de stock**: el modelo `MenuItem` tiene `isAvailable` y `status` pero no hay cantidad en stock ni decremento al ordenar.
9. **Reservaciones sin validación de cruce**: no se verifica si la mesa ya está reservada en el mismo horario.
10. **Settings es key-value sin tipos** — propenso a errores en runtime.
11. **ActivityLog existe pero nadie lo alimenta** — no hay middleware que registre automáticamente.
12. **Discount y Promotion tienen campos ambiguos**: `value` y `amount` coexisten sin semántica clara.
13. **La generación de folio no es segura bajo concurrencia**: cuenta órdenes con `startsWith` + count — dos requests simultáneas pueden obtener el mismo folio.
14. **El modelo de datos está bien normalizado** pero le faltan índices compuestos críticos para reporting.
15. **Domain Score: 62/100** — cubre el negocio pero con agujeros que impedirían operar un restaurante real.

---

## 2. Scores

| Dimensión | Score | Justificación |
|-----------|-------|---------------|
| **Domain Model Score** | **62/100** | Conceptos correctos pero roles duales, orphan KitchenTicket, sin inventario |
| **Data Model Score** | **70/100** | Normalización correcta, faltan índices, Settings es key-value inseguro |
| **Business Flow Score** | **55/100** | Flujo principal funciona; parciales, splits de cuenta, reembolsos no existen |
| **Transaction Safety Score** | **25/100** | **Crítico** — 0 transacciones en flujos que claramente las necesitan |
| **Concurrency Safety Score** | **15/100** | **Crítico** — sin versionado, sin locks, sin idempotency, folio no seguro |
| **Reporting Readiness Score** | **60/100** | ReportsService bien hecho, pero faltan índices y datos históricos |

---

## 3. Mapa del dominio actual

```
SISTEMA (public schema)
└── Tenant
    ├── id, name, slug, schemaName, email, status, plan

TENANT (per-schema)
├── Branch (sucursal)
│   ├── id, name, slug, address, phone, email, manager, isActive
│   ├── ├── Settings (key-value)
│   ├── ├── ActivityLog
│   └── └── Orders[]
│   └── RestaurantTable[]
│
├── User
│   ├── id, name, email, passwordHash, role (enum), status
│   ├── ├── UserBranch (userId + branchId + roleId)
│   ├── ├── Orders[]
│   └── └── Reservations[]
│
├── Role
│   └── Permissions[]
│
├── MenuItem
│   ├── id, name, description, price, status, isAvailable
│   └── Category (belongs to)
│
├── Order
│   ├── id, folio, type, status, subtotal, tax, total
│   ├── ├── OrderItem[] (menuItemId, quantity, unitPrice, subtotal)
│   ├── ├── Payment[]
│   ├── ├── KitchenTicket? (1:1)
│   ├── ├── Discount?
│   └── └── Table? / Branch? / User
│
├── Payment
│   ├── id, amount, method, status, reference
│   └── Tip? (1:1)
│
├── Reservation
│   ├── branchId, tableId, userId?, guestName, partySize, scheduledAt, status
│
├── Discount / Promotion
│   └── Orders[]
│
└── KitchenTicket
    └── Order (1:1)
```

---

## 4. Bounded contexts detectados

| Contexto | Módulo NestJS | Entidades |
|----------|--------------|-----------|
| **Tenant Management** | TenantsModule | Tenant (system) |
| **Authentication & Authorization** | AuthModule | User, Role, Permission, UserBranch |
| **Branch Management** | BranchesModule | Branch, Settings, ActivityLog |
| **Menu & Catalog** | MenusModule + CategoriesModule | MenuItem, Category |
| **Orders & Kitchen** | OrdersModule | Order, OrderItem, KitchenTicket |
| **Payments** | PaymentsModule | Payment, Tip |
| **Reservations** | ReservationsModule | Reservation |
| **Pricing** | DiscountsModule + PromotionsModule | Discount, Promotion |
| **Reporting** | ReportsModule | (read-only queries) |
| **Tables** | TablesModule | RestaurantTable |

**Problema**: `TablesModule` es un módulo separado pero `RestaurantTable` se usa en Orders, Reservations, y Payments. La mesa es un agregado compartido, no un contexto propio.

---

## 5. Entidades correctas

| Entidad | Archivo | Motivo |
|---------|---------|--------|
| **Tenant** | `prisma/system/schema.prisma:30-44` | Modelo limpio, slug+email únicos, schemaName aislado, plan y status bien definidos |
| **Order** | `prisma/tenant/schema.prisma:190-216` | Cubre todas las propiedades necesarias (folio, tipo, estado, impuestos, descuento, relaciones) |
| **OrderItem** | `prisma/tenant/schema.prisma:218-232` | Precio unitario congelado en el momento de la orden (no referencia a MenuItem.price que puede cambiar) — **decisión correcta** |
| **Payment** | `prisma/tenant/schema.prisma:234-251` | Amount, method, status, reference, processedAt — completo |
| **Tip** | `prisma/tenant/schema.prisma:323-333` | Relación 1:1 con Payment, amount + method |
| **Branch** | `prisma/tenant/schema.prisma:339-357` | Slug único, manager, isActive — correcto |
| **UserBranch** | `prisma/tenant/schema.prisma:382-395` | Many-to-many User-Branch con role específico por sucursal — **decisión correcta** |
| **Reservation** | `prisma/tenant/schema.prisma:268-287` | Guest info, partySize, scheduledAt, status con estados realistas (ARRIVED, NO_SHOW) |

---

## 6. Entidades problemáticas

| Entidad | Archivo | Problema |
|---------|---------|----------|
| **User.role** | `prisma/tenant/schema.prisma:119` | Existe `User.role` (enum) Y `UserBranch.roleId` → `Role.name`. **Roles duales**. ¿El waiter tiene rol WAITER en User.role pero un roleId diferente en UserBranch? ¿Cuál gobierna? |
| **KitchenTicket** | `prisma/tenant/schema.prisma:253-266` | **Huérfano**. Modelo definido pero no hay módulo, servicio, controlador ni lógica que lo cree. La orden pasa de CONFIRMED a IN_PROGRESS sin crear ticket. |
| **Discount** | `prisma/tenant/schema.prisma:289-305` | Campos `value` y `amount` coexisten sin semántica clara. Para PERCENTAGE, ¿value = porcentaje? ¿amount = monto fijo máximo? Para FIXED, ¿value = monto? ¿amount también? |
| **Promotion** | `prisma/tenant/schema.prisma:307-321` | `value` para BUY_X_GET_Y no tiene sentido. `startsAt`/`endsAt` existen pero no se validan. Tipo FREE_ITEM sin campo `freeItemId`. |
| **Settings** | `prisma/tenant/schema.prisma:397-409` | Key-value sin tipos. `value` es String para todo. Cualquier typo en key pasa desapercibido hasta runtime. Sin defaults. |
| **Permission** | `prisma/tenant/schema.prisma:372-380` | No hay many-to-many con Role. Es one-to-many (un role tiene muchas permissions). Pero `name` es único global, no por role. |
| **MenuItem** | `prisma/tenant/schema.prisma:151-168` | Tiene `status` Y `isAvailable` — duplicación semántica. `isAvailable` es booleano, `status` es enum con AVAILABLE/UNAVAILABLE/OUT_OF_STOCK. Confuso. |

---

## 7. Entidades faltantes

| Entidad faltante | Motivo |
|-----------------|--------|
| **Inventory / Stock** | No hay control de existencias. `MenuItem` no tiene `stock`, `minStock`, ni tracking de inventario. Un restaurante real necesita saber si un platillo se puede preparar. |
| **Shift / Turno** | No hay concepto de turno de trabajo. No se puede saber qué meseros/cajeros/cocineros estaban trabajando en un momento dado. |
| **Cash Register / Corte de caja** | No hay modelo de caja registradora. No se puede hacer corte de caja (X-read, Z-read). |
| **Supplier / Proveedor** | No hay modelo de proveedores para gestión de inventario. |
| **Purchase Order / Compra** | No hay órdenes de compra a proveedores. |
| **Recipe / Receta** | No hay desglose de ingredientes por platillo. |
| **Invoice / Factura** (CFDI) | No hay modelo fiscal. Para México (por los nombres en español), se necesitaría facturación con CFDI. |
| **Customer / Cliente** | No hay entidad Cliente. `Order.customerName` es un string libre sin relación. `Reservation.guestName` igual. No hay historial de cliente ni "cliente frecuente". |
| **Order modification log** | No hay registro de modificaciones a la orden después de creada. Si un mesero modifica items, no hay trazabilidad. |
| **Table merge group** | No hay modelo para unir mesas. Una orden en una "mesa grande" compuesta por 2 mesas pequeñas no es representable. |
| **Discount/Promotion usage log** | No hay registro de qué descuento se aplicó a qué orden en qué momento. |

---

## 8. Entidades sobrantes

| Entidad | Motivo |
|---------|--------|
| **Permission** | El modelo `Permission` es one-to-many con Role, pero el sistema actualmente usa el enum `UserRole` para autorización via `@Roles()` decorator. `Permission` no se usa en ningún guard. Es código muerto. |
| **KitchenTicket** (como está) | El modelo está definido pero su lógica no se implementó. Como está ahora, sobra porque está huérfano. Si se implementa, es necesario. |
| **MenuItem.isAvailable** | Duplica `MenuItem.status`. `status: AVAILABLE` implica `isAvailable: true`. `status: OUT_OF_STOCK` implica `isAvailable: false`. Sobra. |

---

## 9. Revisión del schema system

```prisma
// prisma/system/schema.prisma
model Tenant {
  id         String       @id @default(cuid())
  name       String
  slug       String       @unique
  schemaName String       @unique @map("schema_name")
  email      String       @unique
  phone      String?
  address    String?
  logoUrl    String?      @map("logo_url")
  status     TenantStatus @default(ACTIVE)
  plan       TenantPlan   @default(FREE)
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt      @map("updated_at")

  @@map("tenants")
}
```

✅ Correcto: `slug` unique, `schemaName` unique, `email` unique, `status` con enum, `plan` con enum.
✅ Correcto: `TenantPlan` = FREE/BASIC/PRO/ENTERPRISE — permite escalar precios.
✅ Correcto: `TenantStatus` = ACTIVE/INACTIVE/SUSPENDED — permite deshabilitar tenants.

⚠️ Observación: No hay `createdBy` o `ownerId` para saber qué usuario creó el tenant.
⚠️ Observación: No hay `timezone` — multitenant con restaurantes en diferentes zonas horarias.
⚠️ Observación: No hay `defaultLanguage` — útil para cadenas multi-idioma.

---

## 10. Revisión del schema tenant

### Tabla User
```prisma
model User {
  id           String     @id @default(cuid())
  name         String
  email        String     @unique
  passwordHash String     @map("password_hash")
  role         UserRole   @default(WAITER)
  status       UserStatus @default(ACTIVE)
  phone        String?
  avatarUrl    String?    @map("avatar_url")
}
```

❌ **Problema**: `email` unique dentro del schema del tenant. Si un usuario trabaja en dos restaurantes (dos tenants diferentes), tendría cuentas separadas. Esto es correcto, pero si el mismo email existe en dos branches del mismo tenant, no puede. OK para el negocio.
❌ **Problema de roles duales**: `User.role` es enum. `UserBranch.roleId` apunta a `Role.id`. ¿Qué pasa si un usuario es ADMIN en el User.role pero MANAGER en UserBranch? ¿Cuál prevalece?
❌ **Falta**: `lastLoginAt`, `failedLoginAttempts`, `lockedUntil` — seguridad.

### Tabla Order
```prisma
model Order {
  id           String      @id @default(cuid())
  folio        String      @unique
  tableId      String?     @map("table_id")
  branchId     String?     @map("branch_id")
  userId       String      @map("user_id")
  customerName String?     @map("customer_name")
  type         OrderType   @default(DINE_IN)
  status       OrderStatus @default(PENDING)
  notes        String?
  subtotal     Decimal     @db.Decimal(10, 2)
  tax          Decimal     @db.Decimal(10, 2)
  total        Decimal     @db.Decimal(10, 2)
  discountId   String?     @map("discount_id")
}
```

✅ Correcto: `Decimal(10,2)` para todos los montos.
✅ Correcto: `folio` unique — necesario para negocio.
✅ Correcto: Valores congelados (unitPrice en OrderItem, no referencia a MenuItem.price).
⚠️ `branchId` es String? (opcional) — pero toda orden debería pertenecer a una sucursal.
❌ Falta: `version` integer para optimistic locking.
❌ Falta: `discountAmount` — ¿cuánto descuento se aplicó? Solo está la referencia a Discount pero no el monto congelado.
❌ Falta: `promotionId` — no hay relación con Promotion en Order.
❌ Falta: `cancelledBy`, `cancelledAt` — trazabilidad de cancelación.

### Tabla MenuItem
```prisma
model MenuItem {
  id          String         @id @default(cuid())
  name        String
  description String?
  price       Decimal        @db.Decimal(10, 2)
  imageUrl    String?        @map("image_url")
  status      MenuItemStatus @default(AVAILABLE)
  isAvailable Boolean        @default(true) @map("is_available")
  categoryId  String         @map("category_id")

  @@unique([name, categoryId])
}
```

✅ Correcto: `@@unique([name, categoryId])` — no puede haber dos platos con el mismo nombre en la misma categoría.
❌ `status` e `isAvailable` duplicados semánticamente.
❌ Falta: `stock` (para control de inventario), `cost` (para margen de ganancia), `preparationTime` (para cocina).

### Tabla RestaurantTable
```prisma
model RestaurantTable {
  id           String      @id @default(cuid())
  number       Int
  name         String?
  capacity     Int
  status       TableStatus @default(AVAILABLE)
  locationZone String?     @map("location_zone")
  isActive     Boolean     @default(true) @map("is_active")
  branchId     String      @map("branch_id")

  @@unique([number, branchId])
  @@index([branchId])
}
```

✅ Correcto: `@@unique([number, branchId])` — el número de mesa es único por sucursal.
✅ Correcto: `@@index([branchId])` — índice para filtrar por sucursal.
❌ Falta: `shape` (rectangular, redonda), `x`, `y` (posición en mapa del restaurante).
⚠️ `capacity` es Int sin units — se asume número de personas. OK.

### Tabla Payment
```prisma
model Payment {
  id           String        @id @default(cuid())
  orderId      String        @map("order_id")
  amount       Decimal       @db.Decimal(10, 2)
  method       PaymentMethod @default(CASH)
  status       PaymentStatus @default(PENDING)
  reference    String?
  tipAmount    Decimal?      @map("tip_amount") @db.Decimal(10, 2)
  ticketPdfUrl String?       @map("ticket_pdf_url")
  processedAt  DateTime?     @map("processed_at")
}
```

✅ Correcto: `amount` congelado, `method`, `status`, `processedAt`.
⚠️ `tipAmount` está aquí pero también existe `Tip` como modelo separado. Duplicación.
❌ Falta: `refundedAt`, `refundReason`, `processorTransactionId` — para reembolsos.
❌ Falta: `idempotencyKey` — para prevenir doble cobro.

### Tabla Reservation
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
}
```

❌ `tableId` es obligatorio pero debería ser opcional: una reservación puede pedir "cualquier mesa para 4" sin asignar una específica.
❌ Falta: `duration` (duración estimada de la reserva), `confirmationCode`.
❌ Falta: `specialRequests` (peticiones especiales: "mesa cerca de ventana", "pastel de cumpleaños").
❌ No hay `@@index([branchId, scheduledAt])` para búsquedas de disponibilidad.

### Tabla Settings
```prisma
model Settings {
  id        String   @id @default(cuid())
  branchId  String   @unique @map("branch_id")
  key       String
  value     String

  @@unique([branchId, key])
}
```

❌ **Problema grave**: El diseño key-value sin tipos es propenso a errores. No hay forma de saber qué keys existen, qué valores aceptan, ni validarlos. Preferir columnas específicas o un schema JSON tipado.

---

## 11. Relaciones y cardinalidades

| Relación | Tipo | ¿Correcta? |
|----------|------|------------|
| Tenant → (no tiene relaciones) | — | ✅ Aislado en schema public |
| Order → OrderItem | 1:N | ✅ Cascade lógico |
| Order → Payment | 1:N | ✅ Una orden puede tener múltiples pagos (split) |
| Order → KitchenTicket | 1:1 | ✅ Una orden tiene un ticket de cocina (orderId unique) |
| Order → Table | N:1 (tableId opcional) | ⚠️ Opcional correcto para TAKEOUT/DELIVERY |
| Order → Branch | N:1 (branchId opcional) | ❌ **Debería ser obligatorio** |
| Order → User | N:1 | ✅ |
| Order → Discount | N:1 (discountId opcional) | ⚠️ Correcto, descuento opcional |
| OrderItem → MenuItem | N:1 | ✅ |
| Payment → Tip | 1:1 | ✅ |
| Reservation → Table | N:1 | ❌ tableId debería ser opcional |
| Reservation → Branch | N:1 | ✅ |
| UserBranch → User | N:1 | ✅ |
| UserBranch → Branch | N:1 | ✅ |
| UserBranch → Role | N:1 | ✅ |
| Role → Permission | 1:N | ✅ (pero no se usa) |
| Branch → Settings | 1:1? | ⚠️ branchId es unique, pero sugiere 1:1. El `@@unique([branchId, key])` sugiere 1:N. Contradicción. |
| MenuItem → Category | N:1 | ✅ |

---

## 12. Constraints e índices

### Uniques actuales:
- `Tenant.slug` ✅
- `Tenant.schemaName` ✅
- `Tenant.email` ✅
- `User.email` ✅ (por schema de tenant)
- `Order.folio` ✅
- `Branch.slug` ✅ (por schema de tenant)
- `MenuItem @@unique([name, categoryId])` ✅
- `RestaurantTable @@unique([number, branchId])` ✅
- `Discount.code` ✅ (nullable — ok)
- `Settings @@unique([branchId, key])` ✅
- `Role.name` ✅
- `Permission.name` ✅ (único global, no por role)
- `KitchenTicket.orderId` ✅ (único, 1:1 con Order)
- `Tip.paymentId` ✅ (único, 1:1 con Payment)
- `UserBranch @@unique([userId, branchId])` ✅

### Índices actuales:
- `RestaurantTable @@index([branchId])` ✅

### Índices faltantes:

| Índice faltante | Motivo |
|----------------|--------|
| `Order @@index([branchId, status])` | Reportes de órdenes por sucursal y estado |
| `Order @@index([createdAt])` | Reportes por fecha (actualmente hace scan completo time-based) |
| `Order @@index([branchId, createdAt])` | Reportes por sucursal + fecha |
| `OrderItem @@index([menuItemId])` | Reportes de productos más vendidos |
| `Payment @@index([orderId])` | Ya existe implícitamente por FK, pero explícito mejora performance |
| `Payment @@index([method, createdAt])` | Reportes por método de pago |
| `Reservation @@index([branchId, scheduledAt])` | Búsqueda de disponibilidad |
| `ActivityLog @@index([branchId, createdAt])` | Auditoría por sucursal |
| `ActivityLog @@index([entity, entityId])` | Auditoría por entidad |

---

## 13. Flujos de negocio soportados

| Flujo | Soporte | Archivo |
|-------|---------|---------|
| Crear tenant | ✅ | `tenants.service.ts:20` |
| Crear sucursal | ✅ | `branches.service.ts:36` |
| Crear usuarios | ✅ | `users.service.ts:40` |
| Invitar usuario | ✅ | `users.service.ts:46` |
| Crear menú | ✅ | `menus.service.ts` |
| Crear mesas | ✅ | `tables.service.ts` |
| **Crear orden** | ✅ | `orders.service.ts:22` — valida items, calcula impuestos, genera folio |
| **Ocupar mesa al crear orden** | ✅ | `orders.service.ts:61-65` |
| **Enviar orden a cocina** | ❌ **No** | `KitchenTicket` nunca se crea. `order:confirmed` no tiene handler. |
| **Cambiar estado de cocina** | ❌ **No** | No hay kitchen controller/service |
| Cambiar estado de orden | ✅ | `orders.service.ts:87` — con validación de transiciones |
| Procesar pago | ✅ | `payments.service.ts:17` — con validación de montos |
| Liberar mesa al pagar | ✅ | `payments.service.ts:108-114` |
| Generar reportes | ✅ | `reports.service.ts` |
| Activity logs | ❌ **No implementado** | No hay código que cree ActivityLog registros |
| Crear reservación | ✅ | `reservations.service.ts:14` |
| Cancelar reservación | ✅ | `reservations.service.ts:56` (via updateStatus) |

---

## 14. Flujos de negocio incompletos

| Flujo | Problema |
|-------|----------|
| **Orden → Cocina** | ❌ No se crea KitchenTicket. La orden pasa a CONFIRMED/IN_PROGRESS pero no hay ticket en cocina. No hay WebSocket para notificar. |
| **Cocina → Orden completada** | ❌ No hay endpoint para que cocina marque ticket como READY/DELIVERED. |
| **Pago parcial** | ❌ `payments.service.ts:62-68` rechaza explícitamente pagos que no cubran el total. Un cliente no puede "pagar a cuenta". |
| **Reembolso** | ❌ No existe flujo de reembolso. Una vez PAID, no hay vuelta atrás. |
| **Cancelación con reembolso** | ❌ `orders.service.ts:131` permite cancelar orden CONFIRMED/IN_PROGRESS/READY/DELIVERED pero no reintegra pagos si ya se hizo algún cobro. |
| **Aplicar descuento** | ⚠️ `Order.discountId` existe pero no hay lógica en `OrdersService.create()` que valide el descuento (activo, vigente, monto mínimo). |
| **Aplicar promoción** | ❌ `Order` no tiene `promotionId`. Las promociones no se aplican en ninguna parte. BUY_X_GET_Y y FREE_ITEM no tienen lógica. |
| **Modificar orden después de enviada** | ❌ No hay endpoint PATCH `/orders/:id/items`. Un mesero no puede agregar/quitar items de una orden ya creada. |
| **Cambio de mesa** | ❌ No hay endpoint para mover una orden de una mesa a otra. |
| **Unión de mesas** | ❌ No existe modelo ni endpoint. |
| **Separación de cuenta** | ❌ No existe. Cada Order tiene un total. No hay "cuenta dividida entre comensales". |
| **Corte de caja** | ❌ No existe. |
| **No-show de reservación** | ⚠️ `ReservationStatus` incluye NO_SHOW, pero no hay lógica automática que lo active. |

---

## 15. Casos borde soportados

| Caso | Soporte | Detalle |
|------|---------|---------|
| Pago parcial | ❌ | Rechazado explícitamente (`payments.service.ts:62-68`) |
| Split payment (varios métodos) | ✅ | `payments.service.ts:76-87` — loop creando payments por método |
| Propina | ✅ | `payments.service.ts:89-100` — tip en el último payment |
| Cancelación de orden | ✅ | `orders.service.ts:122-146` — con liberación de mesa |
| Descuento | ⚠️ | `Order.discountId` existe pero sin validación en creación |
| Promoción | ❌ | No hay relación Order-Promotion ni lógica de promociones |
| Cambio de mesa | ❌ | No existe endpoint |
| Unión de mesas | ❌ | No existe modelo |
| Separación de cuenta | ❌ | No existe |
| Pedido para llevar (TAKEOUT) | ✅ | `OrderType.TAKEOUT`, `tableId` opcional |
| Delivery | ✅ | `OrderType.DELIVERY` |
| Reimpresión de ticket | ⚠️ | `Payment.ticketPdfUrl` existe pero no hay generación de PDF |
| Orden modificada después de enviarse | ❌ | No hay endpoint de modificación |
| Mesa ocupada por reservación | ❌ | `Reservation` asigna mesa pero no bloquea su creación de orden |
| No-show de reservación | ⚠️ | Enum existe, lógica no implementada |
| Cliente frecuente | ❌ | No hay entidad Customer ni historial |
| Inventario | ❌ | No existe |
| Agotado de producto | ⚠️ | `MenuItem.status.OUT_OF_STOCK` existe pero no hay control automático |
| Impuestos | ✅ | `TAX_RATE = 0.15` fijo en `orders.service.ts:18` |
| Corte de caja | ❌ | No existe |
| Turnos | ❌ | No existe |
| Multi-sucursal | ✅ | `BranchContext`, `branchId` en entidades clave |
| Reportes por sucursal | ✅ | `reports.service.ts` con filtro branchId |
| Reportes por usuario | ❌ | No hay endpoint de reportes por usuario |
| Reportes por método de pago | ✅ | `reports.service.ts` `getPaymentsReport()` |

---

## 16. Casos borde no soportados

| Caso | Impacto |
|------|---------|
| Pago parcial a cuenta | **Alto** — clientes no pueden pagar en parcialidades |
| Reembolso | **Alto** — una vez cobrado, no hay marcha atrás |
| Orden modificada post-envío | **Alto** — meseros no pueden corregir pedidos |
| Separación de cuenta | **Alto** — grupos no pueden dividir la cuenta |
| Unión de mesas | **Medio** — mesas grandes no son representables |
| Corte de caja | **Alto** — no se puede cuadrar caja al cierre del día |
| Turnos | **Medio** — no se puede asignar personal a turnos |
| Cliente frecuente / Loyalty | **Medio** — no hay programa de fidelidad |
| Facturación fiscal (CFDI) | **Alto** — para México, es requisito legal |
| Inventario con ajustes | **Medio** — no se puede dar de baja un producto cuando se agota |
| Múltiples impuestos (IVA diferenciado) | **Medio** — México tiene IVA 16% en alimentos, 0% en algunos, 8% en frontera. Tasa fija 15% no es correcta. |

---

## 17. Riesgos de integridad

| Riesgo | Dónde | Descripción |
|--------|-------|-------------|
| **Doble cobro** | `payments.service.ts` | Sin transacción ni idempotency key. Dos requests simultáneas de pago pueden procesarse ambas si la primera aún no actualiza Order.status a PAID. |
| **Orden huérfana** | `orders.service.ts:61-65` | Si falla `updateTableStatus()` después de crear la orden, la orden existe pero la mesa no se marca OCCUPIED. Sin transacción. |
| **Mesa ocupada incorrectamente** | `orders.service.ts:22-69` | No se verifica si la mesa ya está OCCUPIED antes de asignarla. Dos órdenes simultáneas pueden ocupar la misma mesa. |
| **Folio duplicado** | `orders.service.ts:267-274` | `generateFolio()` cuenta órdenes con `startsWith` y suma 1. Dos creaciones simultáneas pueden obtener el mismo count. |
| **Ticket de cocina huérfano** | NO EXISTE | KitchenTicket nunca se crea. Las órdenes CONFIRMED/IN_PROGRESS no tienen representación en cocina. |
| **Descuento inválido** | `orders.service.ts` | No se valida que Discount esté activo, no haya expirado, ni que la orden cumpla `minPurchase`. |
| **Reservación duplicada** | `reservations.repository.ts` | No se verifica si la mesa ya tiene una reservación en el mismo horario. Doble booking. |
| **Borrado de datos históricos** | `users.repository.ts:122` | `delete()` en User — borra físicamente. Un usuario no debería eliminarse, solo marcarse como INACTIVE. |
| **Pérdida de relación de descuento** | `orders.service.ts` | `discountId` se guarda, pero si Discount se modifica después, se pierde el contexto del descuento aplicado. Debería congelar `discountName`, `discountValue`, `discountAmount`. |

---

## 18. Riesgos de concurrencia

| Escenario | Riesgo | Solución necesaria |
|-----------|--------|-------------------|
| Dos cajeros cobran la misma orden | **ALTO** — ambos pasan la validación de `pendingAmount` porque ninguno ha actualizado Order.status a PAID aún | Optimistic locking (version field) + transaction |
| Dos meseros crean orden en la misma mesa | **ALTO** — mesa queda OCCUPIED dos veces | Verificar `Table.status` dentro de la transacción de creación |
| Cocina actualiza tickets simultáneamente | **MEDIO** — dos updates de status pueden entremezclarse | Versionado del ticket |
| Reservaciones simultáneas para misma mesa y hora | **ALTO** — doble booking | Unique constraint temporal o lock pesimista en el horario |
| Pagos simultáneos | **ALTO** — ver "doble cobro" | Idempotency key por request + serializable transaction |
| Generación de folio | **MEDIO** — folio duplicado | Secuencia atomica en DB o UUID |
| Cambio de estado fuera de orden | **MEDIO** — saltar de PENDING a READY sin pasar por CONFIRMED/IN_PROGRESS | El `validTransitions` map mitiga esto parcialmente, pero no es transaction-safe |

---

## 19. Transacciones faltantes

Para cada flujo, indico si REQUIERE transacción Prisma:

| Flujo | ¿Requiere transacción? | Estado actual |
|-------|------------------------|---------------|
| Crear orden + items + ocupar mesa | ✅ **SÍ** — 3 operaciones atómicas | ❌ No — `orders.service.ts:39-69` |
| Pagar + liberar mesa | ✅ **SÍ** — 3 operaciones (crear payment, update order, update table) | ❌ No — `payments.service.ts:76-114` |
| Cancelar orden + liberar mesa | ✅ **SÍ** — 2 operaciones atómicas | ❌ No — `orders.service.ts:122-146` |
| Crear usuario + UserBranch | ✅ **SÍ** — 2 operaciones | ❌ No — `users.repository.ts:62-99` |
| Aplicar descuento + recalcular total | ✅ **SÍ** | ❌ No implementado |
| Crear orden + notificar cocina (KitchenTicket) | ✅ **SÍ** | ❌ No implementado |
| Reservar mesa + validar disponibilidad | ✅ **SÍ** | ❌ No — `reservations.repository.ts` |
| Procesar split payment (múltiples métodos) | ✅ **SÍ** — todos los splits deben ser atómicos | ❌ No — `payments.service.ts:76-87` |
| Actualizar inventario al crear orden | ✅ **SÍ** (cuando exista inventario) | ❌ No existe inventario aún |
| Reembolso + restaurar estado de orden | ✅ **SÍ** | ❌ No implementado |

---

## 20. Auditoría e historial

| Pregunta | Respuesta |
|----------|-----------|
| ¿Se pierde información importante? | ✅ **Sí**. Cuando se cancela una orden, se sabe quién (userId) y por qué (notes), pero no se guarda el snapshot de la orden al momento de cancelación. |
| ¿Hay logs de cambios? | ❌ **No**. `ActivityLog` existe como modelo pero **no hay código** que lo alimente. Nadie crea registros de actividad. |
| ¿Se puede reconstruir quién hizo qué? | ❌ **No**. Sin activity logs, no hay trazabilidad de quién modificó qué y cuándo. |
| ¿Se puede auditar un pago? | ⚠️ **Parcial**. `Payment` tiene `processedAt` y `createdAt`, pero no quién procesó el pago (no hay `processedBy` userId). |
| ¿Se puede auditar una cancelación? | ⚠️ **Parcial**. `Order.notes` puede contener la razón, pero no hay campo `cancelledBy` ni `cancelledAt`. |
| ¿Se puede auditar una modificación de orden? | ❌ **No**. No hay historial de cambios en OrderItems. Si se modifica una orden, el estado anterior se pierde. |
| ¿Se puede consultar historial sin romper datos actuales? | N/A — no hay historial que consultar. |

### Recomendaciones de auditoría:
1. Agregar `processedBy` (userId) a `Payment`.
2. Agregar `cancelledBy`, `cancelledAt` a `Order`.
3. Agregar `modifiedBy`, `modifiedAt` a `Order`.
4. Implementar `ActivityLogService` que cree registros de auditoría automáticamente.
5. Agregar middleware/interceptor que logee automáticamente operaciones CRUD.
6. Para `OrderItem`, considerar tabla de versiones o snapshot al modificar.

---

## 21. Reportes y analítica

| Reporte | ¿Soportado? | Archivo |
|---------|-------------|---------|
| Ventas por día | ✅ | `reports.service.ts:44-79` |
| Ventas por sucursal | ⚠️ Parcial | Filtro branchId existe en query pero no en ReportsRepository |
| Ventas por usuario | ❌ | No hay endpoint |
| Ventas por método de pago | ✅ | `reports.service.ts:137-155` |
| Productos más vendidos | ✅ | `reports.service.ts:106-119` |
| Horas pico | ✅ | `reports.service.ts:175-193` |
| Propinas | ❌ | No hay reporte de propinas |
| Descuentos aplicados | ❌ | No hay agregación por descuento |
| Promociones aplicadas | ❌ | No hay relación Order-Promotion |
| Cancelaciones | ❌ | No hay reporte de cancelaciones |
| Reservaciones | ⚠️ Parcial | `reservations.service.ts:55` — stats básicas (totales por estado) |
| Ocupación de mesas | ❌ | No hay reporte de ocupación |

---

## 22. Cambios recomendados al modelo

| Prioridad | Entidad/tabla | Problema | Cambio recomendado | Riesgo | Beneficio |
|-----------|--------------|----------|-------------------|--------|-----------|
| **CRÍTICO** | `Order` | Sin protección de concurrencia en pagos | Agregar `version Int @default(1)` y usar optimistic locking en payment flow | Bajo — campo nuevo, lectura en updates | Previene doble cobro |
| **CRÍTICO** | `Payment` | Sin idempotency | Agregar `idempotencyKey String? @unique` y validar antes de procesar | Bajo — campo opcional | Previene doble cobro |
| **CRÍTICO** | `Order.folio` | Generación no segura bajo concurrencia | Cambiar a UUID con prefijo de fecha y secuencia atomica en DB | Medio — rompe formato actual | Folio único garantizado |
| **CRÍTICO** | `KitchenTicket` | Huérfano — nadie lo crea | Implementar creación automática al confirmar orden + endpoints de cocina | Medio — nuevo módulo | Flujo cocina completo |
| **ALTO** | `Order` | Sin congelamiento de descuento | Agregar `discountName String?`, `discountValue Decimal?`, `discountType DiscountType?` | Bajo — campos opcionales | Trazabilidad de descuentos |
| **ALTO** | `Order` | Sin relación con promoción | Agregar `promotionId String?` + `promotionName String?`, `promotionValue Decimal?` | Bajo — campos opcionales | Trazabilidad de promociones |
| **ALTO** | `Payment` | Sin quién procesó | Agregar `processedBy String?` (userId) | Bajo | Auditoría |
| **ALTO** | `User` | Borrado físico peligroso | Cambiar `users.repository.ts:122` a soft-delete (update status = INACTIVE) | Bajo — cambiar delete por update | No pierde datos históricos |
| **ALTO** | `Reservation.tableId` | Obligatorio pero debería ser opcional | Hacer `tableId String?` (opcional) | Bajo — cambiar schema | Reservas sin mesa asignada |
| **ALTO** | `MenuItem` | `status` e `isAvailable` duplicados | Eliminar `isAvailable`. Usar solo `status` | Bajo | Elimina redundancia |
| **ALTO** | `Payment.tipAmount` | Existe pero también hay modelo `Tip` separado | Eliminar `tipAmount` de Payment (usar relación Tip) | Bajo | DRY |
| **MEDIO** | `Order.branchId` | Opcional pero debería ser obligatorio | Hacer `branchId String` obligatorio + `@@index([branchId])` | Medio — requiere branchId en todas las creaciones | Integridad referencial |
| **MEDIO** | `Reservation` | Sin validación de doble booking | Agregar lógica de verificación + `@@index([tableId, scheduledAt])` | Medio — validación nueva | No doble reserva |
| **MEDIO** | `Settings` | Key-value sin tipos | Reemplazar con columnas específicas o schema JSON tipado con `Json` field + zod validation | Medio — cambio de schema | Type safety |
| **MEDIO** | `Role` / `Permission` | Roles duales | Elegir: ¿User.role (enum) es la fuente de verdad o Role/Permission (modelo)? Recomiendo eliminar `Permission` model (no usado) y migrar a RBAC real cuando sea necesario | Medio — definir estrategia | Claridad |
| **MEDIO** | `Discount` | Campos `value`/`amount` ambiguos | Renombrar: `discountValue` (para PERCENTAGE: porcentaje, para FIXED: monto), `maxAmount` (tope), `minPurchase` (mínimo) | Bajo | Claridad semántica |
| **MEDIO** | Todos los módulos | Sin transacciones | Envolver flujos críticos en `this.db(schemaName).$transaction(...)` | Medio — requiere refactor de repos | Consistencia |
| **BAJO** | `OrderItem` | Sin índice | Agregar `@@index([menuItemId])` | Bajo | Performance en reportes |
| **BAJO** | `Order` | Sin índices de reporting | Agregar `@@index([branchId, status])`, `@@index([createdAt])`, `@@index([branchId, createdAt])` | Bajo | Performance |
| **BAJO** | `Payment` | Sin índices | Agregar `@@index([method, createdAt])` | Bajo | Performance |
| **BAJO** | `Reservation` | Sin índices | Agregar `@@index([branchId, scheduledAt])` | Bajo | Performance |
| **BAJO** | `ActivityLog` | Sin índices | Agregar `@@index([branchId, createdAt])`, `@@index([entity, entityId])` | Bajo | Performance |
| **BAJO** | `Tenant` | Sin timezone | Agregar `timezone String @default("America/Mexico_City")` | Bajo | Soporte multi-zona |

---

## 23. Qué NO cambiaría todavía

| Elemento | Motivo |
|----------|--------|
| **Entidad Customer/Cliente** | El modelo actual con `Order.customerName` y `Reservation.guestName` como strings es suficiente para la Fase 1. Agregar Customer completo es Fase 2. |
| **Entidad Shift/Turno** | No necesario hasta que haya gestión de personal con horarios. |
| **Entidad Supplier/Proveedor + PurchaseOrder/Compra** | Scope de gestión de inventario, no prioritario. |
| **Inventario completo** | Requiere Recipe, Stock, PurchaseOrder, Supplier. Proyecto grande aparte. |
| **Facturación CFDI** | Requiere integración con PAC (Proveedor Autorizado de Certificación). Scope legal/fiscal aparte. |
| **Corte de caja** | Importante pero requiere CashRegister model + reporting. Fase 2. |
| **Module Federation a SPA monolítica** | Ya está invertido el esfuerzo. No revertir ahora. |
| **Eliminar Permission model** | Aunque no se usa, podría ser útil si se implementa RBAC verdadero. Documentar como "reservado para futuro". |

---

## 24. Ruta de implementación recomendada

### Rama A: correcciones seguras del modelo (3-5 días)
*Sin cambios de lógica de negocio — solo schema y validaciones*

1. Eliminar `MenuItem.isAvailable` (duplicado de `status`).
2. Eliminar `Payment.tipAmount` (duplicado de `Tip` model).
3. Hacer `Reservation.tableId` opcional.
4. Agregar índices faltantes (`@@index` en Order, Payment, Reservation, ActivityLog, OrderItem).
5. Agregar `version Int @default(1)` a `Order` para optimistic locking.
6. Agregar `idempotencyKey String? @unique` a `Payment`.
7. Agregar `processedBy String?` a `Payment`, `cancelledBy` y `cancelledAt` a `Order`.
8. Agregar `timezone` a `Tenant`.
9. Renombrar `Discount.value`/`amount` a nombres semánticos.

### Rama B: transacciones e integridad (4-6 días)
*Envolver flujos críticos en transacciones*

1. Envolver `create()` en OrdersService en `$transaction` (orden + items + mesa).
2. Envolver `processPayment()` en PaymentsService en `$transaction` (payments + tip + order status + table status).
3. Envolver `cancel()` en OrdersService en `$transaction`.
4. Envolver `create()` en UsersRepository en `$transaction` (user + UserBranch).
5. Hacer `Order.branchId` obligatorio.
6. Implementar soft-delete en User (cambiar delete por status=INACTIVE).

### Rama C: concurrencia e idempotencia (3-5 días)
*Optimistic locking + validaciones de concurrencia*

1. Implementar optimistic locking en `updateStatus()` de OrdersService.
2. Implementar validación de idempotency key en PaymentsService.
3. Validar `Table.status` antes de asignar en Order creation (dentro de transacción).
4. Validar doble booking en Reservation creation.
5. Cambiar `generateFolio()` a enfoque seguro (secuencia DB o UUID).
6. Agregar verificación de `Table.status` antes de ocupar.

### Rama D: reportes e historial (5-7 días)
*ActivityLog + reportes faltantes + datos congelados*

1. Implementar `ActivityLogService` con middleware automático.
2. Agregar reportes: propinas, descuentos, cancelaciones, ocupación de mesas.
3. Agregar reportes por usuario.
4. Agregar campos congelados a Order (`discountName`, `discountValue`, `promotionName`, `promotionValue`).
5. Implementar creación automática de `KitchenTicket` al confirmar orden.
6. Implementar módulo Kitchen (controller + service + WebSocket).

### Rama E: features futuras (proyecto separado)
*Para la siguiente fase del producto*

1. Customer/Cliente model.
2. Inventario + Stock + Recipe.
3. Corte de caja (CashRegister).
4. Facturación fiscal (CFDI).
5. Múltiples impuestos (tasa configurable por item).
6. Separación de cuenta / división de Order.
7. Unión de mesas.
8. Órdenes modificables post-envío.
9. Pagos parciales con saldo pendiente.
10. Turnos y scheduling.
