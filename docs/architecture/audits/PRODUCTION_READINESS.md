# PRODUCTION READINESS REVIEW — AuraRest Multitenant

> **Roles aplicados**: Principal SRE, Cloud Architect, DevOps Lead, Platform Engineer, Staff Software Engineer, Site Reliability Engineer, Production Readiness Reviewer
>
> **Fecha**: 2026-07-05
> **Rama**: `audit/architecture-review`
> **Tipo**: Revisión exclusiva de preparación para producción — sin implementación, sin código, solo análisis

---

## Respuesta Directa

### ¿Este proyecto puede salir a producción hoy?

**NO.**

### ¿Qué lo impide?

Existen **12 bloqueadores críticos (P0)** que hacen imposible un despliegue seguro:

1. **Sin contenedorización** — No hay Dockerfile, docker-compose, ni orquestación. No hay artefacto desplegable.
2. **Sin CI/CD** — No hay GitHub Actions, ni pipeline de build/test/deploy. Todo el deployment sería manual.
3. **Sin HTTPS/TLS** — Toda la comunicación viaja en texto plano. JWT tokens, credenciales, datos financieros expuestos.
4. **Secrets en git** — `apps/backend/.env` con credenciales DB y JWT secrets placeholder está commitado.
5. **Sin health checks** — Sin `/health`, `/ready`, `/live`. Orquestadores no pueden saber si la app está viva.
6. **Sin logging** — Cero logs estructurados. Solo `console.log` para mensajes de startup. Produciría un sistema ciego.
7. **Sin rate limiting** — Login vulnerable a brute force, payments a doble cobro, reports a resource exhaustion.
8. **CORS peligroso** — Fallback a `*` con `credentials: true` si falta variable de entorno.
9. **Pool de conexiones a DB insostenible** — Cada tenant crea un PrismaClient con pool propio. 11 tenants agotan `max_connections=100` de PostgreSQL.
10. **Sin transacciones en pagos** — Pagos multi-paso sin `$transaction`. Riesgo real de doble cobro.
11. **Sin idempotency keys** — Payment processing puede duplicarse por replay o retry.
12. **EventBus in-memory** — Impide escalar horizontalmente. Dos instancias no comparten eventos.

---

## 1. Arquitectura de despliegue

### 1.1 Docker

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Dockerfile | ❌ **NO EXISTE** en backend, frontend, ni root | `glob "**/Docker*"` sin resultados |
| docker-compose.yml | ❌ **NO EXISTE** | `glob "**/docker-compose*"` sin resultados |
| .dockerignore | ❌ **NO EXISTE** | — |
| Container strategy | ❌ Indefinida | — |

### 1.2 Kubernetes / Orquestación

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Kubernetes manifests | ❌ **NO EXISTEN** | — |
| Helm charts | ❌ **NO EXISTEN** | — |
| Terraform / CloudFormation | ❌ **NO EXISTEN** | `infra/` directorio vacío |
| Namespace isolation | ❌ No definido | — |

### 1.3 Reverse Proxy / API Gateway

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| nginx / Apache | ❌ **NO EXISTE** | — |
| API Gateway | ❌ No configurado | — |
| TLS termination | ❌ No hay capa de TLS | — |
| WAF | ❌ No configurado | — |

### 1.4 Ambientes

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Development | ✅ Scripts `dev:*` en root | `package.json` |
| Production build | ✅ `build`, `start:prod` | `apps/backend/package.json:10,14` |
| Staging | ❌ No definido | — |
| Production env config | ❌ `NODE_ENV=development` hardcodeado en `.env` | `apps/backend/.env:2` |
| Ambiente por tenant | ❌ No hay aislamiento de ambientes por tenant | — |

### 1.5 Scripts de producción faltantes

| Script | ¿Existe? |
|--------|----------|
| `docker:build` | ❌ |
| `docker:up` / `docker:down` | ❌ |
| `deploy` | ❌ |
| `release` | ❌ |
| `ci` | ❌ |
| `prisma:migrate:deploy` | ❌ |
| `prisma:generate` | ❌ (solo en dev) |
| `seed` | ✅ `ts-node prisma/seed.ts` |

---

## 2. Variables de entorno

### 2.1 Secretos commitados

| Hallazgo | Gravedad | Archivo |
|----------|----------|---------|
| `apps/backend/.env` **en git** con credenciales reales | 🔴 **CRÍTICO** | `apps/backend/.env` |
| `JWT_SECRET` placeholder: `"cambia_este_secreto_por_uno_seguro_en_produccion"` | 🔴 **CRÍTICO** | `apps/backend/.env:7` |
| `JWT_REFRESH_SECRET` placeholder | 🔴 **CRÍTICO** | `apps/backend/.env:9` |
| `DATABASE_URL` con password `postgres:postgres` | 🟡 **ALTO** | `apps/backend/.env:4-5` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` vacíos pero expuestos | 🟡 **ALTO** | `apps/backend/.env:15-16` |

### 2.2 Variables faltantes para producción

| Variable | Estado | Propósito |
|----------|--------|-----------|
| `NODE_ENV=production` | ❌ Solo `development` | Producción debe correr en modo production |
| `LOG_LEVEL` | ❌ No existe | Nivel de logging |
| `REDIS_URL` | ❌ No existe | Cache y pub/sub |
| `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX` | ❌ No existen | Rate limiting |
| `SENTRY_DSN` | ❌ No existe | Error tracking |
| `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX` | ❌ No existen | Pool de conexiones |

### 2.3 Defaults inseguros

| Default | Problema | Archivo |
|---------|----------|---------|
| `CORS_ORIGINS?.split(',') ?? '*'` | Si la variable falta, permite cualquier origen | `main.ts:20` |
| `JWT_EXPIRES_IN ?? '8h'` | Si la variable falta, 8h por defecto | `auth.module.ts:14` |
| `JWT_REFRESH_EXPIRES_IN ?? '7d'` | 7 días por defecto | `auth.service.ts:48` |
| `process.env.JWT_SECRET!` | Non-null assertion; si es undefined, error críptico | `jwt.strategy.ts:19` |
| NODE_ENV no validada | El código no verifica NODE_ENV en ningún lugar | — |

---

## 3. Base de datos

### 3.1 Migraciones

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| System migrations | ✅ 2 migraciones | `prisma/system/migrations/` |
| Tenant migrations | ✅ 6 migraciones | `prisma/tenant/migrations/` |
| Migración por tenant | ⚠️ Requiere ejecutar migración contra cada schema | Sin script de deploy |
| Script `prisma:migrate:deploy` | ❌ **NO EXISTE** | `apps/backend/package.json` |
| Script `prisma:generate` | ❌ No definido en package.json | — |
| Migrations en CI | ❌ No hay CI | — |

### 3.2 Rollback

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Capacidad de rollback | ⚠️ Prisma no tiene rollback nativo; requiere migración inversa manual | — |
| Script de rollback | ❌ **NO EXISTE** | — |
| Historia de migraciones | ✅ Migraciones están versionadas | `migrations/` directorios |

### 3.3 Seeders

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Seed script | ✅ `ts-node prisma/seed.ts` | `apps/backend/package.json:22` |
| Seed en CI | ❌ No hay CI | — |
| Seed passwords hardcodeados | 🟡 `Owner123`, `Admin123`, `Mesero123`, `Cajero123`, `Chef1234` | `prisma/seed.ts:75-121` |
| Seed JS commitado | 🟡 `seed.js` y `seed.js.map` en git | `prisma/` |

### 3.4 Backups y Disaster Recovery

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Backup strategy | ❌ **NO DOCUMENTADA** | — |
| Backup scripts (`pg_dump`) | ❌ **NO EXISTEN** | — |
| Point-in-time recovery | ❌ No configurado | — |
| Restore procedure | ❌ No documentado | — |
| RDS automated backups | ❌ Sin infraestructura cloud | — |

### 3.5 Conexiones y Pooling

| Problema | Gravedad | Detalle |
|----------|----------|---------|
| Pool por tenant sin límite | 🔴 **CRÍTICO** | `TenantPrismaService` crea pool por tenant sin límite superior |
| PostgreSQL `max_connections` excedido | 🔴 **CRÍTICO** | 11 tenants × 9 conexiones = 99 conexiones (default `max_connections=100`) |
| Sin PgBouncer / RDS Proxy | 🔴 **ALTO** | No hay pooler externo |
| Sin `connection_limit` en Prisma | 🟡 **MEDIO** | No se configura `?connection_limit=2` en datasource |
| Sin warm-up de conexiones | 🟡 **MEDIO** | `getClient()` no llama a `$connect()` |
| Sin TTL en cache de clients | 🟡 **MEDIO** | `Map<string, PrismaClient>` crece sin límite |

### 3.6 Transacciones

| Operación | ¿Usa transacción? | Archivo |
|-----------|-------------------|---------|
| Order creation (order + items + table update) | ❌ **NO** | `orders.service.ts:56-67` |
| Payment processing (payment + tip + order + table) | ❌ **NO** | `payments.service.ts:76-114` |
| User invitation (user + userBranch) | ❌ **NO** | `users.repository.ts:75-101` |
| Order cancellation (order + table) | ❌ **NO** | `orders.service.ts:188-210` |

---

## 4. Observabilidad

### 4.1 Logs

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Logging framework | ❌ **NO HAY** — Sin Winston, Pino, Bunyan, log4js | `apps/backend/package.json` |
| NestJS Logger | ❌ **CERO USO** en toda la aplicación | `grep "Logger"` sin resultados |
| Structured logging (JSON) | ❌ **NO** | — |
| Log levels (debug, info, warn, error) | ❌ **NO** | — |
| Únicos `console.log` | ⚠️ Startup URLs y seed progress | `main.ts:40-41`, `prisma/seed.ts` |

### 4.2 Correlation ID

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Correlation ID generation | ❌ **NO EXISTE** | — |
| `x-request-id` / `x-correlation-id` | ❌ **NO** en requests ni responses | — |
| Trace ID | ❌ **NO** | — |

### 4.3 Metrics y OpenTelemetry

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Prometheus metrics endpoint | ❌ **NO EXISTE** | — |
| `@willsoto/nestjs-prometheus` | ❌ No instalado | — |
| OpenTelemetry SDK | ❌ No instalado en app (solo en Next.js transitive) | — |
| Custom metrics (request count, latency, errors) | ❌ **NO** | — |
| Grafana dashboards | ❌ **NO** | — |

### 4.4 Error Tracking

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Sentry | ❌ **NO INSTALADO** | — |
| Datadog APM | ❌ No instalado | — |
| New Relic | ❌ No instalado | — |
| Global ExceptionFilter | ❌ **NO EXISTE** | — |
| Errores no capturados | ⚠️ Silenciosos, sin log | — |

---

## 5. Health Checks

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| `GET /health` | ❌ **NO EXISTE** | — |
| `GET /health/readiness` | ❌ **NO EXISTE** | — |
| `GET /health/liveness` | ❌ **NO EXISTE** | — |
| `@nestjs/terminus` | ❌ **NO INSTALADO** | `apps/backend/package.json` |
| Prisma connectivity check | ❌ **NO** | — |
| Database reachability check | ❌ **NO** | — |
| External dependency check | ❌ **NO** | — |
| Startup validation | ❌ `bootstrap()` no verifica conexión a DB | `main.ts` |

### Impacto

Sin health checks, **ningún orquestador** (Kubernetes, Docker Swarm, ECS, Nomad) puede determinar si la aplicación está viva o lista para recibir tráfico. Cualquier despliegue en contenedores fallaría por falta de `readinessProbe` y `livenessProbe`.

---

## 6. Monitoreo

### 6.1 Alertas

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Alert configuration | ❌ **NO EXISTE** | — |
| PagerDuty / OpsGenie | ❌ No integrado | — |
| Slack / Email alerts | ❌ No configurado | — |
| Error rate alert | ❌ No definido | — |
| Latency alert | ❌ No definido | — |

### 6.2 Recursos

| Aspecto | Estado |
|---------|--------|
| CPU monitoring | ❌ No implementado (depende de infraestructura cloud) |
| RAM monitoring | ❌ No implementado |
| Disk monitoring | ❌ No implementado |
| PostgreSQL monitoring | ❌ No implementado (depende de RDS) |
| Prisma query performance | ❌ Sin `$on('query')` listener |

### 6.3 Latencia

| Aspecto | Estado |
|---------|--------|
| Request latency tracking | ❌ No implementado |
| Database query latency | ❌ No implementado |
| P95 / P99 latency | ❌ No calculado |
| Slow query detection | ❌ No implementado |

---

## 7. CI/CD

### 7.1 GitHub Actions

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| `.github/workflows/` | ❌ **NO EXISTE** | No hay directorio `.github/` |
| Build pipeline | ❌ **NO** | — |
| Test pipeline | ❌ **NO** | — |
| Lint pipeline | ❌ **NO** | — |
| Typecheck pipeline | ❌ **NO** | — |
| Deploy pipeline | ❌ **NO** | — |

### 7.2 Quality Gates

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| SonarQube / SonarCloud | ❌ **NO CONFIGURADO** | — |
| Codecov / Coveralls | ❌ **NO** | — |
| PR checks | ❌ **NO** | — |
| Branch protection | ❌ **NO DOCUMENTADO** | Sin `CODEOWNERS` |

### 7.3 Security Scanning

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Dependabot | ❌ **NO CONFIGURADO** | — |
| Renovate | ❌ **NO** | — |
| Snyk | ❌ **NO** | — |
| Trivy | ❌ **NO** | — |
| CodeQL | ❌ **NO** | — |
| Secret scanning | ❌ **NO** — `.env` commitado | — |
| `pnpm audit` script | ❌ **NO** en ningún package.json | — |

### 7.4 Tests en CI

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Backend tests | ⚠️ Jest configurado, 1 test spec existente | `app.controller.spec.ts` |
| Frontend tests | ❌ **CERO** en MFEs y shared packages | — |
| E2E tests | ⚠️ Configurado (`jest-e2e.json`) pero solo boilerplate | — |
| Verify scripts | ✅ Scripts de verificación con Playwright | `verify-full.mjs`, `verify-login.mjs` |

---

## 8. Recuperación

### 8.1 Rollback

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Rollback de aplicación | ❌ Sin CI/CD, no hay rollback automatizado | — |
| Rollback de base de datos | ⚠️ Prisma no tiene rollback nativo | — |
| Migración inversa | ❌ No existe script | — |
| Versionado de releases | ❌ No definido | — |

### 8.2 Alta Disponibilidad

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Multi-instancia | ❌ **NO SOPORTADO** — EventBus in-memory impide escalar | `event-bus.service.ts` |
| Failover automático | ❌ No implementado | — |
| Stateless design | ⚠️ Parcial — JWT stateless, pero cache in-memory es stateful | — |
| Load balancer | ❌ No configurado | — |

### 8.3 Disaster Recovery

| Aspecto | Estado |
|---------|--------|
| DR plan | ❌ **NO DOCUMENTADO** |
| RTO (Recovery Time Objective) | ❌ No definido |
| RPO (Recovery Point Objective) | ❌ No definido |
| Cross-region replication | ❌ No configurado |
| Database snapshots | ❌ No configurado |

---

## 9. Escalabilidad

### 9.1 Horizontal Scaling

| Componente | ¿Escala horizontalmente? | Razón |
|------------|--------------------------|-------|
| Backend (NestJS) | ❌ **NO** | EventBus in-memory, Map de PrismaClients sin compartir |
| Frontend (Next.js static) | ✅ **SÍ** | Static export + CDN |
| MFEs (Vite) | ✅ **SÍ** | Static assets + CDN |
| PostgreSQL | ⚠️ Parcial | Schema-per-tenant, pero sin read replicas |
| EventBus | ❌ **NO** | In-memory `EventEmitter` no cruza instancias |

### 9.2 Vertical Scaling

| Recurso | Límite | Cuello de botella |
|---------|--------|-------------------|
| RAM | ~20GB/1,000 tenants | Cache de PrismaClients en `TenantPrismaService` |
| CPU | Depende de queries | Reportes sincrónicos sin cache |
| Conexiones DB | 100 por defecto PostgreSQL | Excedido con ~11 tenants |

### 9.3 Stateless / Stateful

| Componente | Stateful/Stateless | Problema |
|------------|-------------------|----------|
| Backend auth | Stateless | JWT — correcto |
| Backend EventBus | **Stateful** | `EventEmitter` no escala |
| TenantPrismaService | **Stateful** | `Map<string, Client>` en memoria |
| Prisma connection pools | **Stateful** | Por instancia |
| WebSocket (kitchen-mf) | **Stateful** | Conexión persistente sin backend |

### 9.4 Cache

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Redis | ❌ **NO INSTALADO** | Sin `ioredis`, sin `@nestjs/cache-manager` |
| Query result caching | ❌ **NO** — cada request viaja a DB | — |
| Dashboard stats caching | ❌ **NO** — `getStats()` recalcula todo | `orders.service.ts:212-264` |
| Menu/category caching | ❌ **NO** | — |
| Report caching | ❌ **NO** — CSVs generados sincrónicamente | `reports.service.ts:203-271` |

### 9.5 Queue

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Bull + Redis | ❌ **NO INSTALADO** | — |
| RabbitMQ | ❌ **NO** | — |
| SQS | ❌ **NO** | — |
| Job processing | ❌ **NO** — todo es sincrónico | — |
| Payment queue | ❌ **NO** — pagos bloquean HTTP request | `payments.service.ts` |
| Report generation queue | ❌ **NO** — CSVs generados inline | `reports.service.ts` |

### 9.6 WebSockets / Tiempo real

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Backend WebSocket | ❌ **NO IMPLEMENTADO** | Sin `@nestjs/websockets` |
| Kitchen KDS real-time | ❌ **NO** — frontend intenta WebSocket pero no hay backend | `kitchen-mf/src/hooks/useKitchenQueue.ts:35` |
| Fallback polling | ⚠️ Polling cada 30s | `useKitchenQueue.ts` |
| Ordenes en tiempo real | ❌ **NO** | — |
| Estado de mesas en tiempo real | ❌ **NO** | — |

### 9.7 Session / Store

| Aspecto | Estado |
|---------|--------|
| Server-side sessions | ❌ **NO** — stateless JWT |
| Token storage (frontend) | ⚠️ `localStorage` (XSS-vulnerable) |
| Refresh token store | ❌ No hay DB de refresh tokens |
| Session revocation | ❌ **NO** — tokens no son revocables |

---

## 10. Dependencias

### 10.1 Dependencias críticas

| Dependencia | Versión | Propósito | Riesgo |
|-------------|---------|-----------|--------|
| `@nestjs/core` | ^11.0.1 | Framework backend | Bajo — versión reciente |
| `@prisma/client` | ^6.0.0 | ORM | Bajo — versión reciente |
| `@nestjs/jwt` | ^11.0.2 | JWT | Bajo |
| `bcrypt` | ^6.0.0 | Hashing | Bajo |
| `next` | 16.2.6 | Frontend shell | Bajo — pinned exact |
| `react` / `react-dom` | 19.2.4 | UI | Bajo — pinned exact |
| `@module-federation/*` | ^1.0.0 / ^2.0.0 | MFE | **Medio** — versión early (1.x) |
| `passport-jwt` | ^4.0.1 | JWT auth | Bajo |

### 10.2 Dependencias obsoletas / vulnerables

| Paquete | Versión | Problema | Transitive de |
|---------|---------|----------|---------------|
| `glob` | 7.2.3 | Deprecated, vulnerabilidades conocidas | Múltiples paquetes |
| `glob` | 10.5.0 | Deprecated | Prisma / otros |
| `inflight` | 1.0.6 | Deprecated, memory leak | `glob` → `rimraf` → ... |

### 10.3 Dependencias faltantes para producción

| Dependencia | Propósito | Prioridad |
|-------------|-----------|-----------|
| `helmet` | Security headers | **CRÍTICA** |
| `@nestjs/throttler` | Rate limiting | **CRÍTICA** |
| `@nestjs/terminus` | Health checks | **CRÍTICA** |
| `winston` / `pino` | Structured logging | **CRÍTICA** |
| `@sentry/node` | Error tracking | **ALTA** |
| `ioredis` + `@nestjs/cache-manager` | Distributed cache | **ALTA** |
| `@nestjs/websockets` + `socket.io` | Real-time | **ALTA** |
| `bull` + `ioredis` | Job queue | **MEDIA** |

### 10.4 Lockfiles duplicados

| Lockfile | Problema |
|----------|----------|
| `pnpm-lock.yaml` (root) | ✅ Principal del workspace |
| `apps/web-shell/pnpm-lock.yaml` | ❌ **DUPLICADO** — puede causar versiones inconsistentes |

### 10.5 Dependencia faltante en lockfile

| Paquete | Declarado en | En lockfile |
|---------|-------------|-------------|
| `jspdf` ^4.2.1 | `apps/reports-mf/package.json` | ❌ **NO** — build fallaría |

### 10.6 TypeScript versions inconsistentes

| Paquete | Versión TypeScript |
|---------|-------------------|
| Backend | `^5.7.3` |
| Web-shell | `^5` |
| MFEs | `^5` |

---

## 11. Costos

### 11.1 Componentes necesarios para producción

| Componente | Servicio recomendado | Propósito |
|------------|---------------------|-----------|
| **Compute (Backend)** | AWS ECS Fargate / EKS | NestJS API, 2+ instancias para HA |
| **Compute (Frontend)** | Vercel / CloudFront + S3 | Next.js static export + MFEs |
| **Base de datos** | AWS RDS Aurora PostgreSQL | Sistema multi-tenant schemas |
| **Cache** | AWS ElastiCache Redis | Cache, pub/sub, rate limiting store |
| **Queue** | AWS SQS | Pagos async, reportes, notificaciones |
| **CDN** | AWS CloudFront | Static assets, MFEs remoteEntry.js |
| **Load Balancer** | AWS ALB | Distribución de tráfico a backend |
| **WAF** | AWS WAF | Rate limiting, IP blocking, SQLi |
| **DNS** | Route 53 / Cloudflare | Subdominios por tenant |
| **Monitoring** | CloudWatch + Sentry | Logs, métricas, errores |
| **Secrets** | AWS Secrets Manager | JWT secrets, DB credentials |
| **Connection Pooler** | RDS Proxy / PgBouncer | Pooling de conexiones a PostgreSQL |

### 11.2 Componentes que ya existen pero necesitan configuración

| Componente | Estado | Configuración necesaria |
|------------|--------|------------------------|
| S3 bucket | ✅ Configurado en `.env` (vacíos) | Definir buckets, IAM roles, lifecycle policies |
| AWS credentials | ⚠️ En `.env` (vacíos) | Mover a Secrets Manager |

### 11.3 Cost drivers principales

| Driver | Cómo escala | Mitigación |
|--------|-------------|------------|
| **Conexiones PostgreSQL** | Lineal con #tenants × pool size | RDS Proxy, reducir pool a 2-3 por tenant |
| **Memoria PrismaClients** | ~20MB/tenant | LRU cache + TTL, reducir a ~5MB/client |
| **Storage PostgreSQL** | ~10MB/tenant + datos operacionales | Aurora auto-scaling, archivado de órdenes viejas |
| **CDN data transfer** | Lineal con tráfico de MFEs | CloudFront caching de remoteEntry.js |
| **Logs** | Volumen de requests | CloudWatch Logs con retención limitada |

---

## 12. Riesgos

### P0 — Bloquea producción (debe resolverse antes de cualquier deploy)

| # | Riesgo | Impacto | Probabilidad | Esfuerzo estimado |
|---|--------|---------|-------------|-------------------|
| 1 | Sin Docker ni artefacto desplegable | Imposible deploy reproducible | 100% | 4-8 horas |
| 2 | Sin CI/CD | Todo deploy es manual y no auditado | 100% | 8-16 horas |
| 3 | Sin HTTPS/TLS | Credenciales y datos viajan en texto plano | 100% | 2-4 horas |
| 4 | Secrets commitados en `.env` | JWT secrets y DB credentials expuestos | 100% | 1 hora + git history cleanup |
| 5 | Sin health checks | Orquestador no puede gestionar la app | 100% | 2-4 horas |
| 6 | Sin logging estructurado | Sistema ciego en producción | 100% | 4-8 horas |
| 7 | Sin rate limiting | Brute force, DoS, double charge | Alta | 2-4 horas |
| 8 | CORS con fallback a `*` + credentials | CSRF, data leakage | Media | 30 min |
| 9 | Pool de conexiones PostgreSQL insostenible | DB cae con ~11+ tenants concurrentes | Alta | 4-8 horas |
| 10 | Pagos sin transacciones | Inconsistencia de datos, doble cobro | Alta | 4-8 horas |
| 11 | Sin idempotency keys en payments | Doble cobro por replay/retry | Alta | 4-8 horas |
| 12 | EventBus in-memory impide HA | No se puede ejecutar >1 instancia | 100% al escalar | 8-16 horas |

### P1 — Urgente (debe resolverse pronto)

| # | Riesgo | Impacto | Esfuerzo estimado |
|---|--------|---------|-------------------|
| 13 | TenantsController sin guards | Cualquier empleado gestiona todos los tenants | 1-2 horas |
| 14 | ReservationsController sin JWT | Reservas sin autenticación | 1-2 horas |
| 15 | Orders endpoints públicos (`@Public()`) | Datos financieros expuestos | 1-2 horas |
| 16 | Sin Helmet / security headers | Clickjacking, MIME sniffing, XSS | 1 hora |
| 17 | Tokens JWT en localStorage | Cualquier XSS roba sesión persistente | 8-16 horas |
| 18 | Sin correlation IDs | Imposible debugear requests en producción | 4-8 horas |
| 19 | `TenantPrismaService` cache sin límite | OOM con muchos tenants | 4-8 horas |
| 20 | Sin transacciones en órdenes | Datos inconsistentes en creación de orden | 4-8 horas |
| 21 | Race condition en `generateFolio()` | Folios duplicados bajo concurrencia | 2-4 horas |

### P2 — Importante (planificar para próximo sprint)

| # | Riesgo | Impacto | Esfuerzo estimado |
|---|--------|---------|-------------------|
| 22 | Sin soft delete en usuarios/branches | Pérdida permanente de datos | 4-8 horas |
| 23 | Sin pruebas en frontend | Regresiones no detectadas | 16-40 horas |
| 24 | Sin linting en MFEs | Código inconsistente | 2-4 horas |
| 25 | Sin typecheck script | Errores de tipo silenciosos | 2-4 horas |
| 26 | Sin backup strategy | Riesgo de pérdida total de datos | 4-8 horas |
| 27 | Sin error tracking (Sentry) | Errores silenciosos en producción | 4-8 horas |
| 28 | Branch-level authorization ausente | Waiter ve datos de todas las sucursales | 8-16 horas |
| 29 | Frontend WebSocket sin backend | Kitchen KDS no funciona | 8-16 horas |
| 30 | Dependabot desactivado | Vulnerabilidades no detectadas | 1 hora |
| 31 | `apps/web-shell/pnpm-lock.yaml` duplicado | Versiones inconsistentes | 30 min |

### P3 — Planificar (post-MVP)

| # | Riesgo | Esfuerzo estimado |
|---|--------|-------------------|
| 32 | Sin MFA | 16-40 horas |
| 33 | Sin módulo de reporting async | 8-16 horas |
| 34 | Sin caché Redis para queries frecuentes | 8-16 horas |
| 35 | Sin Queue para pagos async | 8-16 horas |
| 36 | Sin GraphQL / REST optimization | 16-24 horas |
| 37 | Sin dashboard de monitoreo (Grafana) | 8-16 horas |
| 38 | Sin OpenTelemetry tracing | 16-24 horas |

---

## 13. Go / No Go

### ¿Lo desplegarías hoy?

**NO.**

### ¿Por qué?

El proyecto tiene una base técnica correcta: la arquitectura schema-per-tenant es sólida, NestJS/Prisma son opciones robustas, la auth con JWT Bearer está bien implementada en la mayoría de módulos. Sin embargo, **no hay ninguna capa de infraestructura, operaciones, ni preparación para producción**. Faltan todos los componentes que transforman una aplicación en un servicio productivo:

| Componente | ¿Existe? |
|------------|----------|
| Aplicación funcionando en dev | ✅ Sí |
| Docker / artefacto desplegable | ❌ No |
| CI/CD | ❌ No |
| Health checks | ❌ No |
| Logging | ❌ No |
| Monitoring | ❌ No |
| Error tracking | ❌ No |
| HTTPS | ❌ No |
| Rate limiting | ❌ No |
| Secrets management | ❌ No |
| Backup strategy | ❌ No |
| Disaster recovery | ❌ No |
| Escalabilidad horizontal | ❌ No |

### ¿Qué bloquea producción?

1. **No hay artefacto para desplegar** — Sin Docker, el deploy no es reproducible. Cada deploy sería manual y frágil.
2. **No hay pipeline** — Sin CI/CD, cada cambio requiere intervención manual. Sin tests automatizados en CI, los errores llegan a producción.
3. **No hay visibilidad** — Sin logs, sin métricas, sin health checks, el equipo no sabrá si la app está funcionando hasta que un usuario reporte un problema.
4. **Riesgo de seguridad crítico** — Secrets commitados, sin HTTPS, sin rate limiting, tokens en localStorage. Múltiples vectores de ataque abiertos.
5. **Riesgo de datos** — Pagos sin transacciones ni idempotency. Un error de red puede generar doble cobro a un cliente real.
6. **Riesgo de disponibilidad** — EventBus in-memory impide tener >1 instancia. Una sola instancia = single point of failure.

### ¿Qué es obligatorio resolver?

| Prioridad | Qué | Por qué |
|-----------|-----|---------|
| 🔴 P0 | Docker + docker-compose | Sin esto no hay deployment reproducible |
| 🔴 P0 | CI/CD básico (GitHub Actions) | Sin esto no hay calidad ni automatización |
| 🔴 P0 | HTTPS/TLS (certbot, ALB, CloudFront) | Sin esto las credenciales viajan en texto plano |
| 🔴 P0 | Limpiar `.env` de git + Secrets Manager | Secrets commitados = breach inminente |
| 🔴 P0 | Health checks (`@nestjs/terminus`) | Orquestador no puede gestionar la app |
| 🔴 P0 | Structured logging (Pino/Winston) | Sistema ciego = imposible operar |
| 🔴 P0 | Rate limiting (`@nestjs/throttler`) | Login vulnerable, payments vulnerable |
| 🔴 P0 | CORS fix (quitar fallback `*`) | Riesgo CSRF inminente |
| 🔴 P0 | Pool de conexiones (RDS Proxy + límites) | DB muere con >11 tenants concurrentes |
| 🔴 P0 | Transacciones en payments | Doble cobro = pérdida financiera y legal |
| 🔴 P0 | Idempotency keys en payments | Doble cobro por retry |
| 🔴 P0 | EventBus reemplazar por Redis Pub/Sub | HA imposible sin esto |

### ¿Qué puede esperar?

| Qué | Razón |
|-----|-------|
| MFA | Aceptable para v1, planificar para v2 |
| Grafana dashboards | Monitoring básico con CloudWatch es suficiente inicialmente |
| OpenTelemetry tracing | Poco valor hasta tener múltiples servicios |
| WebSocket para cocina | MVP puede funcionar con polling |
| Queue para reportes | Aceptable mientras haya <100 requests/día |
| Soft delete | Importante pero no bloqueante |
| Pruebas en frontend | Crítico a mediano plazo, no bloquea MVP |
| Branch-level authorization | Depende del modelo operativo del restaurante |

---

## 14. Production Readiness Score

| Dimensión | Score | Justificación |
|-----------|-------|---------------|
| **Deployment** | **5/100** | Sin Docker, sin docker-compose, sin Kubernetes, sin Helm, sin Terraform. No hay artefacto desplegable. |
| **Infrastructure** | **5/100** | Sin HTTPS, sin CDN, sin WAF, sin reverse proxy, sin Load Balancer. `infra/` está vacío. |
| **Monitoring** | **2/100** | Sin health checks, sin métricas, sin alerts, sin dashboards, sin error tracking. Sistema completamente ciego. |
| **Observability** | **3/100** | Sin logging framework, sin structured logs, sin correlation IDs, sin tracing. Único output: `console.log`. |
| **Recovery** | **5/100** | Sin backup strategy, sin DR plan, sin rollback, sin RTO/RPO definidos. Sin alta disponibilidad (EventBus in-memory). |
| **CI/CD** | **0/100** | Sin GitHub Actions, sin pipelines, sin Dependabot, sin quality gates, sin PR checks. |
| **Security** | **15/100** | Secrets commitados, JWT secrets placeholder, sin HTTPS, sin Helmet, CORS peligroso, tokens en localStorage. |
| **Database** | **30/100** | Migraciones versionadas (bueno), pero sin pooling, sin transacciones, sin backup, sin rollback, sin encryption. |
| **Backend** | **35/100** | Guards y auth bien en mayoría de módulos, pero TenantsController sin guards (CRITICAL), sin transacciones, sin eventos distribuidos. |
| **Frontend** | **25/100** | Module Federation funcional, pero sin tests, sin lint en MFEs, MFE CORS `*`, WebSocket sin backend, tokens en localStorage. |
| **Overall** | **12/100** | El proyecto es funcional en desarrollo pero carece de TODO lo necesario para operar en producción. Es un prototipo avanzado, no un servicio productivo. |

---

## Resumen Ejecutivo

**Production Readiness Score: 12/100**

### No apto para producción.

Existen **12 bloqueadores críticos (P0)** que deben resolverse antes de cualquier despliegue. Los más graves son:

1. **🔴 No hay artefacto desplegable** (sin Docker) — No se puede hacer un deployment reproducible.
2. **🔴 No hay CI/CD** — Sin automatización, todo cambio es manual y no auditado.
3. **🔴 Sin HTTPS/TLS** — Credenciales y datos financieros viajan en texto plano.
4. **🔴 Secrets commitados en git** — JWT secrets y credenciales DB en el repositorio.
5. **🔴 Sin health checks** — Ningún orquestador puede gestionar la aplicación.
6. **🔴 Sin logging** — Sistema completamente ciego en producción.
7. **🔴 Pool de conexiones a DB insostenible** — ~11 tenants agotan `max_connections=100`.
8. **🔴 Pagos sin transacciones ni idempotency** — Riesgo real de doble cobro.

### Lo que SÍ funciona en desarrollo

- Arquitectura schema-per-tenant correcta y bien implementada
- Autenticación JWT Bearer en la mayoría de módulos
- Guards globales (JwtAuthGuard, RolesGuard)
- Prisma ORM sin SQL injection
- Module Federation funcional entre shell y MFEs
- Migraciones de base de datos versionadas

### Próximos pasos recomendados

1. Agregar Dockerfile y docker-compose para backend + PostgreSQL
2. Configurar GitHub Actions con lint, typecheck, test, audit
3. Agregar `helmet`, `@nestjs/throttler`, `@nestjs/terminus`, logger
4. Limpiar `.env` del historial git y mover secrets a variables de entorno
5. Configurar RDS Proxy + límites de pool en Prisma
6. Agregar transacciones e idempotency keys en payments
7. Reemplazar EventBus in-memory por Redis Pub/Sub
8. Agregar correlation ID middleware

---

**Production Readiness Review finalizada.**
