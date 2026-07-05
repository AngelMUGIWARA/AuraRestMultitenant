# MASTER REFACTOR PLAN — AuraRest Multitenant

> **Propósito**: Plan de ejecución consolidado a partir de 7 auditorías técnicas. Define qué hacer, en qué orden, y qué NO hacer.
>
> **Fuentes**:
> - ARCHITECTURE_REVIEW.md (68/100)
> - DOMAIN_DATA_MODEL_REVIEW.md (62/100)
> - API_DESIGN_REVIEW.md (52/100)
> - SECURITY_REVIEW.md (28/100)
> - PRODUCTION_READINESS.md (12/100)
> - PERFORMANCE_REVIEW.md (25/100)
> - TECHNICAL_AUDIT.md (placeholder)
>
> **Rama**: `planning/master-refactor-plan`

---

## 1. Veredicto final

1. **El proyecto tiene una base arquitectónica sólida** (schema-per-tenant, NestJS modular, monorepo con packages compartidos, Module Federation), pero **no puede salir a producción en su estado actual**.

2. **Hay 6 bloqueadores P0 críticos de seguridad**: TenantsController sin guards, ReservationsController sin JWT, secrets commitados, CORS peligroso, sin rate limiting en login, sin idempotency en pagos.

3. **Hay 6 bloqueadores P0 de infraestructura**: Sin Docker, sin CI/CD, sin HTTPS, sin health checks, sin logging, sin estrategia de conexión a DB sostenible.

4. **El modelo de datos tiene 3 fallas graves**: KitchenTicket huérfano, dual role system inconsistente, Settings key-value con @unique corrupto.

5. **El pool de PrismaClient por tenant es el mayor riesgo de escalabilidad**: ~15 tenants agotan `max_connections=100` de PostgreSQL.

6. **No hay un solo test en el repositorio** — unitarios, integración, e2e, seguridad, carga: cero.

7. **La API no tiene contrato**: OpenAPI incompleto, tipos frontend duplicados manualmente, sin paginación en 6+ módulos.

8. **El frontend no tiene caché**: Sin React Query/SWR, cada fetch es round-trip completo, BranchContext duplicado sin memo causa re-renders masivos.

9. **El EventBus in-memory impide escalar horizontalmente**: No se pueden ejecutar 2 instancias del backend.

10. **Hay código muerto que debe eliminarse**: tables-mf (roto), apps/frontend (vacío), tipos duplicados, servicios duplicados.

11. **Lo que está bien**: Schema-per-tenant para aislamiento, uso de enums PostgreSQL, estructura modular, Repository pattern, shared packages monorepo, React 19 compiler en shell, DTOs con validación.

12. **Lo que NO debe tocarse todavía**: No reducir MFEs sin análisis organizacional, no fusionar Discounts/Promotions aunque sea deseable, no eliminar Permission si se usará para RBAC, no reescribir arquitectura (schema-per-tenant a row-level).

13. **El esfuerzo estimado para producción controlada es ~4-6 semanas para un equipo de 2-3 personas**.

14. **El riesgo principal es de seguridad e integridad de datos**: los pagos pueden duplicarse, los tenants pueden ser comprometidos, los secrets están expuestos.

15. **Prioridad absoluta**: Seguridad → Integridad de datos → Producibilidad mínima → Contrato API → Performance.

---

## 2. Principios de decisión

| # | Principio | Descripción |
|---|-----------|-------------|
| 1 | **Seguridad antes que features** | Ninguna feature nueva se implementa si hay un P0 de seguridad abierto. |
| 2 | **Integridad de datos antes que UI** | Transacciones, idempotency, optimistic locking se implementan antes que cualquier mejora visual. |
| 3 | **Contrato API antes que frontend** | OpenAPI como source of truth. El frontend consume tipos generados, no escritos a mano. |
| 4 | **Infra mínima antes que optimización** | Docker + CI/CD + health checks antes que performance tuning avanzado. |
| 5 | **No fusionar MFEs sin evidencia operativa** | Aunque haya código duplicado, los bounded contexts existen por razón de dominio. Solo fusionar si hay evidencia de que 2 MFEs siempre se despliegan juntos. |
| 6 | **No eliminar dominios que pueden crecer** | Si un modelo puede tener lógica de negocio compleja en el futuro, conservar su módulo. Ej: KitchenTicket, Inventory. |
| 7 | **Una fuente de verdad por concepto** | Tipos compartidos en `@maison/types`, BranchContext único, roles en un solo sistema. |
| 8 | **P0 antes que P1, P1 antes que P2, P2 antes que P3** | No mezclar prioridades. No hacer una P2 porque "es fácil". |
| 9 | **Cada cambio debe ser reversible o tener rollback** | Especialmente migraciones de DB, cambios de schema y cambios de contrato API. |
| 10 | **Si contradice, la auditoría más estricta prevalece** | Entre Security (28/100) y Architecture (68/100), prevalece Security. Entre Performance (25/100) y Architecture, prevalece Performance. Dimensiones más específicas sobre más generales. |

---

## 3. Contradicciones entre auditorías

| # | Tema | Auditoría A | Auditoría B | Decisión final | Justificación |
|---|------|-------------|-------------|----------------|---------------|
| 1 | **EventBus in-memory** | Architecture: "Simple and correct for current scope" (68/100) | Performance: "P0 blocker — impide HA, bloquea event loop, crashea proceso" (25/100) | **Prevalece Performance**: EventBus debe reemplazarse con Redis Pub/Sub. La falta de HA es bloqueadora para producción. | Architecture evaluó diseño interno, Performance evaluó escalabilidad. Para producción se necesita HA. |
| 2 | **Security Score** | Architecture: Security Architecture 62/100 | Security: Overall 28/100 | **Prevalece Security**: 62/100 es demasiado optimista. Los hallazgos concretos (TenantsController sin guards) confirman la calificación baja. | Architecture no hizo revisión detallada de seguridad de código. |
| 3 | **Cantidad de índices** | Domain: 9 índices faltantes (62/100) | Performance: 15 FKs sin índice + 7 compuestos necesarios (25/100) | **Prevalece Performance**: El análisis de Performance fue más exhaustivo (revisó migration SQLs y queries de código). | Domain se centró en modelo de datos; Performance en ejecución de queries reales. |
| 4 | **Escalabilidad** | Architecture: Scalability 48/100 | Performance: Scalability 12/100 | **Prevalece Performance**: Performance modeló escenarios de carga concretos. | Architecture evaluó diseño; Performance evaluó comportamiento bajo carga. |
| 5 | **PgBouncer compatibility** | Architecture: No menciona | Performance: Incompatible con schema-per-tenant + `?schema=` | **Prevalece Performance**: El approach actual no funciona con PgBouncer transaction mode. Necesita rearquitectura. | Architecture no consideró PgBouncer. |
| 6 | **Reducir MFEs** | Architecture: "Overengineered — 9 MFEs, deberían ser 4-5" | Domain: "Cada MFE representa un bounded context válido" | **Posponer**: No reducir MFEs hasta tener evidencia de duplicación operativa real. Mantener bounded contexts. | La reducción prematura puede forzar acoplamiento. Domain review correcto en identificar bounded contexts. |
| 7 | **Eliminar Permission** | Architecture: "Eliminar si sobra" | Domain: "Conservar para RBAC futuro" | **Conservar**: Marcar como `@notUsed` en schema pero no eliminar. RBAC será necesario. | Es más costoso agregar después que mantener código legacy marcado. |
| 8 | **Kubernetes/Terraform prioritario** | Production Readiness: Menciona como infra necesaria | Performance + Security: P0s más urgentes que K8s | **P3**: Docker + CI/CD mínimos primero. K8s/Terraform cuando haya carga real. | Un docker-compose básico es suficiente para producción inicial. |

---

## 4. Priorización global

| Prioridad | Área | Hallazgo | Impacto | Riesgo | Esfuerzo | Dependencias | Fuente |
|-----------|------|----------|---------|--------|----------|-------------|--------|
| **P0** | Security | TenantsController sin guards | CRÍTICO | ALTO | 1h | Ninguna | SECURITY |
| **P0** | Security | ReservationsController sin JWT | CRÍTICO | ALTO | 1h | Ninguna | SECURITY |
| **P0** | Security | JWT secrets placeholder en `.env` commitado | CRÍTICO | ALTO | 1h | Ninguna | SECURITY, PROD |
| **P0** | Security | CORS fallback a `*` con `credentials: true` | CRÍTICO | ALTO | 30min | Ninguna | SECURITY, PROD |
| **P0** | Security | Rate limiting en login | CRÍTICO | ALTO | 2-4h | `@nestjs/throttler` | SECURITY, PROD |
| **P0** | Security | Idempotency keys en payments | CRÍTICO | ALTO | 4-8h | Prisma migration | SECURITY, DOMAIN, PROD |
| **P0** | Infra | Secrets en git (`.env` commitado) | CRÍTICO | ALTO | 1h | `.gitignore` update | SECURITY, PROD |
| **P0** | Infra | Sin Docker | BLOQUEANTE | ALTO | 4-8h | Ninguna | PROD |
| **P0** | Infra | Sin CI/CD | BLOQUEANTE | ALTO | 8-16h | Docker | PROD |
| **P0** | Infra | Sin HTTPS | BLOQUEANTE | ALTO | 2-4h | Docker | SECURITY, PROD |
| **P0** | Infra | Sin health checks | BLOQUEANTE | MEDIO | 2-4h | Ninguna | PROD |
| **P0** | Infra | Sin logging estructurado | BLOQUEANTE | ALTO | 4-8h | Ninguna | SECURITY, PROD |
| **P0** | Data | Transacciones en pagos | CRÍTICO | ALTO | 4-8h | Prisma | DOMAIN, PROD |
| **P0** | Data | Optimistic locking en Order | CRÍTICO | ALTO | 4-8h | Prisma migration | DOMAIN |
| **P0** | Data | Folio generation race condition | ALTO | ALTO | 4-8h | Prisma migration | DOMAIN, PERFORMANCE |
| **P0** | DB | Per-tenant PrismaClient pool (>15 tenants falla) | CRÍTICO | ALTO | 3 días | Prisma | PERFORMANCE, PROD |
| **P0** | DB | `payments.order_id` index DROPPED sin reemplazo | CRÍTICO | MEDIO | 2h | Prisma migration | PERFORMANCE |
| **P0** | Auth | Logout + refresh token flow incompleto | ALTO | ALTO | 4-8h | Ninguna | SECURITY |
| **P0** | Auth | `@Public()` en endpoints sensibles (Orders) | ALTO | ALTO | 2h | Ninguna | SECURITY |
| **P0** | Frontend | JWT + refresh en localStorage (XSS vulnerable) | CRÍTICO | ALTO | 4-8h | Auth backend | SECURITY |
| **P1** | API | OpenAPI contrato como source of truth | ALTO | MEDIO | 3-5 días | Ninguna | API, ARCHITECTURE |
| **P1** | API | Paginación en ALL list endpoints | ALTO | BAJO | 1-2 días | PaginationDto exists | API, PERFORMANCE |
| **P1** | API | Error response estándar (ExceptionFilter) | ALTO | BAJO | 1 día | Ninguna | API |
| **P1** | API | Swagger completo en módulos faltantes | ALTO | BAJO | 2-3h | Ninguna | API |
| **P1** | Data | KitchenTicket implementación (orden → cocina) | ALTO | MEDIO | 2-3 días | Ninguna | DOMAIN |
| **P1** | Data | ActivityLog implementación | ALTO | BAJO | 1-2 días | Ninguna | DOMAIN, SECURITY |
| **P1** | Data | Soft delete User (status=INACTIVE) | ALTO | BAJO | 1 día | Prisma migration | DOMAIN |
| **P1** | Data | `processedBy` en Payment, `cancelledBy`/`cancelledAt` en Order | ALTO | BAJO | 1 día | Prisma migration | DOMAIN |
| **P1** | DB | Missing FK indexes (15) | ALTO | BAJO | 2h | Prisma migration | PERFORMANCE, DOMAIN |
| **P1** | DB | `@@index([status, createdAt])` en Order | ALTO | BAJO | 1h | Prisma migration | PERFORMANCE |
| **P1** | DB | `@@index([branchId])` en tablas con branch FK | ALTO | BAJO | 1h | Prisma migration | PERFORMANCE |
| **P1** | DB | TenantPrismaService LRU + TTL + connection_limit | ALTO | MEDIO | 2-3 días | Prisma | PERFORMANCE, PROD |
| **P1** | DB | `connection_limit=2` en datasource | ALTO | BAJO | 30min | Ninguna | PERFORMANCE |
| **P1** | Frontend | BranchContext único en `@maison/ui` + useMemo | ALTO | BAJO | 1-2 días | Shared package | ARCHITECTURE, PERFORMANCE |
| **P1** | Frontend | `@maison/types` como única fuente (eliminar duplicados en shell) | ALTO | BAJO | 1 día | Shared package | ARCHITECTURE |
| **P1** | Frontend | Eliminar `apps/tables-mf/`, `apps/frontend/` | ALTO | BAJO | 1h | Ninguna | ARCHITECTURE |
| **P1** | Backend | Caché tenant lookup en TenantMiddleware | ALTO | BAJO | 2h | Ninguna | PERFORMANCE |
| **P1** | Backend | Caché JWT payload en api-client | ALTO | BAJO | 1h | Ninguna | PERFORMANCE |
| **P1** | Backend | OrdersService.getStats: 7 queries → 1 | ALTO | MEDIO | 1 día | Ninguna | PERFORMANCE |
| **P1** | Backend | ReportsService: in-memory aggregation → SQL | ALTO | MEDIO | 2 días | Ninguna | PERFORMANCE |
| **P2** | API | PUT vs PATCH estandarización | MEDIO | BAJO | 1 día | API contract | API |
| **P2** | API | Versioning + deprecation headers | MEDIO | BAJO | 1 día | API contract | API |
| **P2** | Data | Eliminar `MenuItem.isAvailable`, `Payment.tipAmount` | BAJO | BAJO | 2h | Prisma migration | DOMAIN |
| **P2** | Data | Settings key-value → tipos concretos | MEDIO | BAJO | 2-3 días | Prisma migration | DOMAIN |
| **P2** | DB | Migrar CUID a UUID v7 | MEDIO | MEDIO | 1 semana | Prisma migration | PERFORMANCE |
| **P2** | DB | Partial indexes para status queries | MEDIO | BAJO | 1 día | Prisma migration | PERFORMANCE |
| **P2** | DB | Cursor-based pagination | MEDIO | BAJO | 1-2 días | API contract | PERFORMANCE |
| **P2** | Infra | EventBus → Redis Pub/Sub | ALTO | MEDIO | 3 días | Redis | PERFORMANCE, PROD |
| **P2** | Infra | Bull queue para reports + export | MEDIO | MEDIO | 2-3 días | Redis | PERFORMANCE |
| **P2** | Infra | WebSocket endpoint NestJS + kitchen | MEDIO | MEDIO | 2 días | Redis (WS adapter) | PERFORMANCE |
| **P2** | Frontend | React Query/SWR en todos los hooks | ALTO | MEDIO | 1 semana | Ninguna | PERFORMANCE |
| **P2** | Frontend | Code splitting: recharts lazy, manualChunks | MEDIO | BAJO | 1-2 días | Ninguna | PERFORMANCE |
| **P2** | Frontend | Helmet security headers | MEDIO | BAJO | 1 día | Ninguna | SECURITY |
| **P2** | Testing | Tests e2e flujos críticos | ALTO | MEDIO | 2-3 semanas | Ninguna | TODAS |
| **P2** | Testing | Smoke tests en CI | MEDIO | BAJO | 1 semana | CI/CD | PROD |
| **P3** | Infra | Kubernetes + Helm charts | BAJO | BAJO | 2-4 semanas | Docker | PROD |
| **P3** | Infra | Terraform / CloudFormation | BAJO | BAJO | 2-4 semanas | Infra | PROD |
| **P3** | Infra | Prometheus + Grafana | BAJO | BAJO | 1-2 semanas | Docker | PROD |
| **P3** | Infra | Read replicas + RDS Proxy | BAJO | MEDIO | 1-2 semanas | Infra | PERFORMANCE |
| **P3** | Infra | OpenTelemetry | BAJO | BAJO | 2-3 semanas | Logging | PROD |
| **P3** | Data | Inventario completo (stock, movimientos) | BAJO | MEDIO | 2-4 semanas | Modelo datos | DOMAIN |
| **P3** | Data | Customer/CRM | BAJO | ALTO | 1-2 meses | Modelo datos | (futuro) |
| **P3** | Data | Loyalty program | BAJO | ALTO | 1-2 meses | Customer | (futuro) |
| **P3** | Data | CFDI / Facturación electrónica | BAJO | ALTO | 2-4 semanas | Payment | (futuro) |
| **P3** | Data | Turnos / Shift management | BAJO | MEDIO | 2-4 semanas | User + Branch | (futuro) |
| **P3** | API | GraphQL implementation | BAJO | ALTO | 2-4 semanas | API contract | (futuro) |

---

## 5. P0 — Bloqueadores absolutos de producción

### 5.1 TenantsController sin guards

| Campo | Valor |
|-------|-------|
| **Problema** | TenantsController (`tenants.controller.ts`) no tiene `@UseGuards(JwtAuthGuard, RolesGuard)`. Cualquier usuario autenticado (incluso WAITER, CHEF) puede listar, crear, modificar o eliminar todos los tenants. |
| **Riesgo** | Un empleado con rol mínimo puede acceder a TODAS las organizaciones. Datos de todos los clientes expuestos. |
| **Archivos probables** | `apps/backend/src/tenants/tenants.controller.ts`, `apps/backend/src/tenants/tenants.module.ts` |
| **Cambio** | Agregar `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('SUPER_ADMIN', 'ADMIN')` al controlador. Solo usuarios con rol SUPER_ADMIN deben acceder. |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | Una request sin token a `GET /admin/tenants` retorna 401. Una request con token de WAITER retorna 403. Una request con SUPER_ADMIN retorna 200. |

### 5.2 ReservationsController sin JWT

| Campo | Valor |
|-------|-------|
| **Problema** | ReservationsController tiene solo `TenantGuard`. Cualquier persona con el slug del tenant (visible en URL) puede gestionar reservas sin autenticación JWT. |
| **Riesgo** | Creación/modificación masiva de reservas sin autenticación. Ataque de spam o sabotage. |
| **Archivos probables** | `apps/backend/src/reservations/reservations.controller.ts`, `apps/backend/src/reservations/reservations.module.ts` |
| **Cambio** | Agregar `@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)` + `@Roles('ADMIN', 'MANAGER', 'CASHIER')` según endpoint. No eliminar TenantGuard (verifica que el tenant del JWT coincida con el slug). |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | Request sin token a `GET /reservations` retorna 401. Request con token de tenant A no puede acceder a reservas de tenant B. |

### 5.3 JWT secrets placeholder en `.env` commitado

| Campo | Valor |
|-------|-------|
| **Problema** | `apps/backend/.env` contiene `JWT_SECRET="cambia_este_secreto_por_uno_seguro_en_produccion"` y está en el repositorio git. |
| **Riesgo** | Cualquier persona con acceso al repo puede firmar JWTs válidos. Suplantación de cualquier usuario. Acceso total al sistema. |
| **Archivos probables** | `apps/backend/.env`, `apps/backend/.gitignore`, posiblemente `apps/frontend/.env` |
| **Cambio** | 1. Generar nuevo JWT_SECRET. 2. Agregar `.env` a `.gitignore`. 3. Eliminar `.env` del tracking con `git rm --cached`. 4. Usar variables de entorno en CI/CD. 5. Rotar refresh secret. |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | `git grep -r "cambia_este_secreto"` retorna vacío. Los tokens firmados con el secret anterior son inválidos. |

### 5.4 CORS fallback a `*` con `credentials: true`

| Campo | Valor |
|-------|-------|
| **Problema** | Si `CORS_ORIGIN` no está definido en entorno, fallback a `'*'` con `credentials: true`. Esto es inválido según especificación CORS (navegadores lo rechazan) y peligroso si algún navegador lo permite. |
| **Riesgo** | En producción, cualquier origen puede hacer requests autenticados (si el navegador permite `*` + credentials). |
| **Archivos probables** | `apps/backend/src/main.ts` |
| **Cambio** | Eliminar fallback `*`. Usar lista de orígenes explícitos o validar que `CORS_ORIGIN` sea requerido en producción. |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | Request con `Origin: https://evil.com` recibe `Access-Control-Allow-Origin: https://ourdomain.com` o es rechazado. |

### 5.5 Rate limiting en login

| Campo | Valor |
|-------|-------|
| **Problema** | No hay rate limiting en ningún endpoint. Login es vulnerable a fuerza bruta. Payments vulnerable a replay. Reports vulnerable a resource exhaustion. |
| **Riesgo** | Ataque de fuerza bruta sobre login. 1M requests/hora a login sin restricción. |
| **Archivos probables** | `apps/backend/package.json` (agregar `@nestjs/throttler`), `apps/backend/src/app.module.ts` |
| **Cambio** | Configurar `ThrottlerModule.forRoot()` con límite de 10 requests/minuto en login, 100 requests/minuto en API general. |
| **Dependencias** | `@nestjs/throttler` |
| **Criterio de aceptación** | 11 requests a login en 1 minuto → 429 Too Many Requests. |

### 5.6 Idempotency keys en payments

| Campo | Valor |
|-------|-------|
| **Problema** | `POST payments/process` no verifica idempotency key. Un retry del frontend (timeout + reintento) procesa 2 pagos. |
| **Riesgo** | Doble cobro al cliente. Reversiones manuales. Pérdida de confianza. |
| **Archivos probables** | `apps/backend/src/payments/payments.service.ts`, `prisma/tenant/schema.prisma` |
| **Cambio** | Agregar `idempotencyKey String? @unique` en Payment model. En `processPayment`, verificar si ya existe payment con esa key → retornar existente. |
| **Dependencias** | Prisma migration |
| **Criterio de aceptación** | 2 requests con mismo `Idempotency-Key` header → mismo payment retornado. 1 solo cobro. |

### 5.7 Transacciones en pagos

| Campo | Valor |
|-------|-------|
| **Problema** | `processPayment` es multi-paso (crear payment → update order status → update table status) sin `$transaction`. Si falla entre paso 2 y 3, order dice PAID pero table sigue OCCUPIED. |
| **Riesgo** | Inconsistencia de datos. Mesa nunca se libera. Order payment y table status fuera de sync. |
| **Archivos probables** | `apps/backend/src/payments/payments.service.ts` |
| **Cambio** | Envolver los 3 pasos en `this.db.$transaction([...])` con Prisma interactive transactions. |
| **Dependencias** | Prisma |
| **Criterio de aceptación** | Si el paso 3 falla, el paso 1 y 2 se revierten. Payment no queda registrado si table no se actualiza. |

### 5.8 Optimistic locking en Order

| Campo | Valor |
|-------|-------|
| **Problema** | Order no tiene `version` field ni `@updatedAt` es usado para concurrencia. Dos cajeros pueden modificar la misma orden simultáneamente. |
| **Riesgo** | Perder actualizaciones. Ej: Cajero A cambia status a PAID mientras Cajero B cambia items. Se pierde el cambio de items. |
| **Archivos probables** | `prisma/tenant/schema.prisma`, `apps/backend/src/orders/orders.service.ts` |
| **Cambio** | Agregar `version Int @default(0)`. En cada update, usar `where: { id, version }` y actualizar `version: { increment: 1 }`. |
| **Dependencias** | Prisma migration |
| **Criterio de aceptación** | 2 updates simultáneos sobre misma orden → el segundo falla con error de concurrencia. La UI muestra "recargar datos". |

### 5.9 Folio generation race condition

| Campo | Valor |
|-------|-------|
| **Problema** | `generateFolio()` cuenta órdenes con `folio.startsWith(prefix)`, luego concatena `count + 1`. 2 concurrentes obtienen el mismo count → UNIQUE violation. |
| **Riesgo** | 10% de órdenes fallan en alta concurrencia. Pérdida de órdenes. |
| **Archivos probables** | `apps/backend/src/orders/orders.service.ts`, `prisma/tenant/schema.prisma` |
| **Cambio** | Opción A: Usar secuencia de DB. Opción B: Usar UUID como folio (no secuencial). Opción C: Usar `$transaction` con `SELECT ... FOR UPDATE` en un contador de folios. |
| **Dependencias** | Prisma migration |
| **Criterio de aceptación** | 100 órdenes concurrentes → 100 folios únicos sin errores. |

### 5.10 Sin Docker

| Campo | Valor |
|-------|-------|
| **Problema** | No hay Dockerfile, docker-compose, `.dockerignore`. No hay artefacto reproducible para deploy. |
| **Riesgo** | Ambiente de producción no replicable. Dependencia de configuración manual del servidor. |
| **Archivos probables** | `Dockerfile` (backend), `docker-compose.yml` (backend + postgres), `.dockerignore` |
| **Cambio** | Dockerfile multi-stage para backend (build + production). docker-compose con backend + postgres. |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | `docker compose up` inicia backend y DB. `docker compose down` los detiene. Health check integrado. |

### 5.11 Sin health checks

| Campo | Valor |
|-------|-------|
| **Problema** | No existen endpoints `/health`, `/ready`, `/liveness`. Docker/orquestadores no pueden monitorear el proceso. |
| **Riesgo** | Si el proceso se cuelga, el orquestador no lo reinicia. Downtime hasta intervención manual. |
| **Archivos probables** | `apps/backend/src/health/` (nuevo módulo), `apps/backend/src/app.module.ts`, `apps/backend/package.json` |
| **Cambio** | Agregar `@nestjs/terminus` con health checks: DB connection, memory usage. Exponer en `/health`. |
| **Dependencias** | `@nestjs/terminus` |
| **Criterio de aceptación** | `GET /health` retorna 200 con `{ status: 'ok', db: 'up' }`. `GET /health` cuando DB caída retorna 503. |

### 5.12 Sin logging estructurado

| Campo | Valor |
|-------|-------|
| **Problema** | Cero logs estructurados. Solo `console.log` para mensajes de startup. Sin request IDs, sin correlation IDs, sin niveles (info/warn/error). |
| **Riesgo** | Imposible debuggear en producción. Sin auditoría de seguridad. Sin trazas para incidentes. |
| **Archivos probables** | `apps/backend/src/main.ts` (configuración Pino), `apps/backend/src/common/middleware/correlation-id.middleware.ts` |
| **Cambio** | Configurar Pino como logger global. Agregar Correlation ID middleware. Reemplazar `console.log` con `Logger`. Configurar formato JSON en producción. |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | Cada request genera logs JSON con timestamp, level, correlationId, method, url, statusCode, durationMs. |

### 5.13 Logout + refresh token flow incompleto

| Campo | Valor |
|-------|-------|
| **Problema** | AuthController solo tiene `login`. No hay `logout` ni `refresh`. El refresh token se genera en login pero no hay endpoint para renovarlo. |
| **Riesgo** | Usuarios no pueden cerrar sesión activamente. Si un refresh token se compromete, no hay forma de revocarlo (solo la DB puede hacerlo, y no hay blacklist). |
| **Archivos probables** | `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.service.ts` |
| **Cambio** | Agregar `POST /auth/logout` con blacklist de tokens. Agregar `POST /auth/refresh` que valida refresh token y emite nuevo access token. |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | `POST /auth/logout` con token válido → token es invalidado. `POST /auth/refresh` con refresh token válido → nuevo access token. |

### 5.14 `@Public()` en endpoints sensibles de Orders

| Campo | Valor |
|-------|-------|
| **Problema** | `GET /orders/stats` y `GET /orders/:id` tienen `@Public()`. Cualquier persona puede ver estadísticas de órdenes y detalles de cualquier orden. |
| **Riesgo** | Exposición de datos financieros (totales, impuestos, items, customerName). Estadísticas del restaurant (cuántas órdenes, ingresos). |
| **Archivos probables** | `apps/backend/src/orders/orders.controller.ts` |
| **Cambio** | Eliminar `@Public()` de esos endpoints. Agregar `@Roles('ADMIN', 'MANAGER', 'CASHIER', 'WAITER')` según corresponda. |
| **Dependencias** | Ninguna |
| **Criterio de aceptación** | Request sin token a `GET /orders/stats` retorna 401. Request con token WAITER retorna 200. |

### 5.15 JWT + refresh en localStorage (XSS vulnerable)

| Campo | Valor |
|-------|-------|
| **Problema** | `packages/api-client/src/client.ts` almacena JWT y refresh token en `localStorage`. Cualquier XSS roba el refresh token (válido 7 días). |
| **Riesgo** | Un XSS en cualquier MFE compromete la sesión del usuario por 7 días. |
| **Archivos probables** | `packages/api-client/src/client.ts`, `apps/backend/src/auth/auth.service.ts` |
| **Cambio** | Migrar tokens a HttpOnly cookies. Backend debe setear cookies con `httpOnly: true`, `secure: true`, `sameSite: 'strict'`. El frontend no almacena tokens. |
| **Dependencias** | Auth backend (logout, refresh) |
| **Criterio de aceptación** | `document.cookie` en DevTools no muestra tokens. Un XSS no puede leer los tokens. |

---

## 6. P1 — Alto impacto

| # | Tarea | Esfuerzo | Dependencia | Fuente |
|---|-------|----------|-------------|--------|
| 1 | **Eliminar `apps/web-shell/src/types/` + migrar imports a `@maison/types`** | 1 día | Ninguna | ARCHITECTURE |
| 2 | **Eliminar `apps/tables-mf/` + `apps/frontend/`** | 1h | Ninguna | ARCHITECTURE |
| 3 | **Mover BranchContext a `@maison/ui` como singleton** | 1-2 días | Shared package | ARCHITECTURE, PERFORMANCE |
| 4 | **Fix `packages/api-client` dependencia de `import.meta.env`** | 1 día | Shared package | ARCHITECTURE |
| 5 | **Agregar índices FK faltantes (15 índices + `payments.order_id`)** | 2h | Prisma migration | PERFORMANCE, DOMAIN |
| 6 | **Agregar `@@index([status, createdAt])` en Order** | 1h | Prisma migration | PERFORMANCE |
| 7 | **Agregar `@@index([branchId])` en tablas con branch FK** | 1h | Prisma migration | PERFORMANCE |
| 8 | **Caché tenant lookup en TenantMiddleware (Map in-memory, TTL 60s)** | 2h | Ninguna | PERFORMANCE |
| 9 | **Caché JWT payload decodificado en api-client** | 1h | Shared package | PERFORMANCE |
| 10 | **Connection `connection_limit=2` en cada datasource Prisma** | 30min | Ninguna | PERFORMANCE |
| 11 | **TenantPrismaService LRU cache + TTL + eviction** | 2-3 días | Prisma | PERFORMANCE, PROD |
| 12 | **OrdersService.getStats: 7 queries → 1 con FILTER** | 1 día | Ninguna | PERFORMANCE |
| 13 | **ReportsService: in-memory aggregation → SQL aggregate** | 2 días | Ninguna | PERFORMANCE |
| 14 | **Paginación real en ReservationsController (conectar DTO page/limit)** | 4h | Ninguna | PERFORMANCE, API |
| 15 | **Select projection en OrdersRepository.findMany** | 2h | Ninguna | PERFORMANCE |
| 16 | **OpenAPI contract + `openapi-typescript` generación frontend** | 3-5 días | Ninguna | API, ARCHITECTURE |
| 17 | **Paginación en ALL list endpoints (PaginationDto estándar)** | 1-2 días | PaginationDto | API, PERFORMANCE |
| 18 | **Error response estándar (ExceptionFilter global)** | 1 día | Ninguna | API |
| 19 | **Swagger completo (@ApiOperation/@ApiResponse en módulos faltantes)** | 2-3h | Ninguna | API |
| 20 | **KitchenTicket implementación (creación en confirmación de orden + endpoints)** | 2-3 días | Domain model | DOMAIN |
| 21 | **ActivityLog implementación (middleware que registra writes)** | 1-2 días | Ninguna | DOMAIN, SECURITY |
| 22 | **Soft delete User (status=INACTIVE, no eliminar registros)** | 1 día | Prisma migration | DOMAIN |
| 23 | **`processedBy` en Payment, `cancelledBy`/`cancelledAt` en Order** | 1 día | Prisma migration | DOMAIN |
| 24 | **Helmet security headers** | 1 día | Ninguna | SECURITY |
| 25 | **Wrap BranchContext value en useMemo en shell + MFEs** | 1-2 días | Shared package | PERFORMANCE |
| 26 | **Agregar React.memo a KitchenTicketCard, OrderCard, MenuItemCard** | 1h | Ninguna | PERFORMANCE |
| 27 | **Eliminar código muerto: servicios duplicados en shell y dash-mf** | 1 día | Shared package | ARCHITECTURE |
| 28 | **Fix `Settings` model (eliminar @unique de branchId sola)** | 2h | Prisma migration | DOMAIN |

---

## 7. P2 — Mejoras estratégicas

| # | Tarea | Esfuerzo | Dependencia | Fuente |
|---|-------|----------|-------------|--------|
| 1 | **EventBus → Redis Pub/Sub** | 3 días | Redis infraestructura | PERFORMANCE, PROD |
| 2 | **Bull queue para reports + export PDF** | 2-3 días | Redis + EventBus | PERFORMANCE |
| 3 | **WebSocket endpoint NestJS + kitchen** | 2 días | Redis WS adapter | PERFORMANCE |
| 4 | **React Query/SWR en todos los hooks** | 1 semana | Shared package | PERFORMANCE |
| 5 | **Code splitting: recharts lazy + jsPDF lazy + manualChunks** | 1-2 días | Ninguna | PERFORMANCE |
| 6 | **Eliminar `MenuItem.isAvailable`, `Payment.tipAmount`** | 2h | Prisma migration | DOMAIN |
| 7 | **Settings key-value → tipos concretos por setting** | 2-3 días | Prisma migration | DOMAIN |
| 8 | **PUT vs PATCH estandarización** | 1 día | API contract | API |
| 9 | **Versioning + deprecation headers** | 1 día | API contract | API |
| 10 | **Partial indexes para status queries (Order, Payment, MenuItem)** | 1 día | Prisma migration | PERFORMANCE |
| 11 | **Cursor-based pagination en endpoints de alto volumen** | 1-2 días | Pagination refactor | PERFORMANCE |
| 12 | **E2E tests: flujos críticos (login, orden, pago, reserva)** | 2-3 semanas | CI/CD | TODAS |
| 13 | **Smoke tests en CI** | 1 semana | CI/CD | PROD |
| 14 | **Optimistic locking en más entidades (Payment, Reservation)** | 2 días | Prisma migration | DOMAIN |
| 15 | **`isGlobal` flag en BranchContext → evitar que shell muestre datos sin branch seleccionada** | 1 día | Shared package | DOMAIN |
| 16 | **Cross-MFE direct import fix (dashboard → reservations)** | 1h | Ninguna | PERFORMANCE |

---

## 8. P3 — Backlog / Futuro

| # | Tarea | Esfuerzo | Notas |
|---|-------|----------|-------|
| 1 | **Inventario completo (MenuItem stock, movimientos, ajustes)** | 2-4 semanas | Requiere modelo de datos completo |
| 2 | **Customer/CRM** | 1-2 meses | Más allá del alcance actual |
| 3 | **Loyalty program** | 1-2 meses | Depende de Customer |
| 4 | **CFDI / Facturación electrónica** | 2-4 semanas | Requiere proveedor SAT |
| 5 | **Turnos / Shift management** | 2-4 semanas | Requiere User + Branch |
| 6 | **Kubernetes + Helm charts** | 2-4 semanas | Después de Docker estable |
| 7 | **Terraform / CloudFormation** | 2-4 semanas | Después de K8s |
| 8 | **Prometheus + Grafana** | 1-2 semanas | Después de logging |
| 9 | **Read replicas + RDS Proxy** | 1-2 semanas | Después de pool fix |
| 10 | **OpenTelemetry** | 2-3 semanas | Después de logging |
| 11 | **GraphQL** | 2-4 semanas | Después de API contract |
| 12 | **Multi-region / HA avanzada** | 1-2 meses | Cuando haya tráfico multi-región |
| 13 | **Migrar CUID a UUID v7** | 1 semana | Bajo impacto actual, alto esfuerzo |
| 14 | **Unión/separación de mesas** | 1-2 semanas | Feature futuro |
| 15 | **Corte de caja avanzado (Z, X, descuadre)** | 2-4 semanas | Depende de Payment + Reports |

---

## 9. No implementar por ahora

| # | Recomendación de auditoría | Decisión | Justificación |
|---|---------------------------|----------|---------------|
| 1 | **Reducir 9 MFEs a 4** (ARCHITECTURE) | No implementar | Cada MFE representa un bounded context válido. La reducción prematura fuerza acoplamiento. Reevaluar cuando haya 3+ MFEs que siempre se despliegan juntos. |
| 2 | **Fusionar menu-mf** (ARCHITECTURE) | No implementar | Menu es un dominio propio con lógica de precios, inventario, categorías. Fusionarlo sería perder aislamiento. |
| 3 | **Fusionar reservations-mf** (ARCHITECTURE) | No implementar | Reservas pueden crecer como módulo independiente con lógica de disponibilidad, tiempos, notificaciones. |
| 4 | **Fusionar Discounts/Promotions en PricingModule** (ARCHITECTURE, DOMAIN) | Posponer (P3) | Deseable a largo plazo por consistencia de datos, pero requiere migración de datos existentes. No bloquea producción. |
| 5 | **Eliminar Permission model** (ARCHITECTURE) | No implementar | Se usará para RBAC granular en el futuro. Marcar como `@notUsed` y no forzar implementación ahora. |
| 6 | **Eliminar ActivityLog por no usado** (implicación) | No implementar | ActivityLog debe implementarse (P1), no eliminarse. Es requerido para auditoría de seguridad. |
| 7 | **Reescribir schema-per-tenant a row-level isolation** (PERFORMANCE como opción) | No implementar | El schema-per-tenant es correcto para el caso de uso. Row-level isolation sería una reescritura completa sin beneficio inmediato. Solo considerar si hay >1000 tenants. |
| 8 | **Implementar GraphQL** (futuro) | No implementar ahora | REST es suficiente para el estado actual. GraphQL añade complejidad sin beneficio demostrado. |
| 9 | **Implementar event sourcing / CQRS** (ninguna auditoría lo pide, pero implícito) | No implementar | Arquitectura no necesita event sourcing. EventBus + colas es suficiente. |
| 10 | **Reescribir frontend en Next.js completo** (ninguna auditoría lo pide) | No implementar | La estrategia shell + Vite MFEs es válida. Reescribir sería costo enorme sin beneficio. |

---

## 10. Roadmap por ramas Git

### Rama 1: `fix/security-p0-critical`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Corregir los 6 P0 de seguridad más críticos en backend |
| **Archivos probables** | `tenants.controller.ts`, `reservations.controller.ts`, `main.ts` (CORS), `.env`, `auth.service.ts`, `orders.controller.ts` |
| **Dependencias** | Ninguna |
| **No tocar** | Modelos DB, frontend, infraestructura |
| **CA** | Todas las pruebas de seguridad P0 pasan. Ningún endpoint sensible sin guard. CORS seguro. Secrets rotados. |

### Rama 2: `fix/transactions-integrity`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Transacciones, idempotency, optimistic locking, folio seguro |
| **Archivos probables** | `payments.service.ts`, `orders.service.ts`, `prisma/tenant/schema.prisma` |
| **Dependencias** | `fix/security-p0-critical` |
| **No tocar** | Frontend, API contract, infra |
| **CA** | Pagos con transacción. Idempotency key funciona. Folios únicos bajo concurrencia. Optimistic locking evita pérdida de cambios. |

### Rama 3: `chore/production-baseline`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Docker, CI/CD, health checks, logging, variables de entorno, `.gitignore` |
| **Archivos probables** | `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.gitignore`, `main.ts` |
| **Dependencias** | `fix/security-p0-critical` |
| **No tocar** | Lógica de negocio, modelos DB, frontend |
| **CA** | `docker compose up` → sistema funcional. CI pasa lint+typecheck+build. Health checks responden. Logs JSON estructurados. |

### Rama 4: `fix/auth-session`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Logout, refresh token, HttpOnly cookies |
| **Archivos probables** | `auth.controller.ts`, `auth.service.ts`, `packages/api-client/src/client.ts` |
| **Dependencias** | `fix/security-p0-critical`, `fix/transactions-integrity` |
| **No tocar** | Modelos DB, infra, otros módulos |
| **CA** | `POST /auth/logout` invalida token. `POST /auth/refresh` renueva access. Cookies httpOnly sin acceso JS. |

### Rama 5: `fix/tenant-authorization`

| Campo | Valor |
|-------|-------|
| **Objetivo** | TenantMiddleware cross-validate con JWT, rate limiting |
| **Archivos probables** | `tenant.middleware.ts`, `app.module.ts` (ThrottlerGuard) |
| **Dependencias** | `fix/auth-session` |
| **No tocar** | Modelos DB, frontend |
| **CA** | TenantMiddleware verifica que slug del JWT coincide con header. Rate limiter retorna 429 tras límite. |

### Rama 6: `refactor/api-contract`

| Campo | Valor |
|-------|-------|
| **Objetivo** | OpenAPI completo, error response estándar, paginación universal |
| **Archivos probables** | Múltiples controllers, `common/filters/`, `common/interceptors/`, `openapitools.json` |
| **Dependencias** | `fix/security-p0-critical` |
| **No tocar** | Frontend, lógica de negocio, modelos DB |
| **CA** | `GET /orders?page=1&limit=20` funciona en todas las listas. Errores tienen formato uniforme. Swagger documenta todos los endpoints. |

### Rama 7: `refactor/shared-types`

| Campo | Valor |
|-------|-------|
| **Objetivo** | `@maison/types` como única fuente, eliminar tipos duplicados, eliminar código muerto |
| **Archivos probables** | `apps/web-shell/src/types/*`, `packages/types/src/index.ts`, `packages/api-client/src/client.ts` |
| **Dependencias** | `refactor/api-contract` |
| **No tocar** | Lógica de negocio, modelos DB, infra |
| **CA** | `apps/web-shell/src/types/` eliminado. Todos los imports de tipos van a `@maison/types`. `import.meta.env` reemplazado. |

### Rama 8: `refactor/branch-context`

| Campo | Valor |
|-------|-------|
| **Objetivo** | BranchContext único, useMemo, split stable/action, eliminar duplicados en MFEs |
| **Archivos probables** | `apps/*-mf/src/context/BranchContext.tsx`, `packages/ui/src/context/BranchContext.tsx` |
| **Dependencias** | `refactor/shared-types` |
| **No tocar** | Backend, modelos DB, infra |
| **CA** | BranchContext único en `@maison/ui`. value envuelto en useMemo. MFEs importan desde shared package. Branch change no causa thundering herd. |

### Rama 9: `perf/prisma-tenant-pool`

| Campo | Valor |
|-------|-------|
| **Objetivo** | LRU cache con TTL, connection_limit, eviction, pre-warming |
| **Archivos probables** | `apps/backend/src/database/tenant-prisma.service.ts` |
| **Dependencias** | `fix/security-p0-critical`, `fix/transactions-integrity` |
| **No tocar** | Frontend, modelos DB |
| **CA** | 50 tenants no superan `max_connections=100`. Clientes de tenants inactivos se evictan después de TTL. |

### Rama 10: `perf/db-indexes`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Los 15 índices FK + compuestos + partial indexes |
| **Archivos probables** | `prisma/tenant/schema.prisma` |
| **Dependencias** | `fix/transactions-integrity` |
| **No tocar** | Código de aplicación, frontend, infra |
| **CA** | `EXPLAIN ANALYZE` en queries de reports muestra index scans en lugar de sequential scans. |

### Rama 11: `feat/kitchen-flow`

| Campo | Valor |
|-------|-------|
| **Objetivo** | KitchenTicket creation, kitchen endpoints, WebSocket |
| **Archivos probables** | `apps/backend/src/kitchen/`, `apps/kitchen-mf/src/` |
| **Dependencias** | `fix/transactions-integrity`, `fix/security-p0-critical` |
| **No tocar** | Otros MFEs, modelos fuera de kitchen |
| **CA** | Orden CONFIRMED → KitchenTicket creado. Kitchen muestra tickets. Status updates via WebSocket. |

### Rama 12: `test/e2e-critical-flows`

| Campo | Valor |
|-------|-------|
| **Objetivo** | Pruebas e2e de login, orden → pago, reserva, kitchen |
| **Archivos probables** | `apps/backend/test/` o `e2e/` |
| **Dependencias** | `chore/production-baseline` |
| **No tocar** | Código de aplicación |
| **CA** | `pnpm test:e2e` pasa sin errores. Flujo completo orden → pago funciona. Flujo login → logout funciona. |

---

## 11. Orden recomendado de implementación

```
FASE 1 — SEGURIDAD CRÍTICA (Semana 1)
├── fix/security-p0-critical    (Días 1-2)
│   ├── P0.1 TenantsController guards
│   ├── P0.2 ReservationsController JWT
│   ├── P0.3 JWT secrets rotación + .env → .gitignore
│   ├── P0.4 CORS fix
│   ├── P0.5 @Public() en Orders endpoints
│   └── P0.6 Rate limiting (@nestjs/throttler)
│
└── fix/transactions-integrity  (Días 3-5)
    ├── P0.7 Transacciones en payments
    ├── P0.8 Idempotency keys
    ├── P0.9 Optimistic locking en Order
    └── P0.10 Folio generation fix

FASE 2 — PRODUCCIÓN MÍNIMA (Semana 2)
├── fix/auth-session             (Días 1-2)
│   ├── P0.11 Logout + refresh endpoint
│   └── P0.12 HttpOnly cookies
│
├── chore/production-baseline    (Días 3-5)
│   ├── P0.13 Docker + docker-compose
│   ├── P0.14 Health checks
│   ├── P0.15 Logging estructurado (Pino)
│   ├── P0.16 CI/CD (GitHub Actions)
│   └── P0.17 HTTPS config
│
└── fix/tenant-authorization     (Día 5)
    ├── TenantMiddleware cross-validate
    └── Rate limiter global

FASE 3 — CONTRATO API (Semana 3)
├── refactor/api-contract        (Días 1-3)
│   ├── OpenAPI completo + generador frontend types
│   ├── ExceptionFilter global
│   ├── PaginationDto en todos los list endpoints
│   └── Swagger decorators faltantes
│
├── refactor/shared-types        (Días 4-5)
│   ├── Eliminar types duplicados en shell
│   ├── Fix api-client import.meta.env
│   └── Eliminar código muerto (tables-mf, frontend, servicios duplicados)
│
└── refactor/branch-context      (Día 5)
    └── BranchContext único + useMemo

FASE 4 — FLUJOS INCOMPLETOS (Semana 4)
├── P1.20 KitchenTicket real     (Días 1-2)
├── P1.21 ActivityLog real       (Días 2-3)
├── P1.22 Soft delete User       (Día 3)
├── P1.23 processedBy/cancelledBy (Día 4)
└── P1.24 Settings model fix     (Día 4)

FASE 5 — PERFORMANCE CRÍTICA (Semana 4-5)
├── P1.5-P1.7 Índices DB         (Día 1)
├── P1.8-P1.9 Caché tenant + JWT (Día 1)
├── P1.10 connection_limit       (Día 1)
├── P1.11 LRU + TTL en Prisma    (Día 2-3)
├── P1.12-P1.13 Aggregation SQL  (Día 3-4)
├── P1.14 Paginación reservations (Día 4)
├── P1.15 Select projection      (Día 4)
└── P1.25-P1.26 React.memo + useMemo (Día 5)

FASE 6 — OBSERVABILIDAD Y TESTING (Semana 5-6)
├── P1.24 Helmet headers         (Día 1)
├── P2.1-P2.3 EventBus + Queue + WS (Día 1-3)
├── P2.4 React Query/SWR        (Día 3-5)
├── P2.5 Code splitting          (Día 5)
├── P2.12-P2.13 E2E + Smoke      (Semana 6)
└── Performance load tests       (Semana 6)

FASE 7 — ESTRATÉGICO (Semana 6+)
├── P2 restante
├── P3 backlog planning
└── Documentación ADRs
```

### Justificación del orden

1. **Seguridad primero** (Fase 1): Cualquier vulnerabilidad crítica abierta hace que todo lo demás sea irrelevante. Los datos pueden ser comprometidos en cualquier momento.
2. **Integridad de datos** (Fase 1): Transacciones e idempotency evitan pérdida financiera. Sin esto, el sistema no es confiable.
3. **Producción mínima** (Fase 2): Sin Docker, CI/CD, health checks, logging, no se puede operar. El sistema es ciego e inmanejable.
4. **Contrato API** (Fase 3): Antes de optimizar, definir el contrato. OpenAPI como source of truth evita que frontend y backend se desincronicen.
5. **Flujos incompletos** (Fase 4): KitchenTicket y ActivityLog son funcionalidades prometidas que no existen. Implementarlas después de tener base segura.
6. **Performance** (Fase 5): Índices, caché, conexiones, aggregation SQL. No tiene sentido optimizar sobre un sistema que puede tener bugs de seguridad.
7. **Testing** (Fase 6): E2E, smoke, load tests. Después de tener infraestructura estable y código corregido.
8. **Estratégico** (Fase 7+): Redis, colas, WebSocket, React Query. Mejoras que transforman la experiencia pero no bloquean producción.

---

## 12. Dependencias entre tareas (DAG textual)

```
fix/security-p0-critical
  ├── fix/transactions-integrity  (necesita guards + auth estables)
  │   ├── perf/db-indexes         (necesita schema estable)
  │   ├── feat/kitchen-flow       (necesita transacciones estables)
  │   ├── refactor/api-contract   (necesita auth estable para documentar)
  │   │   ├── refactor/shared-types (necesita contrato API definido)
  │   │   │   └── refactor/branch-context (necesita shared packages estables)
  │   │   └── perf/prisma-tenant-pool (independiente pero después de transacciones)
  │   └── test/e2e-critical-flows (necesita todo estable)
  │
  ├── fix/auth-session
  │   └── chore/production-baseline (independiente pero secuencial lógico)
  │       └── fix/tenant-authorization
  │
  └──── (dependencias indirectas)

Observabilidad y performance avanzada (P2+):
  perf/prisma-tenant-pool
  ├── P2 EventBus → Redis        (necesita pool estable)
  ├── P2 React Query             (independiente)
  └── P2 Code splitting          (independiente)

Testing:
  test/e2e-critical-flows        (depende de Fases 1-4)
  ├── Load tests                 (depende de performance fixes)
  └── Security tests             (depende de security fixes)

Infraestructura futura:
  Docker                          (Fase 2 hecha)
  ├── CI/CD                       (necesita Docker)
  │   └── Kubernetes              (necesita Docker + CI/CD)
  │       └── Terraform           (necesita K8s)
  └── Read replicas               (necesita DB estable)
```

---

## 13. Criterios de aceptación globales

### Listo para staging

- [ ] Todos los P0 de seguridad corregidos (guards, secrets, CORS, rate limiting)
- [ ] Transacciones implementadas en pagos
- [ ] Idempotency keys funcionando
- [ ] Docker + docker-compose funcional
- [ ] Health checks respondiendo
- [ ] Logging estructurado operativo
- [ ] CI/CD compila, lint, typecheck
- [ ] Paginación implementada en list endpoints principales
- [ ] Error response uniforme

### Listo para demo

- [ ] Todo lo de staging
- [ ] KitchenTicket funcional (orden → cocina)
- [ ] ActivityLog registrando operaciones críticas
- [ ] Swagger documentando todos los endpoints
- [ ] OpenAPI contract generando tipos frontend
- [ ] BranchContext único + useMemo
- [ ] Login, logout, refresh funcionando
- [ ] Soft delete usuarios

### Listo para producción controlada (piloto con 1-2 restaurantes)

- [ ] Todo lo de demo
- [ ] Rate limiting configurado por usuario
- [ ] Helmet headers activos
- [ ] HTTPS configurado
- [ ] Índices DB críticos agregados (15 FK + status/createdAt + payments.order_id)
- [ ] TenantPrismaService con LRU + TTL + connection_limit
- [ ] HttpOnly cookies (sin localStorage para tokens)
- [ ] Pruebas e2e de flujo orden → pago pasando
- [ ] Smoke tests en CI
- [ ] Backup strategy configurada
- [ ] Variables de entorno por ambiente (.env.production, .env.staging)
- [ ] EventBus con setMaxListeners + error handler

### Listo para producción real

- [ ] Todo lo de producción controlada
- [ ] ReportsService con SQL aggregation (sin OOM)
- [ ] OrdersService.getStats con 1 query
- [ ] Caché tenant lookup + JWT payload
- [ ] React Query/SWR en frontend (caché + dedup)
- [ ] Load tests pasan con 100 usuarios concurrentes
- [ ] Security tests (OWASP top 10 básico) pasan
- [ ] Monitoreo básico (health + logs + métricas)
- [ ] EventBus → Redis Pub/Sub (HA habilitada)
- [ ] WebSocket kitchen funcional
- [ ] Bull queue para reports pesados

---

## 14. Riesgos de implementación

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | **Agregar guards rompe endpoints que dependen de `@Public()`** | ALTA | ALTO | Revisar cada endpoint que no tenía guard. Los tests e2e deben validar permisos correctos. |
| 2 | **Migración de `.env` fuera de git causa confusión en devs** | MEDIA | MEDIO | Comunicar cambio en `AGENTS.md`. Agregar `.env.example` con instrucciones. |
| 3 | **Agregar optimistic locking causa errores 409 en frontend que no maneja conflictos** | ALTA | ALTO | Frontend debe manejar HTTP 409 con "recargar datos". Implementar en UI antes del cambio. |
| 4 | **Cambio de localStorage a HttpOnly cookies requiere cambios en api-client y todos los MFEs** | ALTA | ALTO | Hacer en rama separada. Probar con cada MFE. Tener rollback plan. |
| 5 | **Migraciones de DB (índices, campos nuevos) pueden causar downtime** | MEDIA | ALTO | Usar `CREATE INDEX CONCURRENTLY` para evitar table locks. Migraciones en ventanas de baja actividad. |
| 6 | **Reemplazar EventBus in-memory con Redis puede romper listeners existentes** | MEDIA | ALTO | Implementar interface común. Ambos buses coexisten durante migración. Feature flag. |
| 7 | **React Query reemplaza hooks custom → posible regresión en polling y caché** | MEDIA | MEDIO | Mantener hooks viejos como fallback durante transición. Pruebas e2e de polling. |
| 8 | **Eliminar tables-mf puede dejar referencias rotas en shell** | ALTA | BAJO | Verificar imports en shell antes de eliminar. Git permite revertir fácilmente. |
| 9 | **Cambio de paginación en list endpoints rompe frontend que espera arrays planos** | ALTA | ALTO | Frontend debe manejar `{ data: [], meta: { total, page, limit } }`. Versionar API si es necesario. |
| 10 | **Aumentar índices DB ralentiza writes (INSERT/UPDATE/DELETE)** | MEDIA | BAJO | Los 15 índices FK tienen overhead mínimo en writes. Monitorear performance después de migración. |

---

## 15. Plan de validación

| Tipo | Qué probar | Frecuencia | Herramienta | Responsable |
|------|-----------|------------|-------------|-------------|
| **Lint** | ESLint + Prettier + tsc | Cada commit | CI | Dev |
| **Unit tests** | Services, guards, pipes, repositories | Cada PR | Jest | Dev |
| **E2E** | Login → orden → pago, Reserva → confirmación, Kitchen flow | Cada merge a main | Supertest + Playwright | QA |
| **Security** | Guards, rate limiting, CORS, tokens, XSS, CSRF | Semanal (y después de security P0) | OWASP ZAP, manual | Security lead |
| **Load** | 100 concurrent users, 1000 orders/hr, 100 payments/min | Después de perf fixes | k6 / Artillery | SRE |
| **Regression** | Full smoke test de todos los endpoints | Cada release | Script automatizado | QA |
| **Data integrity** | Pagos duplicados, folios duplicados, orphan records | Después de transacciones fixes | Prisma validation queries | Dev |
| **Migration** | DB migrations forward + rollback | Cada PR con migración | Prisma migrate dev + reset | Dev |
| **Rollback** | Revertir deploy a versión anterior | Drill mensual | Docker + CI/CD | SRE |

### Smoke tests mínimos (para CI)

1. `GET /health` → 200
2. `POST /auth/login` con credenciales válidas → 200 + tokens
3. `POST /auth/login` con credenciales inválidas → 401
4. `GET /admin/tenants` sin token → 401
5. `GET /admin/tenants` con token WAITER → 403
6. `GET /admin/tenants` con token SUPER_ADMIN → 200
7. `GET /orders` sin token → 401
8. `POST /payments/process` con mismo Idempotency-Key → mismo payment (no duplicado)
9. `POST /payments/process` sin Idempotency-Key → nuevo payment
10. `GET /orders?page=1&limit=20` → `{ data: [], meta: { page: 1, limit: 20, total: ... } }`

---

## 16. Resumen ejecutivo para equipo

**Estado actual**: El proyecto tiene buena arquitectura base pero 6 bloqueadores de seguridad críticos, 6 de infraestructura y 3 de modelo de datos. No puede salir a producción. Score general combinado: ~35/100.

**Qué hacer primero**: 2 semanas de fixes P0: (1) seguridad — guards, secrets, CORS, rate limiting, (2) integridad — transacciones, idempotency, optimistic locking, (3) producción mínima — Docker, CI/CD, health checks, logging.

**Qué NO hacer**: No reducir MFEs, no fusionar dominios, no eliminar Permission, no reescribir arquitectura, no implementar GraphQL/K8s/Terraform todavía.

**Orden de ramas**: `fix/security-p0-critical` → `fix/transactions-integrity` → `chore/production-baseline` → `fix/auth-session` → `fix/tenant-authorization` → `refactor/api-contract` → `refactor/shared-types` → `refactor/branch-context` → `perf/prisma-tenant-pool` → `perf/db-indexes` → `feat/kitchen-flow` → `test/e2e-critical-flows`.

**Esfuerzo estimado**: 4-6 semanas para 2-3 developers para llegar a producción controlada. 8-10 semanas para producción real con performance y testing completos.

**Riesgo principal**: Pagos pueden duplicarse, datos pueden perderse, tenants pueden ser comprometidos en el estado actual. Los P0 de seguridad e integridad son la prioridad absoluta.

**Equipo necesita**: 1 backend senior (NestJS + Prisma + PostgreSQL), 1 frontend senior (React + Module Federation), 1 DevOps/SRE (Docker + CI/CD). Testing puede compartirse.

---

*Master Refactor Plan generado el 2026-07-05 — rama `planning/master-refactor-plan`*

*Documento basado en 7 auditorías: ARCHITECTURE_REVIEW (68/100), DOMAIN_DATA_MODEL_REVIEW (62/100), API_DESIGN_REVIEW (52/100), SECURITY_REVIEW (28/100), PRODUCTION_READINESS (12/100), PERFORMANCE_REVIEW (25/100), TECHNICAL_AUDIT (placeholder)*
