# 🔐 SEGURIDAD Y MULTI-TENANCY: RESERVACIONES

**Documento:** RESERVATIONS_SECURITY_AND_TENANCY.md  
**Auditoría:** analysis/reservations-flow-audit  
**Fecha:** 2026-07-24  

---

## MULTI-TENANCY

### Mecanismo de Resolución

```
HTTP Request (JWT o header x-tenant-slug)
  ↓
TenantMiddleware (apps/backend/src/common/middleware/tenant.middleware.ts)
  ├─ Extrae JWT → payload.tenantSchemaName
  ├─ O header x-tenant-slug → busca Tenant en BD global
  ├─ O subdominio → busca Tenant en BD global
  ↓
Request.tenant = { schemaName, slug }
  ↓
TenantGuard (apps/backend/src/common/guards/tenant.guard.ts)
  ├─ Valida que Request.tenant existe
  ├─ Si no → UnauthorizedException
  ↓
@CurrentTenant() decorator inyecta TenantContext
  ↓
ReservationsService recibe schemaName
  ↓
TenantPrismaService.getClient(schemaName)
  ↓
Prisma client para schema específico del tenant
```

### Validaciones

| Escenario | Protección | Evidencia |
|-----------|-----------|-----------|
| Tenant A intenta consultar Reservation de Tenant B | ✅ SÍ | TenantGuard en controller + schemaName específico |
| Tenant A intenta actualizar branchId a rama de Tenant B | ❓ DESCONOCIDO | Depende de validación en service |
| Tenant A usa tableId de Tenant B | ❓ DESCONOCIDO | Depende de validación de table.branchId |
| User sin JWT intenta acceder | ✅ Bloqueado | JwtAuthGuard |
| Request sin TenantMiddleware | ✅ Bloqueado | TenantGuard valida Request.tenant |

### Riesgos Identificados

- 🟡 **P1:** Sin validación explícita que table.branchId pertenece al tenant resolvido
- 🟡 **P1:** branchId en ReservationQueryDto es optional → posible listing cross-tenant

---

## BRANCH ISOLATION

### Filtrado por Branch

```typescript
// ReservationQueryDto
class ReservationQueryDto {
  @IsOptional() @IsUUID()
  branchId?: string;  // ← ¿Optional o Required?
  
  @IsOptional()
  status?: ReservationStatus;
  
  @IsOptional()
  search?: string;
}
```

### Validaciones por Rol

| Rol | GET /list | POST /create | PATCH /status |
|-----|-----------|------------|---------------|
| OWNER | ✅ Todas branches del tenant | ✅ Todas | ✅ Todas |
| ADMIN | ✅ Todas branches del tenant | ✅ Todas | ✅ Todas |
| MANAGER | ❓ Solo su branch? | ❓ Solo su branch? | ❓ Solo su branch? |
| CASHIER | ❓ Solo su branch? | ✅ Su branch | ✅ Su branch |
| WAITER | ❓ Solo su branch? | ✅ Su branch | ❌ NO |

**Hallazgo:** Sin acceso a CurrentUser.branchId o contexto de branch, no se puede confirmar si hay filtrado automático.

---

## GUARDS Y DECORADORES

### Controllers

```typescript
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
class ReservationsController {
  
  @Roles("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER")
  @Post()
  create() { }
  
  @Roles("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER")
  @Get()
  findAll() { }
  
  @Roles("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER")
  @Get(":id")
  findOne() { }
  
  @Roles("OWNER", "ADMIN", "MANAGER", "CASHIER")  // NO WAITER
  @Patch(":id/status")
  updateStatus() { }
  
  @Roles("OWNER", "ADMIN", "MANAGER", "CASHIER", "WAITER")
  @Get("/stats")
  getStats() { }
}
```

### Decoradores por Endpoint

| Endpoint | JwtAuthGuard | TenantGuard | RolesGuard | Roles |
|----------|-------------|------------|----------|-------|
| POST /create | ✅ | ✅ | ✅ | OWNER+ |
| GET / | ✅ | ✅ | ✅ | OWNER+ |
| GET /:id | ✅ | ✅ | ✅ | OWNER+ |
| PATCH /:id/status | ✅ | ✅ | ✅ | OWNER, ADMIN, MANAGER, CASHIER (NO WAITER) |
| GET /stats | ✅ | ✅ | ✅ | OWNER+ |

**Hallazgo:** Solo /status requiere CASHIER+, resto requieren WAITER+.

---

## INYECCIONES DE CONTEXTO

```typescript
@CurrentTenant()
tenant: TenantContext
  {
    schemaName: "tenant_1"
    slug: "restaurant-1"
  }

@CurrentUser()
user: AuthenticatedUser
  {
    id: "user-1"
    email: "manager@example.com"
    role: "MANAGER"
    branchId?: "branch-1"  // ¿Siempre existe?
  }
```

**Hallazgo:** Sin acceso a código, no se puede confirmar si branchId siempre está populado.

---

## SWAGGER SECURITY

```typescript
@ApiBearerAuth("JWT")  // JWT requerido
@ApiSecurity("TenantSlug")  // x-tenant-slug header
@Controller("admin/reservations")
```

---

## PERMISOS DINÁMICOS

**Búsqueda:** No hay evidencia de permisos dinámicos como:
- `reservation:create`
- `reservation:update`
- `reservation:cancel`

**Conclusión:** Privilegios son FIJOS en roles, no DINÁMICOS.

---

## RIESGOS DE SEGURIDAD

### P0 - CRÍTICO

**Riesgo P0-S1: Race Condition de Concurrencia**
- Descripción: Dos solicitudes simultáneas pueden reservar la misma mesa
- Protección: NINGUNA (sin transacciones, sin locks)
- Mitigation: Agregar `Serializable` isolation level

**Riesgo P0-S2: Sin Validación de Capacidad**
- Descripción: partySize puede ser > table.capacity
- Protección: DESCONOCIDA
- Mitigation: Validar en DTO o service

---

### P1 - ALTO

**Riesgo P1-S1: Branch Scope Débil**
- Descripción: branchId optional en filtros
- Protección: POSIBLE filtrado automático (no verificable)
- Mitigation: Hacer branchId required o autofiltrar

**Riesgo P1-S2: Sin Validación de Pertenencia**
- Descripción: No se verifica que table.branchId = request.branchId
- Protección: DESCONOCIDA
- Mitigation: Validar en service

**Riesgo P1-S3: Sin Validación de Conflictos**
- Descripción: Dos reservas pueden tomar misma mesa
- Protección: NINGUNA
- Mitigation: Agregar validación + índice

---

### P2 - MEDIO

**Riesgo P2-S1: WAITER puede crear reservas**
- Descripción: Mesero puede crear reserva, solo admin puede cambiar estado
- Impacto: Bajo (separación de duties existe)
- Mitigation: Ninguna necesaria

**Riesgo P2-S2: Sin Auditoría de Quién Confirmó**
- Descripción: No existe campo confirmedBy o confirmedAt
- Impacto: No se sabe quién confirmó reserva
- Mitigation: Agregar campos de auditoría

---

## CONCLUSIONES

| Aspecto | Estado | Calificación |
|--------|--------|-------------|
| Aislamiento Tenant | ✅ Presente | Seguro |
| Guards | ✅ Completos | Seguro |
| Roles | ✅ Configurados | Seguro (pero fixed) |
| Branch Isolation | 🟡 Dudosa | Requerida verificación |
| Validaciones | 🔴 Insuficientes | RIESGOS P0 |
| Concurrencia | 🔴 Sin protección | CRÍTICO |

**Recomendación:** Implementar transacciones serializables e índices compuestos antes de producción.
