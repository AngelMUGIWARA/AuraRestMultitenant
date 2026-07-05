# API DESIGN REVIEW — AuraRest Multitenant

---

## 1. Veredicto ejecutivo

1. La API tiene una **base REST correcta** pero **inconsistencias graves de diseño** que la hacen difícil de consumir y mantener.
2. El **ruteo es inconsistente**: algunos recursos están bajo `admin/` y otros no, sin criterio claro.
3. **Paginación casi inexistente**: solo `Users` y `Orders` implementan paginación. El resto devuelve todos los registros.
4. **PUT vs PATCH es inconsistente** entre módulos: Branches usa PUT, Menus usa PUT, Discounts usa PATCH — misma operación, mismo verbo diferente.
5. **No hay contrato API unificado**: frontend tipa manualmente las respuestas con `@maison/types`, pero el backend no garantiza que las respuestas coincidan.
6. **Sin rate limiting, sin idempotency keys, sin correlation IDs** — la API es insegura para producción empresarial.
7. **Swagger existe pero está incompleto**: módulos críticos (discounts, promotions, tables) carecen de `@ApiOperation`/`@ApiResponse`.
8. **Los DTOs de actualización son inconsistentes**: algunos usan `UpdateDto` específico, otros usan `Partial<CreateDto>`.
9. **No hay manejo global de errores**: cada controller arroja excepciones NestJS estándar sin estructura unificada.
10. **API Ready Score: 52/100** — funcional pero con deuda técnica que crecerá exponencialmente.

---

## 2. Scores

| Dimensión | Score | Justificación |
|-----------|-------|---------------|
| **REST Score** | **55/100** | Rutas inconsistentes (admin/ vs no-admin), PUT vs PATCH mezclado, subrecursos no estandarizados |
| **Consistency Score** | **40/100** | Nombres de DTOs, parámetros, respuestas y filtros varían entre módulos |
| **Documentation Score** | **45/100** | Swagger presente pero incompleto; faltan ejemplos, descriptions y response codes en módulos clave |
| **DX Score** | **50/100** | Frontend tipa manualmente; sin SDK generado; sin contrato compartido backend-frontend |
| **Frontend Compatibility Score** | **60/100** | `@maison/api-client` con fetch nativo es simple y funcional; pero sin typescript generado desde OpenAPI |
| **Future Scalability Score** | **35/100** | Sin versionado real, sin deprecaciones, sin HATEOAS, sin event-driven API patterns |

---

## 3. Mapa completo de endpoints

### Ruta base: `/api/v1`

| Módulo | Path | Métodos |
|--------|------|---------|
| **Auth** | `auth/login` | POST |
| **Tenants** | `admin/tenants` | GET, POST |
| | `admin/tenants/:id` | PUT |
| **Users** | `admin/users` | GET, POST |
| | `admin/users/invite` | POST |
| | `admin/users/:id` | GET, PATCH, DELETE |
| | `admin/users/:id/status` | PATCH |
| **Branches** | `admin/branches` | GET, POST |
| | `admin/branches/stats` | GET |
| | `admin/branches/:id` | GET, PUT, DELETE |
| | `admin/branches/:id/activate` | PATCH |
| | `admin/branches/:id/deactivate` | PATCH |
| **Categories** | `admin/categories` | GET, POST |
| | `admin/categories/stats` | GET |
| | `admin/categories/:id` | GET, PUT, DELETE |
| **Menus** | `admin/menus` | GET, POST |
| | `admin/menus/stats` | GET |
| | `admin/menus/:id` | GET, PUT, DELETE |
| | `admin/menus/:id/price` | PATCH |
| | `admin/menus/:id/status` | PATCH |
| **Reports** | `admin/reports/sales` | GET |
| | `admin/reports/products` | GET |
| | `admin/reports/payments` | GET |
| | `admin/reports/peak-hours` | GET |
| | `admin/reports/export` | GET |
| **Orders** | `orders` | GET, POST |
| | `orders/stats` | GET |
| | `orders/:id` | GET |
| | `orders/:id/status` | PATCH |
| | `orders/:id/cancel` | POST |
| **Payments** | `payments/process` | POST |
| | `payments/order/:orderId` | GET |
| **Tables** | `tables` | GET |
| | `tables/:id` | GET |
| | `tables/:id/status` | PATCH |
| **Discounts** | `discounts` | GET, POST |
| | `discounts/code/:code` | GET |
| | `discounts/:id` | GET, PATCH, DELETE |
| **Promotions** | `promotions` | GET, POST |
| | `promotions/active` | GET |
| | `promotions/:id` | GET, PATCH, DELETE |

---

## 4. Diseño REST

### Inconsistencias de ruteo: `admin/` vs raíz

| Bajo `admin/` | Fuera de `admin/` |
|---------------|-------------------|
| Tenants | Orders |
| Branches | Payments |
| Users | Tables |
| Categories | Discounts |
| Menus | Promotions |
| Reports | Auth |

**Problema**: No hay criterio claro. ¿`admin/` es para administración del sistema vs operación del restaurante? Si es así, Orders y Payments deberían estar fuera (correcto), pero Tables también está fuera. Discounts y Promotions también. Sin embargo Branches —que es operativo— está bajo `admin/`. Inconsistente.

### PUT vs PATCH

| Módulo | Update usa | Acciones específicas |
|--------|-----------|---------------------|
| Tenants | **PUT** `:id` | — |
| Branches | **PUT** `:id` | **PATCH** `:id/activate`, `:id/deactivate` |
| Categories | **PUT** `:id` | — |
| Menus | **PUT** `:id` | **PATCH** `:id/price`, `:id/status` |
| Users | **PATCH** `:id` | **PATCH** `:id/status` |
| Orders | **PATCH** `:id/status` | **POST** `:id/cancel` |
| Tables | **PATCH** `:id/status` | — |
| Discounts | **PATCH** `:id` | — |
| Promotions | **PATCH** `:id` | — |

**Problema**: Misma operación (actualizar recurso) usa PUT en unos y PATCH en otros. PUT debería ser para reemplazo completo (idempotente) y PATCH para actualización parcial. Actualmente se usan indistintamente.

### Subrecursos y acciones

| Patrón | Ejemplo | Evaluación |
|--------|---------|------------|
| `:id/status` | PATCH `branches/:id/activate` | ✅ Correcto (subrecurso de estado) |
| `:id/price` | PATCH `menus/:id/price` | ✅ Correcto (subrecurso específico) |
| `:id/cancel` | POST `orders/:id/cancel` | ⚠️ Aceptable como acción de negocio |
| `code/:code` | GET `discounts/code/:code` | ❌ **Violación REST**. Debería ser `discounts?code=:code` o `discounts/by-code/:code` |
| `order/:orderId` | GET `payments/order/:orderId` | ⚠️ **Inconsistente**. Algunos usan `:id`, otros `:orderId`. |
| `stats` | GET `menus/stats`, `branches/stats`, `orders/stats` | ✅ Correcto como subrecurso de colección |

### Verbos HTTP

| Verbo | Uso actual | ¿Correcto? |
|-------|-----------|------------|
| **GET** | Listar y obtener individual | ✅ |
| **POST** | Crear recursos y acciones (cancel, process) | ✅ |
| **PUT** | Actualización completa | ⚠️ Inconsistente con PATCH |
| **PATCH** | Actualización parcial | ⚠️ Inconsistente con PUT |
| **DELETE** | Eliminar recursos | ✅ |
| **OPTIONS** | NO EXISTE | ❌ Sin CORS preflight handling documentado |

### Pluralización

| Recurso | Plural? | ¿Correcto? |
|---------|---------|------------|
| `auth/login` | N/A | ✅ |
| `admin/tenants` | ✅ | ✅ |
| `admin/branches` | ✅ | ✅ |
| `admin/users` | ✅ | ✅ |
| `orders` | ✅ | ✅ |
| `payments` | ✅ | ✅ |
| `tables` | ✅ | ✅ |
| `discounts` | ✅ | ✅ |
| `promotions` | ✅ | ✅ |
| `admin/categories` | ✅ | ✅ |
| `admin/menus` | ✅ | ❌ **Menus no es plural de menu**. Debería ser `menu` o `menu-items` |
| `admin/reports` | ✅ | ✅ |

---

## 5. Contrato de la API

### ¿Existe un contrato consistente?

**No.** El contrato está fragmentado:

1. **Backend**: DTOs con decoradores `@nestjs/swagger` que generan OpenAPI spec.
2. **Frontend**: Tipos manuales en `@maison/types` (697 líneas, 14 secciones).
3. **`@maison/api-client`**: Cliente HTTP genérico sin tipos específicos por endpoint.

**Problema**: No hay un solo archivo que sea "el contrato". Si el backend cambia un endpoint, el frontend solo se entera en runtime (o en code review). No hay generación de tipos desde OpenAPI.

### ¿Swagger refleja realmente la implementación?

**Parcialmente.** Algunos módulos tienen buena cobertura Swagger:
- **✅ Reports**: `@ApiOperation`, `@ApiResponse`, DTOs tipados.
- **✅ Users**: `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiSecurity`.
- **✅ Branches**: `@ApiOperation`, `@ApiResponse` con tipos.

Swagger incompleto:
- **❌ Discounts**: Sin `@ApiOperation`, sin `@ApiResponse`.
- **❌ Promotions**: Sin `@ApiOperation`, sin `@ApiResponse`.
- **❌ Tables**: Sin `@ApiOperation` (excepto del controller genérico).
- **⚠️ Menus**: Usa `@ApiQuery` pero sin `@ApiResponse`.
- **⚠️ Orders**: Sin `@ApiResponse` en cancel.

### ¿Frontend y backend usan exactamente el mismo contrato?

**No.** Evidencia:

| Elemento | Backend (NestJS DTO) | Frontend (@maison/types) |
|----------|---------------------|--------------------------|
| `ApiResponse<T>` | NO EXISTE en backend | ✅ `ApiResponse<T>` con `data`, `message`, `success`, `timestamp` |
| `PaginatedResponse<T>` | Inconsistente: cada módulo define su propio | ✅ `PaginatedResponse<T>` y `PaginationMeta` |
| `OrderResponse` | `OrderResponseDto` con `orderNumber`, `paymentStatus` | `Order` type en `@maison/types` |
| Error structure | No estandarizado (cada excepción arroja diferente) | `ApiError` con `message`, `statusCode`, `errors` |

**Veredicto**: Backend y frontend tienen **contratos paralelos que no están sincronizados automáticamente**. Los nombres de campos pueden diferir y solo se detectan en pruebas manuales.

### DTOs inconsistentes

| Problema | Ejemplo | Archivo |
|----------|---------|---------|
| `Partial<CreateDto>` usado para update | `dto: Partial<CreateDiscountDto>` en `discounts.controller.ts:56` | `apps/backend/src/discounts/discounts.controller.ts` |
| `Partial<CreateDto>` usado para update | `dto: Partial<CreatePromotionDto>` en `promotions.controller.ts:56` | `apps/backend/src/promotions/promotions.controller.ts` |
| Response DTO duplicado en method | `@ApiResponse({ status: 200, type: SalesReportResponseDto })` en reports vs otros módulos sin response DTO | Varios |
| Groups DTOs en un archivo | `tenants/dto/tenant.dtos.ts` agrupa Create y Update | ✅ vs ❌ inconsistente con modules que separan por archivo |
| UpdateOrderStatusDto vs status en DTO | Enum `OrderStatusDto` duplica `$Enums.OrderStatus` | `orders/dto/update-order-status.dto.ts:5` |
| Payment Method enum duplicado | `PaymentMethodDto` en `process-payment.dto.ts:11` duplica `$Enums.PaymentMethod` | `payments/dto/process-payment.dto.ts` |

### Respuestas distintas para el mismo tipo de operación

| Operación | Backend devuelve | Frontend espera |
|-----------|-----------------|-----------------|
| GET list | Objeto con `data`, `total`, `page`, `limit` (Orders) o array plano (Branches, Tables) | `PaginatedResponse<T>` o array según el caso |
| POST create | Objeto plano del DTO de respuesta | `ApiResponse<T>` con wrapper |
| Errores | Excepción NestJS estándar | `ApiError` con `message`, `statusCode`, `errors` |

---

## 6. HTTP

### GET

| Aspecto | Evaluación |
|---------|-----------|
| Listas | ✅ Correcto |
| Búsqueda por ID | ✅ Correcto |
| Búsqueda por código | ❌ `discounts/code/:code` — debería ser query param |
| Filtros | ⚠️ Inconsistentes (ver sección 8) |
| Paginación | ❌ Solo Users y Orders; el resto devuelve todo |

### POST

| Aspecto | Evaluación |
|---------|-----------|
| Creación | ✅ Correcto |
| Acciones (`cancel`, `process`) | ✅ Correcto |
| Idempotency | ❌ No hay idempotency keys |
| Status codes | ⚠️ 201 en creación (correcto), 200 en acciones (OK) |

### PUT

| Uso | Evaluación |
|-----|-----------|
| Tenants PUT `:id` | ⚠️ Debería ser PATCH (actualización parcial) |
| Branches PUT `:id` | ⚠️ Debería ser PATCH |
| Categories PUT `:id` | ⚠️ Debería ser PATCH |
| Menus PUT `:id` | ⚠️ Debería ser PATCH |

### PATCH

| Uso | Evaluación |
|-----|-----------|
| `:id/status` en Menus | ✅ Correcto |
| `:id/status` en Orders | ✅ Correcto |
| `:id/activate` | ⚠️ Debería ser PATCH `:id` con `{ isActive: true }` |
| `:id` en Discounts | ✅ Correcto (pero usa `Partial<CreateDto>`) |
| `:id` en Promotions | ✅ Correcto (pero usa `Partial<CreateDto>`) |

### DELETE

| Uso | Evaluación |
|-----|-----------|
| `:id` | ✅ Correcto |
| Soft-delete | ❌ Users hace delete físico, no soft-delete |

### OPTIONS

NO EXISTE. Sin preflight CORS handling documentado aunque CORS está habilitado en `main.ts`.

### Códigos HTTP

| Código | Uso actual | ¿Correcto? |
|--------|-----------|------------|
| **200** | GET, POST (acciones), PATCH, PUT | ✅ |
| **201** | POST (creación) en Users, Branches, Menus | ✅ |
| **204** | DELETE en Users | ✅ |
| **400** | `BadRequestException` | ✅ |
| **401** | `UnauthorizedException` | ✅ |
| **403** | `ForbiddenException` (RolesGuard) | ✅ |
| **404** | `NotFoundException` | ✅ |
| **409** | `ConflictException` (email duplicado) | ✅ |
| **422** | NO EXISTE — validaciones de negocio deberían usar este código | ❌ |
| **429** | NO EXISTE — sin rate limiting | ❌ |
| **500** | Errores no manejados | ⚠️ Debería tener un filter global |

### Estructura JSON de respuestas

**No hay estructura uniforme.** Ejemplos:

```typescript
// GET /orders (Orders Controller)
{
  data: Order[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}

// GET /tables (Tables Controller)
Table[]  // array plano, sin wrapper

// GET /admin/branches (Branches Controller)
{ data: Branch[], total: number }  // wrapper diferente

// POST /auth/login (Auth Controller)
{
  accessToken: string,
  refreshToken: string,
  user: { id, name, email, role }
}  // sin ApiResponse wrapper
```

---

## 7. Versionado

### `/api/v1`

✅ Global prefix correcto en `main.ts:9`.

### Posibilidad de v2

No hay mecanismo de versionado por header (`Accept-Version`) ni por path alternativo. Si se necesita v2, habría que:
- Crear un segundo módulo o controlador
- O usar un path prefix diferente

**Problema**: La estructura actual no soporta tener v1 y v2 simultáneamente.

### Compatibilidad

No hay políticas de compatibilidad. Sin deprecaciones, sin `Sunset` headers, sin `Deprecation` headers.

### Deprecaciones

NO EXISTE. No hay mecanismo para marcar un endpoint como deprecated.

---

## 8. Consistencia

### Nombres de parámetros

| Parámetro | Variaciones | ¿Consistente? |
|-----------|------------|---------------|
| ID de recurso | `:id`, `:orderId`, `:code` | ❌ |
| Schema de tenant | Siempre `schemaName` en service layer | ✅ |
| Branch ID | `branchId` en query params | ✅ (cuando existe) |
| Status | `status` string en queries | ⚠️ Algunos usan lowercase (orders), otros uppercase |
| Date | `date` (YYYY-MM-DD) en Orders, `startDate`/`endDate` en Reports | ❌ Inconsistente |

### Nombres de DTOs

| Módulo | Create | Update | Response |
|--------|--------|--------|----------|
| Tenants | `CreateTenantDto` | `UpdateTenantDto` | NO TIENE |
| Branches | `CreateBranchDto` | `UpdateBranchDto` | `BranchResponseDto` |
| Users | `CreateUserDto` | `UpdateUserDto` | `UserResponseDto` |
| Menus | `CreateMenuDto` | `UpdateMenuDto` | NO TIENE |
| Categories | `CreateCategoryDto` | `UpdateCategoryDto` | `CategoryResponseDto` |
| Orders | `CreateOrderDto` | — | `OrderResponseDto` |
| Payments | — | — | `PaymentResponseDto` |
| Discounts | `CreateDiscountDto` | NO TIENE (usa Partial<Create>) | NO TIENE |
| Promotions | `CreatePromotionDto` | NO TIENE (usa Partial<Create>) | NO TIENE |
| Tables | NO TIENE | `UpdateTableStatusDto` | NO TIENE |
| Reservations | `CreateReservationDto` | — | `ReservationResponseDto` |

**Problema**: 5 de 11 módulos carecen de Response DTO. 2 módulos usan `Partial<CreateDto>` en vez de un UpdateDto dedicado.

### Nombres de enums (DTO vs Prisma)

| Concepto | DTO Enum | Prisma Enum | ¿Duplicado? |
|----------|----------|-------------|-------------|
| Order Status | `OrderStatusDto` en `update-order-status.dto.ts` | `$Enums.OrderStatus` | ✅ Sí |
| Payment Method | `PaymentMethodDto` en `process-payment.dto.ts` | `$Enums.PaymentMethod` | ✅ Sí |
| Order Type | `OrderTypeDto` en `create-order.dto.ts` | `$Enums.OrderType` | ✅ Sí |

**Problema**: Cada DTO re-declara enums que ya existen en Prisma. Si se agrega un nuevo status, hay que actualizar en 2 lugares.

### Nombres de filtros

| Módulo | Filtro usado | Notación |
|--------|-------------|----------|
| Orders | `OrderQueryDto` | `status`, `type`, `search`, `date`, `page`, `limit` |
| Menus | `@Query('categoryId')` | `categoryId` |
| Reports | `SalesReportQueryDto` | `startDate`, `endDate`, `branchId` |
| Branches | `BranchFiltersDto` | (declarado pero no usado en service) |
| Otros | Sin filtros | — |

**Problema**: No hay convención de nombres para filtros.

### Nombres de query params

| Parámetro | Orders | Reports | Menus |
|-----------|--------|---------|-------|
| Fecha | `date` | `startDate`/`endDate` | — |
| Sucursal | `branchId` | `branchId` | — |
| Búsqueda | `search` | — | — |
| Estado | `status` | — | — |
| Página | `page` | — | — |
| Límite | `limit` | — | — |

---

## 9. Paginación

### Estado actual

| Módulo | Paginación | Implementación |
|--------|-----------|---------------|
| Users | ✅ | `PaginationDto` con `page`, `limit`, `skip` |
| Orders | ✅ | `OrderQueryDto` con `page`, `limit` (max 100) |
| Branches | ❌ | Sin paginación |
| Categories | ❌ | Sin paginación |
| Menus | ❌ | Sin paginación |
| Tables | ❌ | Sin paginación |
| Discounts | ❌ | Sin paginación |
| Promotions | ❌ | Sin paginación |
| Reservations | ❌ | Sin paginación |
| Reports | ❌ | Reportes por fecha, no paginables |
| Tenants | ❌ | Normal (pocos tenants) |

### Estructura existente

```typescript
// PaginationDto (common)
{ page?: number; limit?: number; get skip(): number }

// Orders response
{ data: Order[]; total: number; page: number; limit: number; totalPages: number }

// Users response
{ data: User[]; total: number; page: number; limit: number; totalPages: number }

// Branches response
{ data: Branch[]; total: number }  // sin page/limit/totalPages

// Tables response
Table[]  // array plano
```

**Problemas**:
1. `PaginationDto` existe pero solo lo usa Users.
2. Orders tiene su propia versión (`OrderQueryDto`) que duplica `PaginationDto`.
3. El resto no soporta paginación — problemático con > 100 registros.
4. No hay cursor-based pagination para datos en tiempo real (órdenes).
5. `PaginationDto` expone `skip` como getter, pero `skip` es un concepto interno, no debería estar en el DTO.

---

## 10. Filtros

### Consistencia actual

| Filtro | ¿Existe? | ¿Consistente? |
|--------|----------|---------------|
| `status` | ✅ Orders, Reports (parcial) | ⚠️ Orders usa lowercase (`pending`), Reports usa uppercase (PENDING) |
| `branchId` | ✅ Orders, Reports | ✅ Consistente |
| `date` / `startDate` / `endDate` | ✅ Orders (`date`), Reports (`startDate`, `endDate`) | ❌ Mismo concepto, nombres diferentes |
| `search` | ✅ Orders | ✅ |
| `categoryId` | ✅ Menus | ✅ |
| `type` | ✅ Orders | ✅ |
| `sort` | ❌ NO EXISTE | ❌ |
| `direction` | ❌ NO EXISTE | ❌ |
| `tenant` | N/A (se resuelve via middleware/header) | ✅ |

### Problemas específicos

**Orders**: `status` acepta lowercase y lo mapea internamente (`orders.service.ts:84-91`):
```typescript
const map: Record<string, string> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  preparing: 'IN_PROGRESS',
  ready: 'READY',
  delivered: 'DELIVERED',
  paid: 'PAID',
  cancelled: 'CANCELLED',
};
where.status = map[query.status] || query.status;
```
Si alguien envía `PENDING` (uppercase), el map no lo reconoce y pasa directo. Inconsistente.

**Branches**: `BranchFiltersDto` existe pero el controller lo ignora y pasa `{}`:
```typescript
// branches.controller.ts:52-55
getAll(@CurrentTenant() tenant: TenantContext, @Query() filters: BranchFiltersDto) {
  return this.service.getAll(tenant.schemaName, {});
}
```

---

## 11. Seguridad del API

| Elemento | Estado | Archivo/Evidencia |
|----------|--------|-------------------|
| **Authorization: Bearer** | ✅ Implementado | `jwt.strategy.ts`, `jwt-auth.guard.ts` |
| **x-tenant-slug header** | ✅ Implementado | `tenant.middleware.ts`, `packages/api-client/src/client.ts:32-40` |
| **@Public() decorator** | ✅ Para endpoints sin auth | `public.decorator.ts` |
| **RolesGuard** | ✅ Basado en `@Roles()` | `roles.guard.ts` |
| **Rate limiting** | ❌ NO EXISTE | Sin `@nestjs/throttler` |
| **Idempotency keys** | ❌ NO EXISTE | Sin header `Idempotency-Key` |
| **Refresh token flow** | ⚠️ PARCIAL | `AuthService` genera refresh token pero `auth-client` no lo usa para refrescar |
| **Logout** | ⚠️ PARCIAL | Solo client-side (borra tokens de localStorage), sin endpoint backend `/auth/logout` |
| **Security headers** | ❌ NO EXISTE | Sin Helmet, sin CSP, sin X-Frame-Options |
| **Correlation ID** | ❌ NO EXISTE | Sin `X-Correlation-ID` en requests/responses |
| **Trace ID** | ❌ NO EXISTE | Sin tracing distribuido |
| **Input validation** | ✅ Global `ValidationPipe` con whitelist + forbidNonWhitelisted | `main.ts:11-17` |
| **API keys** | ❌ NO EXISTE | Solo autenticación por JWT |

---

## 12. Errores

### Estructura actual

No hay un **formato uniforme** para las respuestas de error. Cada excepción de NestJS produce un formato ligeramente diferente:

```json
// NotFoundException (404)
{ "message": "Pedido no encontrado", "error": "Not Found", "statusCode": 404 }

// BadRequestException (400)
{ "message": ["error message"], "error": "Bad Request", "statusCode": 400 }

// ValidationPipe (400)
{ "message": ["email must be an email"], "error": "Bad Request", "statusCode": 400 }

// UnauthorizedException (401)
{ "message": "Credenciales incorrectas", "error": "Unauthorized", "statusCode": 401 }

// ConflictException (409)
{ "message": "El email ya está registrado", "error": "Conflict", "statusCode": 409 }
```

### Problemas detectados

1. **`message` puede ser string o array**: NestJS a veces devuelve `message` como array de strings (validation pipe) y otras como string único.
2. **Sin campo `code`**: No hay un código de error de negocio (ej: `ORDER_ALREADY_PAID`, `TABLE_OCCUPIED`).
3. **Sin `errors` detallados**: Las validaciones de negocio no devuelven errores por campo.
4. **Sin `correlationId`**: No se puede correlacionar errores entre logs.
5. **Sin global exception filter**: No hay `ExceptionFilter` global que unifique el formato.

### Manejo global

NO EXISTE. No hay `HttpExceptionFilter` global registrado. Cada error es manejado por el default de NestJS.

---

## 13. OpenAPI / Swagger

### Configuración actual (main.ts:24-33)

```typescript
const config = new DocumentBuilder()
  .setTitle('AuraRest API')
  .setDescription('API Multitenant para restaurantes')
  .setVersion('1.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
  .addApiKey({ type: 'apiKey', in: 'header', name: 'x-tenant-slug' }, 'TenantSlug')
  .build();
```

✅ Bearer auth documentado.
✅ `x-tenant-slug` documentado.
✅ Swagger UI en `/api/docs`.

### Cobertura por módulo

| Módulo | `@ApiTags` | `@ApiOperation` | `@ApiResponse` | `@ApiParam` | Estado |
|--------|-----------|-----------------|----------------|-------------|--------|
| Auth | ✅ | ✅ | ❌ | ❌ | ⚠️ Parcial |
| Tenants | ✅ | ✅ | ❌ | ❌ | ⚠️ Parcial |
| Users | ✅ | ✅ | ✅ | ❌ | ✅ Bueno |
| Branches | ✅ | ✅ | ✅ | ❌ | ✅ Bueno |
| Categories | ✅ | ✅ | ❌ | ❌ | ⚠️ Parcial |
| Menus | ✅ | ✅ | ❌ | ✅ (query param) | ⚠️ Parcial |
| Orders | ✅ | ❌ (solo en create) | ❌ | ❌ | ❌ Malo |
| Payments | ✅ | ❌ | ❌ | ❌ | ❌ Malo |
| Tables | ❌ | ❌ | ❌ | ❌ | ❌ Malo |
| Discounts | ✅ | ❌ | ❌ | ❌ | ❌ Malo |
| Promotions | ✅ | ❌ | ❌ | ❌ | ❌ Malo |
| Reservations | ❌ | ❌ | ❌ | ❌ | ❌ Malo |
| Reports | ✅ | ✅ | ✅ | ❌ | ✅ Bueno |

### ¿Se puede generar SDK automáticamente?

**Potencialmente sí**, pero con limitaciones:

| Requisito | Estado |
|-----------|--------|
| OpenAPI spec válido | ✅ Se genera |
| Tipos de respuesta correctos | ⚠️ Inconsistente (faltan Response DTOs en varios módulos) |
| Enums documentados | ⚠í Duplicados entre DTOs y Prisma |
| Ejemplos de request/response | ❌ No hay `@ApiExamples` |
| Descripciones de campos | ❌ Faltan en la mayoría de DTOs |
| Schemas de error | ❌ No hay schema de error definido |

**Veredicto**: Se podría generar un SDK, pero sería incompleto y con tipos incorrectos en varios módulos.

---

## 14. API Ready Score

| Dimensión | Score | Justificación |
|-----------|-------|---------------|
| **REST Score** | **55/100** | Rutas inconsistentes (admin/), PUT vs PATCH mezclado, `code/:code` viola REST |
| **Consistency Score** | **40/100** | DTOs, filtros, respuestas y nombres varían entre módulos; `Partial<CreateDto>` como update |
| **Documentation Score** | **45/100** | Swagger configurado pero con cobertura del ~50%; faltan ejemplos y error schemas |
| **DX Score** | **50/100** | `@maison/api-client` simple; frontend tipa manualmente; sin generación de SDK |
| **Frontend Compatibility Score** | **60/100** | `ApiResponse<T>` y `PaginatedResponse<T>` definidos pero backend no los garantiza |
| **Future Scalability Score** | **35/100** | Sin versionado real, sin deprecaciones, sin HATEOAS, sin idempotency |

---

## 15. Las 10 mejoras más importantes para nivel empresarial

1. **Unificar estructura de respuestas** — Crear un `ResponseInterceptor` global que envuelva todas las respuestas en `{ data, message, timestamp }` y un `ExceptionFilter` que unifique errores en `{ message, statusCode, code, errors, correlationId }`.

2. **Estandarizar ruteo** — Definir criterio claro: `admin/*` para administración del sistema (tenants, users, branches), raíz para operación del restaurante (orders, payments, tables, menu). Mover endpoints inconsistentes.

3. **Estandarizar PUT vs PATCH** — Usar **PUT** solo para reemplazo completo (idempotente), **PATCH** para actualizaciones parciales. Actualmente 4 módulos usan PUT incorrectamente.

4. **Implementar paginación en todos los endpoints de lista** — Usar `PaginationDto` como estándar en GET de Branches, Categories, Menus, Tables, Discounts, Promotions, Reservations.

5. **Crear contrato API único** — Generar tipos de frontend desde el OpenAPI spec (ej: `openapi-typescript`) y eliminar los tipos manuales duplicados en `@maison/types` y `web-shell/src/types/`.

6. **Eliminar enums duplicados en DTOs** — Reutilizar los enums de Prisma en los DTOs en vez de redeclararlos. Usar `@nestjs/swagger` con referencias al enum de Prisma.

7. **Agregar idempotency keys** — Implementar header `Idempotency-Key` en POST `payments/process`, POST `orders`, POST `orders/:id/cancel` para prevenir dobles procesamientos.

8. **Agregar rate limiting** — Implementar `@nestjs/throttler` con límites por endpoint (login: 5/min, creación de orden: 30/min, reportes: 10/min).

9. **Estandarizar filtros y query params** — Unificar `date`/`startDate`/`endDate`, agregar `sort` y `direction` a todos los endpoints de lista.

10. **Implementar versionado y deprecaciones** — Agregar header `Sunset` y `Deprecation` en respuestas. Crear mecanismo para v2 con soporte simultáneo de v1.
