# SECURITY REVIEW — AuraRest Multitenant

> **Roles aplicados**: Principal Security Engineer, OWASP Reviewer, Backend Security Architect, Cloud Security Engineer, DevSecOps Engineer, Pentester Senior
>
> **Fecha**: 2026-07-05
> **Rama**: `audit/architecture-review`
> **Tipo**: Auditoría de seguridad de nivel empresarial — sin implementación, sin refactors, solo análisis

---

## Índice

1. [Autenticación](#1-autenticación)
2. [Autorización](#2-autorización)
3. [Multitenancy](#3-multitenancy)
4. [OWASP Top 10](#4-owasp-top-10)
5. [API Security](#5-api-security)
6. [Base de datos](#6-base-de-datos)
7. [Frontend](#7-frontend)
8. [Infraestructura](#8-infraestructura)
9. [Auditoría](#9-auditoría)
10. [Threat Modeling](#10-threat-modeling)
11. [Producción](#11-producción)
12. [Security Score](#12-security-score)
13. [Tabla de Riesgos](#13-tabla-de-riesgos)

---

## 1. Autenticación

### 1.1 Login

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Endpoint `POST /auth/login` | ✅ Existe | `auth.controller.ts:22` |
| Validación de email + password | ✅ `@IsEmail()`, `@MinLength(6)` | `login.dto.ts:7-12` |
| Bcrypt para comparación | ✅ `bcrypt.compare()` | `auth.service.ts:23` |
| Error genérico (no user enumeration) | ✅ "Credenciales incorrectas" para email y password inválidos | `auth.service.ts:21,24` |
| **⚠️ User enumeration parcial** | ❌ Mensaje "Usuario inactivo o suspendido" revela que el usuario **existe** | `auth.service.ts:27` |
| **⚠️ Sin rate limiting en login** | ❌ No hay `@nestjs/throttler` ni limitación de intentos | `package.json` |
| **⚠️ Sin account lockout** | ❌ No hay contador de intentos fallidos | `auth.service.ts:17-53` |
| **⚠️ Sin CAPTCHA** | ❌ No hay integración con reCAPTCHA/hCaptcha | — |

### 1.2 Logout

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Endpoint `POST /auth/logout` | ❌ **NO EXISTE** | `auth.controller.ts` solo tiene `login` |
| Invalidación de tokens en servidor | ❌ Imposible (tokens stateless sin blacklist) | — |
| Logout client-side | ⚠️ Solo borra tokens de localStorage | `auth-client/src/index.ts:44` |

### 1.3 Refresh Token

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Refresh token generado | ✅ `refreshToken` en respuesta de login | `auth.service.ts:46-49` |
| Endpoint `POST /auth/refresh` | ❌ **NO EXISTE** | `auth.controller.ts` solo tiene `login` |
| Refresh token almacenado en BD | ❌ No hay tabla de refresh tokens | `prisma/tenant/schema.prisma` |
| Refresh token revocable | ❌ No hay blacklist ni versión | — |
| Rotación de refresh tokens | ❌ No implementada | — |
| **⚠️ Falsa sensación de seguridad** | ❌ El refresh token se genera pero NUNCA se puede usar | `auth.service.ts:46-49` |

### 1.4 JWT

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| `JWT_SECRET` | ❌ **PLACEHOLDER**: `"cambia_este_secreto_por_uno_seguro_en_produccion"` | `apps/backend/.env:7` |
| `JWT_REFRESH_SECRET` | ❌ **PLACEHOLDER**: `"cambia_este_refresh_secreto_en_produccion"` | `apps/backend/.env:9` |
| Expiración access token | ⚠️ 8 horas (largo para producción) | `auth.module.ts:14` |
| Expiración refresh token | ⚠️ 7 días | `auth.service.ts:48` |
| `ignoreExpiration: false` | ✅ Correcto | `jwt.strategy.ts:18` |
| Bearer token validation | ✅ `ExtractJwt.fromAuthHeaderAsBearerToken()` | `jwt.strategy.ts:17` |
| **⚠️ Sin jti (JWT ID)** | ❌ No hay `jti` en claims — no se puede identificar token único | `auth.service.ts:35-41` |
| **⚠️ Sin verificación de estado de usuario en cada request** | ❌ `validate()` solo retorna payload sin consultar DB | `jwt.strategy.ts:24-31` |
| **⚠️ Sin verificación de tenant activo** | ❌ No se valida `tenant.status === 'ACTIVE'` en cada request | — |
| `as any` en expiresIn | ❌ TypeScript unsafe cast | `auth.module.ts:14` |

### 1.5 Password Policy

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Longitud mínima | ⚠️ Solo `@MinLength(6)` — por debajo de OWASP (8+) y NIST | `login.dto.ts:11` |
| Complejidad (mayúsculas, dígitos, especiales) | ❌ No exigida | — |
| Historial de passwords | ❌ No implementado | — |
| Expiración de password | ❌ No implementada | — |
| Check contra breached passwords | ❌ No implementado | — |
| Bcrypt rounds | ⚠️ 10 (mínimo recomendado, OWASP sugiere 12+) | `.env:19` |

### 1.6 Recuperación de contraseña

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| `POST /auth/forgot-password` | ❌ **NO EXISTE** en backend | `auth.controller.ts` |
| `POST /auth/reset-password` | ❌ **NO EXISTE** en backend | `auth.controller.ts` |
| Frontend llama a estos endpoints | ❌ **Dead code** — `auth-mf` llama a endpoints que no existen | `apps/auth-mf/src/services/auth.service.ts:16-19` |
| Cambio de password | ❌ `UpdateUserDto` omite password explícitamente | `users/dto/update-user.dto.ts:6` |

### 1.7 MFA

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| TOTP / 2FA | ❌ No implementado | — |
| SMS / Email codes | ❌ No implementado | — |
| WebAuthn / FIDO2 | ❌ No implementado | — |
| Backup codes | ❌ No implementado | — |

### 1.8 Session Fixation

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Stateless JWT | ✅ No hay server-side sessions que fijar | — |
| Token fingerprinting | ❌ No hay device fingerprint en el token | — |
| Invalidación de todas las sesiones | ❌ No hay mecanismo | — |

---

## 2. Autorización

### 2.1 Arquitectura de Guards

| Guard | Registro | Archivo |
|-------|----------|---------|
| `JwtAuthGuard` | Global via `APP_GUARD` | `app.module.ts:51` |
| `RolesGuard` | Global via `APP_GUARD` | `app.module.ts:52` |
| `TenantGuard` | Por controller (no global) | Cada controller |

### 2.2 Hallazgos CRÍTICOS — Broken Access Control

#### 🔴 CRITICAL: TenantsController sin guards

| Aspecto | Detalle |
|---------|---------|
| **Archivo** | `tenants/tenants.controller.ts:1-28` |
| **Problema** | **NINGÚN guard** en el controller. Sin `@UseGuards`, sin `@Roles()`. |
| **Impacto** | Cualquier usuario autenticado (WAITER, CHEF) puede listar, crear y modificar TODOS los tenants del sistema. |
| **Endpoints expuestos** | `GET /admin/tenants`, `POST /admin/tenants`, `PUT /admin/tenants/:id` |
| **Base de datos** | Opera sobre `PrismaService` (schema del sistema) — ve TODOS los tenants |

#### 🔴 CRITICAL: ReservationsController con guard insuficiente

| Aspecto | Detalle |
|---------|---------|
| **Archivo** | `reservations/reservations.controller.ts:9-10` |
| **Problema** | Solo usa `@UseGuards(TenantGuard)`. **Sin JwtAuthGuard ni RolesGuard**. |
| **Impacto** | Cualquier request con un `x-tenant-slug` válido (sin JWT) puede gestionar reservas. |
| **Endpoints expuestos** | Todos (GET, POST, PATCH, stats) |

#### 🔴 HIGH: Orders endpoints públicos

| Aspecto | Detalle |
|---------|---------|
| **Archivo** | `orders/orders.controller.ts:64-76` |
| **Problema** | `GET /orders/stats` y `GET /orders/:id` son `@Public()` |
| **Impacto** | Cualquiera con el tenant slug puede ver ingresos del día, órdenes activas, y detalles de cualquier orden |

#### 🔴 HIGH: Reservations sin roles

| Aspecto | Detalle |
|---------|---------|
| **Archivo** | `reservations/reservations.controller.ts` |
| **Problema** | Ningún endpoint tiene `@Roles()`. RolesGuard permite acceso a cualquier rol autenticado. |
| **Impacto** | CHEF y KITCHEN_STAFF pueden crear/modificar reservas |

#### 🔴 HIGH: ADMIN puede modificar OWNER

| Aspecto | Detalle |
|---------|---------|
| **Archivo** | `users/users.controller.ts:96-131` |
| **Problema** | `update()` y `remove()` no verifican jerarquía. ADMIN puede eliminar/modificar al OWNER. |

### 2.3 Horizontal Privilege Escalation

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Ownership verification en Users | ❌ `remove()` recibe `@CurrentUser()` pero nunca lo usa | `users.controller.ts:127` |
| Ownership verification en Orders | ❌ Cualquier WAITER puede modificar órdenes de otros | `orders.controller.ts` |
| Ownership verification en Payments | ❌ Cualquier CASHIER paga cualquier orden | `payments.controller.ts` |
| Branch-level authorization | ❌ **No implementado en ningún módulo** | Todos los controllers |
| Self-service profile | ❌ No hay endpoint para que un usuario edite su propio perfil | — |

### 2.4 Vertical Privilege Escalation

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| `RolesGuard` sin `@Roles()` permite todo | ✅ Por diseño, pero riesgo de olvido | `roles.guard.ts:20` |
| Tenants sin roles | 🔴 CRÍTICO: cualquier rol puede gestionar tenants | `tenants.controller.ts` |
| Reservations sin roles | 🔴 ALTO: cualquier rol gestiona reservas | `reservations.controller.ts` |

---

## 3. Multitenancy

### 3.1 Aislamiento entre tenants

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Esquema por tenant (PostgreSQL schema) | ✅ Correcto | `tenant-prisma.service.ts:13-28` |
| Cliente Prisma separado por schema | ✅ `Map<string, TenantPrismaClient>` | `tenant-prisma.service.ts:10` |
| `schemaName` extraído del JWT | ✅ En claims firmados | `auth.service.ts:35-41` |
| **⚠️ Sin validación de tenant activo** | ❌ `TenantMiddleware` no verifica `tenant.status` | `tenant.middleware.ts:21-54` |
| **⚠️ Sin validación de tenant plan** | ❌ No se verifica si el plan permite la operación | — |

### 3.2 Header Manipulation / Spoofing

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| `x-tenant-slug` user-controlled | ✅ Pero validado contra DB | `tenant.middleware.ts:40-52` |
| JWT tenant claims bypass header | ✅ El JWT tiene prioridad sobre el header | `tenant.middleware.ts:24-37` |
| **⚠️ Sin cross-validation** | ⚠️ No se valida que `x-tenant-slug` del header coincida con JWT claims | `tenant.middleware.ts:24-37` |
| Subdomain extraction | ⚠️ Ignora localhost, api, www | `tenant.middleware.ts:57-62` |

### 3.3 Cross-Tenant Data Leakage

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Aislamiento a nivel DB | ✅ PostgreSQL schema isolation | — |
| **⚠️ TenantsController expone todos los tenants** | 🔴 CRÍTICO: usa `PrismaService` (system), no `TenantPrismaService` | `tenants.repository.ts:7` |
| **⚠️ TenantContext inconsistente** | ⚠️ JWT path setea solo `{schemaName, slug}`, header path setea objeto completo | `tenant.middleware.ts:28-31 vs 49-51` |
| Cache compartido de Prisma clients | ⚠️ Sin TTL, sin eviction | `tenant-prisma.service.ts:10` |

### 3.4 Consultas inseguras

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| `schemaName` interpolado en URL | ⚠️ Sin sanitización de `schemaName` | `tenant-prisma.service.ts:15-18` |
| Sin validación de formato `schemaName` | ⚠️ Solo `@IsString()` en DTO | `tenant.dtos.ts:18` |

---

## 4. OWASP Top 10

| # | Categoría | Estado | Evidencia |
|---|-----------|--------|-----------|
| **A01** | Broken Access Control | 🔴 **CRÍTICO** | TenantsController sin guards (CRITICAL), ReservationsController sin JWT (HIGH), Orders público (HIGH), sin ownership verification |
| **A02** | Cryptographic Failures | 🟡 **ALTO** | JWT secrets placeholder en `.env` commitado, sin HTTPS, sin HSTS, refresh token generado pero inusable |
| **A03** | Injection | 🟢 **MEDIO** | Prisma ORM previene SQLi, pero `schemaName` se interpola en URL de DB; CSV export sin sanitización |
| **A04** | Insecure Design | 🟡 **ALTO** | Sin rate limiting, sin idempotency keys, sin correlation IDs, sin auditoría, race condition en folios |
| **A05** | Security Misconfiguration | 🔴 **CRÍTICO** | Sin Helmet, CORS fallback a `*` con credentials, Swagger expuesto sin auth, MFE CORS `*`, sin ExceptionFilter global |
| **A06** | Vulnerable Components | 🟢 **BAJO** | Dependencias recientes (NestJS 11, Prisma 6), sin auditorías de seguridad periódicas |
| **A07** | Authentication Failures | 🔴 **CRÍTICO** | Sin rate limiting en login, sin account lockout, sin MFA, sin logout endpoint, refresh token inservible, password policy débil |
| **A08** | Software & Data Integrity | 🟢 **BAJO** | Sin CI/CD pipeline verificado, sin SRI en Module Federation |
| **A09** | Security Logging & Monitoring | 🔴 **CRÍTICO** | Sin logging library, sin audit trail, `ActivityLog` en schema pero NUNCA usado, sin correlation IDs, sin error tracking |
| **A10** | SSRF | 🟢 **BAJO** | Sin llamadas a URLs externas observadas |

---

## 5. API Security

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| **Security Headers (Helmet)** | ❌ **NO INSTALADO** | `main.ts` no usa `app.use(helmet())` |
| **CSP** | ❌ No configurado | — |
| **HSTS** | ❌ No configurado | — |
| **X-Frame-Options** | ❌ No configurado | — |
| **X-Content-Type-Options** | ❌ No configurado | — |
| **CORS** | ⚠️ **CRÍTICO**: fallback a `*` con `credentials: true` si env var falta | `main.ts:19-22` |
| **CSRF** | ❌ No implementado (mitigado parcialmente por JWT Bearer) | — |
| **Rate Limiting** | ❌ **NO IMPLEMENTADO** | Sin `@nestjs/throttler` |
| **Idempotency Keys** | ❌ **NO IMPLEMENTADO** — Riesgo de doble pago | `payments.service.ts` |
| **Replay Attack Protection** | ❌ No implementado | — |
| **Correlation ID** | ❌ No implementado | — |
| **Mass Assignment** | ✅ `whitelist: true`, `forbidNonWhitelisted: true` | `main.ts:12-17` |
| **DTO Validation** | ✅ Global ValidationPipe | `main.ts:11-17` |
| **Input Sanitization** | ❌ No hay sanitización de inputs | — |
| **XSS Protection** | ❌ No hay CSP, no hay output encoding visible | — |

---

## 6. Base de datos

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| **SQL Injection** | 🟢 **NO VULNERABLE** — Prisma ORM parametriza consultas | Sin `$executeRaw` ni `$queryRaw` en ningún service |
| **Schema name injection** | ⚠️ `schemaName` interpolado en URL sin sanitización | `tenant-prisma.service.ts:15-18` |
| **Transacciones** | ❌ **NINGUNA** operación multi-paso usa `$transaction` | Pagos, órdenes, invitaciones sin transacción |
| **Soft Delete** | ❌ **Hard delete** en Users, Branches, Discounts, Promotions | `users.repository.ts:123` |
| **Encryption at rest** | ❌ Sin encryption de PII (email, phone, address en texto plano) | Prisma schema |
| **ActivityLog table exists but unused** | ❌ Migrada a DB pero NUNCA escrita por código | `prisma/tenant/schema.prisma:411-425` |
| **Secrets en código** | 🔴 `.env` con credenciales DB y JWT secrets **commitados** | `apps/backend/.env` |
| **Contraseña DB** | 🔴 `postgres:postgres` — credencial por defecto | `apps/backend/.env:4` |

---

## 7. Frontend

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| **JWT en localStorage** | 🔴 **CRÍTICO**: accesible por cualquier XSS | `auth-client/src/index.ts:20,25` |
| **Refresh token en localStorage** | 🔴 **CRÍTICO**: aún más peligroso por su larga duración (7d) | `auth-client/src/index.ts:30,35` |
| **No HttpOnly cookies** | ❌ Todo el manejo de tokens es JS-accessible | — |
| **XSS vector: `dangerouslySetInnerHTML`** | ⚠️ Usado en layout raíz | `web-shell/src/app/layout.tsx:47` |
| **Module Federation sin SRI** | ⚠️ `remoteEntry.js` sin integridad, sin verificación de origen | `federation.ts:38-47` |
| **MFE URLs sobre HTTP** | ⚠️ Fallback a `http://localhost:5XXX` | `federation.ts:39-46` |
| **Singleton shared modules mutables** | ⚠️ Caché global mutable de módulos compartidos | `federation.ts:13-16` |
| **Env variables expuestas al cliente** | ⚠️ `NEXT_PUBLIC_*` visibles en browser | `federation.ts` |
| **WebSocket sin autenticación** | ⚠️ `ws://localhost:3001/kitchen/queue` sin token | `kitchen-mf/src/hooks/useKitchenQueue.ts:35-36` |
| **Tenant slug override desde localStorage** | ⚠️ `currentTenantSlug` en localStorage permite confusión de UI | `api-client/src/client.ts:47` |

---

## 8. Infraestructura

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| **Docker** | ❌ **NO EXISTE** — Sin Dockerfile, sin docker-compose | — |
| **HTTPS/TLS** | ❌ **NO IMPLEMENTADO** en ningún componente | — |
| **CI/CD** | ❌ **NO EXISTE** — Sin `.github/workflows/` | — |
| **Dependabot** | ❌ No configurado | — |
| **Secret scanning** | ❌ No configurado | — |
| **Branch protection** | ❌ Sin `CODEOWNERS`, sin reglas documentadas | — |
| **Backup strategy** | ❌ No documentada | — |
| **Nginx / Reverse Proxy** | ❌ No hay configuración | — |
| **WAF** | ❌ No configurado | — |
| **Health checks** | ❌ Sin `/health` endpoint | — |
| **Error tracking** | ❌ Sin Sentry, Datadog, etc. | — |
| **`.env` commitado** | 🔴 **CRÍTICO**: `apps/backend/.env` en el repo con credenciales reales | — |
| **Seed passwords hardcoded** | 🟡 `Owner123`, `Admin123`, `Mesero123`, `Cajero123`, `Chef1234` en git history | `prisma/seed.ts:75-121` |

---

## 9. Auditoría

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| **Logger library** | ❌ **NO HAY** — Sin Winston, Pino, Bunyan, log4js | `package.json` |
| **NestJS Logger** | ❌ **CERO USO** en toda la app | `grep "Logger"` sin resultados |
| **Request logging** | ❌ Sin middleware/interceptor de logging | — |
| **Correlation IDs** | ❌ No generados | — |
| **Exception filter global** | ❌ No existe | — |
| **ActivityLog implementation** | ❌ Tabla existe en DB pero **NUNCA se escribe** | — |
| **Failed login logging** | ❌ No se registran intentos fallidos | `auth.service.ts` |
| **Payment audit trail** | ❌ Sin `processedBy`, sin logging de fallos | `payments.service.ts` |
| **Order cancellation trace** | ❌ Sin `cancelledBy`, `cancelledAt` (reason opcional) | `orders.service.ts:188-210` |
| **Data export audit** | ❌ Exportaciones no registradas | `reports.controller.ts` |
| **User CRUD audit** | ❌ Creación/borrado/cambio de status no se loggean | `users.service.ts` |
| **Tenant changes audit** | ❌ Creación/modificación no se loggea | `tenants.service.ts` |
| **Event Bus persistence** | ❌ `EventEmitter` in-memory, sin persistencia | `event-bus.service.ts` |
| **Database query logging** | ❌ Sin listener de Prisma queries | — |

---

## 10. Threat Modeling

### Login

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| Brute force de passwords | Alta | Alto | ❌ No — sin rate limiting, sin lockout |
| Credential stuffing | Alta | Alto | ❌ No — sin breached password check |
| Token theft via XSS | Alta | Crítico | ❌ Tokens en localStorage |
| JWT secret compromise | Baja | Crítico | ⚠️ Placeholder en `.env` commitado |
| User enumeration | Media | Bajo | ⚠️ Parcial — "Usuario inactivo" revela existencia |

### Pago

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| Double charge por replay | Alta | Alto | ❌ Sin idempotency key |
| Double charge por race condition | Alta | Alto | ❌ Sin transacción |
| Payment processing sin auth | Media | Alto | ⚠️ Guardado por roles, pero sin branch verification |
| Refund sin autorización | Baja | Medio | ❌ No hay endpoint de refund |
| Payment data leakage | Media | Alto | ⚠️ Orders públicos expuestos |

### Orden

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| Orden pública expuesta | Alta | Alto | ❌ `GET /orders/:id` es `@Public()` |
| Cancelación no autorizada | Media | Medio | ⚠️ Guardado por roles |
| Folio duplicado por concurrencia | Alta | Medio | ❌ Race condition en `generateFolio()` |
| Modificación de orden por otro usuario | Media | Medio | ❌ Sin ownership verification |

### Tenant

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| Creación de tenant no autorizada | Alta | Crítico | ❌ TenantsController sin guards |
| Listado de todos los tenants | Alta | Alto | ❌ Cualquier usuario autenticado |
| Modificación de tenant existente | Alta | Crítico | ❌ Sin guards |
| Acceso de tenant suspendido | Media | Alto | ❌ Sin validación de status |

### Branch

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| Ver datos de otra sucursal | Alta | Medio | ❌ Sin branch-level authorization |
| Modificar datos de otra sucursal | Media | Medio | ❌ Sin branch-level authorization |

### Dashboard

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| Stats financieros públicos | Alta | Alto | ❌ `GET /orders/stats` es `@Public()` |
| Exportación de datos sin auditoría | Alta | Alto | ❌ Sin audit trail en exports |

### Kitchen

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| WebSocket sin auth | Alta | Medio | ❌ No hay token en handshake |
| Manipulación de tickets | Media | Medio | ❌ Sin ownership verification |

### Caja (Cashier)

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| Procesar pago en orden de otra sucursal | Alta | Alto | ❌ Sin branch filter |
| Descuento no autorizado | Media | Medio | ⚠️ Guardado por roles |

### Usuarios

| Amenaza | Probabilidad | Impacto | ¿Mitigado? |
|---------|-------------|---------|------------|
| ADMIN elimina al OWNER | Media | Crítico | ❌ Sin jerarquía de roles |
| ADMIN se elimina a sí mismo | Baja | Alto | ❌ Sin self-deletion protection |
| Hard delete sin recuperación | Media | Alto | ❌ No hay soft delete |

---

## 11. Producción

### ¿Subirías este proyecto a producción hoy?

**NO.**

### ¿Por qué?

Existen **múltiples vulnerabilidades críticas** que hacen que el proyecto sea inseguro para producción empresarial:

1. **Broken Access Control crítico**: TenantsController sin guards permite a cualquier empleado (WAITER, CHEF) listar, crear y modificar todos los restaurantes de la plataforma.
2. **ReservationsController sin JWT**: Cualquiera con el slug del tenant puede gestionar reservas sin autenticación.
3. **Orders público**: Cualquiera puede ver estadísticas financieras y detalles de órdenes.
4. **JWT secrets placeholder**: Commitados en `.env` en el repositorio.
5. **Sin rate limiting**: Login vulnerable a brute force, payments vulnerables a spam.
6. **Sin idempotency keys**: Doble cobro posible en payments.
7. **Sin HTTPS**: Toda la comunicación en texto plano.
8. **Sin security headers**: Sin Helmet, sin CSP, sin HSTS.
9. **Sin logging ni auditoría**: Imposible detectar o investigar incidentes.
10. **Tokens JWT en localStorage**: Cualquier XSS roba sesiones persistentes.

### ¿Qué rompería?

- **Un ataque de fuerza bruta al login** rompería la confidencialidad de todas las cuentas.
- **Un ataque de replay a payments** generaría dobles cobros a clientes reales.
- **Un XSS en cualquier MFE** robaría tokens de acceso y refresh (7 días de acceso persistente).
- **Cualquier empleado descontento** podría listar todos los tenants y crear cuentas no autorizadas.

### ¿Qué puede explotarse hoy?

| Vulnerabilidad | Explotación | Dificultad |
|---------------|-------------|------------|
| TenantsController sin guards | `GET /api/v1/admin/tenants` — lista todos los restaurantes | Muy fácil |
| Reservations sin JWT | `POST /api/v1/admin/reservations` — crear reservas sin auth | Muy fácil |
| Orders público | `GET /api/v1/orders/stats` — ver ingresos del día | Muy fácil |
| Login sin rate limit | Brute force con diccionario | Fácil |
| JWT secrets débiles | Forzar HMAC con palabra conocida | Media |

### ¿Qué vulnerabilidades son críticas?

| # | Vulnerabilidad | Prioridad |
|---|---------------|-----------|
| 1 | TenantsController sin guards | 🔴 **Inmediata** |
| 2 | ReservationsController sin JWT | 🔴 **Inmediata** |
| 3 | JWT secrets placeholder en `.env` commitado | 🔴 **Inmediata** |
| 4 | CORS con wildcard fallback + credentials | 🔴 **Inmediata** |
| 5 | Sin rate limiting en login | 🔴 **Inmediata** |
| 6 | Sin idempotency en payments | 🔴 **Inmediata** |
| 7 | Sin HTTPS | 🔴 **Inmediata** |
| 8 | Sin security headers (Helmet) | 🟡 **Alta** |
| 9 | Sin logging ni auditoría | 🟡 **Alta** |
| 10 | Orders endpoints públicos | 🟡 **Alta** |

### ¿Qué vulnerabilidades son aceptables?

| Vulnerabilidad | Razón |
|---------------|-------|
| Sin MFA | Aceptable para MVP, debe planificarse para v2 |
| Sin HATEOAS | Aceptable — API REST práctica |
| Sin WebAuthn | Aceptable para etapa actual |
| Sin API keys para third parties | Aceptable — no hay integraciones third-party aún |
| Sin rate limiting en reports | Aceptable temporalmente si hay pocos usuarios concurrentes |

---

## 12. Security Score

| Dimensión | Score | Justificación |
|-----------|-------|---------------|
| **Authentication** | **20/100** | Login sin rate limit, sin MFA, sin logout, refresh token inservible, JWT secrets placeholder, sin password recovery, sin account lockout |
| **Authorization** | **25/100** | TenantsController sin guards (CRITICAL), Reservations sin JWT (CRITICAL), Orders público (HIGH), sin ownership, sin branch-level auth |
| **Tenant Isolation** | **55/100** | Schema-per-tenant sólido, pero sin validación de tenant activo, inconsistencia en TenantContext, TenantsController expone todos los tenants |
| **API Security** | **30/100** | Sin Helmet, sin rate limiting, sin CSRF, sin idempotency, CORS peligroso, sin correlation IDs |
| **Frontend Security** | **25/100** | JWT y refresh token en localStorage, sin HttpOnly cookies, MFE sin SRI, WebSocket sin auth, `dangerouslySetInnerHTML` |
| **Backend Security** | **30/100** | Sin ExceptionFilter, sin logging, sin transacciones, hard deletes, race conditions |
| **Database Security** | **40/100** | Prisma ORM previene SQLi (bueno), pero sin encryption at rest, sin transacciones, credenciales débiles commitadas |
| **Infrastructure** | **10/100** | Sin Docker, sin CI/CD, sin HTTPS, sin backup strategy, sin health checks, sin error tracking, sin secret scanning |
| **Observability** | **5/100** | Sin logging library, sin audit trail, sin correlation IDs, sin métricas, sin tracing, sin health endpoints |
| **Overall Security** | **28/100** | El proyecto tiene una base técnica correcta (NestJS, Prisma, schema-per-tenant, JWT) pero carece de casi todos los controles de seguridad necesarios para producción empresarial |

---

## 13. Tabla de Riesgos

| # | Riesgo | Impacto | Probabilidad | Prioridad | Esfuerzo Estimado |
|---|--------|---------|-------------|-----------|-------------------|
| 1 | TenantsController sin autenticación/autorización | Crítico | Alta | **P0 — Inmediata** | 1-2 horas |
| 2 | ReservationsController sin JWT | Crítico | Alta | **P0 — Inmediata** | 1-2 horas |
| 3 | JWT secrets placeholder en `.env` commitado | Crítico | Alta | **P0 — Inmediata** | 30 min |
| 4 | Sin rate limiting en login | Alto | Alta | **P0 — Inmediata** | 2-4 horas |
| 5 | Sin idempotency en payments | Alto | Alta | **P0 — Inmediata** | 4-8 horas |
| 6 | CORS wildcard fallback + credentials | Crítico | Media | **P0 — Inmediata** | 30 min |
| 7 | Orders endpoints públicos (`@Public()`) | Alto | Alta | **P1 — Urgente** | 1-2 horas |
| 8 | Sin HTTPS/TLS | Crítico | Alta | **P1 — Urgente** | 2-4 horas (config infra) |
| 9 | Sin Helmet / security headers | Alto | Alta | **P1 — Urgente** | 1 hora |
| 10 | Tokens JWT en localStorage | Crítico | Media | **P1 — Urgente** | 8-16 horas (migrar a cookies) |
| 11 | Sin logging ni auditoría | Alto | Alta | **P1 — Urgente** | 16-24 horas |
| 12 | Sin correlation IDs | Medio | Alta | **P2 — Importante** | 4-8 horas |
| 13 | Sin transacciones en payments | Alto | Media | **P2 — Importante** | 4-8 horas |
| 14 | ADMIN puede modificar/eliminar OWNER | Alto | Media | **P2 — Importante** | 2-4 horas |
| 15 | Branch-level authorization ausente | Medio | Alta | **P2 — Importante** | 8-16 horas |
| 16 | Race condition en `generateFolio()` | Medio | Alta | **P2 — Importante** | 2-4 horas |
| 17 | Hard delete en usuarios | Alto | Media | **P2 — Importante** | 4-8 horas |
| 18 | Sin MFA | Medio | Media | **P3 — Planificar** | 16-40 horas |
| 19 | Sin CI/CD | Medio | Media | **P3 — Planificar** | 8-16 horas |
| 20 | Sin Docker | Medio | Media | **P3 — Planificar** | 4-8 horas |
| 21 | Sin Dependabot / secret scanning | Bajo | Media | **P3 — Planificar** | 1-2 horas |
| 22 | Module Federation sin SRI | Medio | Baja | **P3 — Planificar** | 4-8 horas |
| 23 | WebSocket sin autenticación | Medio | Media | **P3 — Planificar** | 4-8 horas |
| 24 | Sin ExceptionFilter global | Bajo | Alta | **P3 — Planificar** | 2-4 horas |
| 25 | Sin validación de tenant activo | Alto | Baja | **P3 — Planificar** | 2-4 horas |

---

## Resumen Ejecutivo

**Security Score General: 28/100**

El proyecto AuraRest Multitenant tiene **3 vulnerabilidades críticas que deben corregirse antes de cualquier despliegue**:

1. **🔴 TenantsController sin guards** — Cualquier empleado puede gestionar todos los restaurantes de la plataforma.
2. **🔴 ReservationsController sin JWT** — Cualquiera con el slug del tenant puede gestionar reservas sin autenticación.
3. **🔴 JWT secrets placeholder y `.env` commitado** — Las claves de firma JWT y credenciales de base de datos están en texto plano en el repositorio.

Además, hay **7 vulnerabilidades de prioridad inmediata (P0)** que habilitan ataques como brute force de login, doble cobro en pagos, exposición de datos financieros, y falta total de controles de seguridad HTTP.

La arquitectura base es correcta (schema-per-tenant multitenancy, NestJS, Prisma ORM, JWT Bearer auth), pero la implementación de seguridad perimetral, controles de acceso, y observabilidad está prácticamente ausente.

---

**Security Review finalizada.**
