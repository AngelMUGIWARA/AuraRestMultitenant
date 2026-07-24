# Public API Module

Módulo que expone endpoints públicos (sin autenticación) para consumo de clientes finales.

## Características

### Menu Public Engine

Endpoint público para consultar menús de restaurantes de manera segura y optimizada.

**Endpoint:**
```
GET /public/menu/:tenantSlug?branch=:branchSlug
```

**Respuesta:**
```json
{
  "tenant": { "slug": "...", "name": "...", "logoUrl": "..." },
  "branch": { "id": "...", "name": "...", "slug": "...", ... },
  "categories": [
    {
      "id": "...",
      "name": "...",
      "items": [
        { "id": "...", "name": "...", "price": 10.99, ... }
      ]
    }
  ],
  "updatedAt": "2026-07-24T..."
}
```

**Características:**
- ✅ Solo lectura (sin crear órdenes, sin procesar pagos)
- ✅ Seguridad multi-tenancy (isolamiento garantizado)
- ✅ Rate limiting (60 req/60s)
- ✅ Filtrado automático de items inactivos
- ✅ Optimizado (4 queries, sin N+1)

---

## Limitaciones Actuales (Deuda Técnica)

El módulo público actualmente **NO soporta:**

### 1. Modifiers (Extras/Opcionales)

**Status:** No existe modelo de modificadores  
**Impacto:** Items no pueden tener opciones (ej: "Sin picante", "Extra queso")  
**Depende de:** `feature/modifiers-engine` (Fase 2)  
**Ejemplo esperado:**
```json
{
  "id": "item-1",
  "name": "Pizza",
  "modifiers": [
    {
      "id": "mod-1",
      "name": "Tamaño",
      "required": true,
      "options": [
        { "id": "opt-1", "name": "Pequeño", "priceDelta": 0 },
        { "id": "opt-2", "name": "Grande", "priceDelta": 2.50 }
      ]
    }
  ]
}
```

### 2. Availability (Disponibilidad Avanzada)

**Status:** Disponibilidad binaria (true/false)  
**Impacto:** No se pueden mostrar items "Carga próxima" o "Disponible después de las 5pm"  
**Depende de:** `feature/inventory-integration` (Fase 2)  
**Limitación:** Solo se expone `isAvailable: boolean`

### 3. Inventory (Inventario Real)

**Status:** No hay integración con sistema de stock  
**Impacto:** No se puede mostrar "Quedan 2 unidades"  
**Depende de:** `feature/inventory-engine` (Fase 2)  
**Nota:** Disponibilidad es manual, no automática desde stock

### 4. Schedules (Horarios)

**Status:** No existe modelo de horarios de disponibilidad  
**Impacto:** No se puede mostrar "Disponible Lunes-Viernes 11am-11pm"  
**Depende de:** `feature/schedule-engine` (Fase 2)  
**Nota:** El menú es global para sucursal, sin horarios

### 5. Taxes (Impuestos Desglosados)

**Status:** No existe modelo separado de impuestos  
**Impacto:** Precio es final (sin desglose de IVA/ISH)  
**Cálculo de impuestos:** Ocurre en órdenes, no en menú público  
**Depende de:** `feature/tax-engine` (Fase 2)

### 6. Promotions (Descuentos Aplicables)

**Status:** Información promocional sin aplicación automática  
**Impacto:** El menú puede mostrar "En promoción" pero no recalcula precios  
**Cálculo de descuentos:** Ocurre en órdenes, no en menú público  
**Por diseño:** El cálculo definitivo pertenece a PromotionsEngine

---

## Seguridad

- ✅ Multi-tenancy: `schemaName` NO viene del cliente, siempre del tenant validado
- ✅ Branch isolation: No se puede acceder a branches de otros tenants
- ✅ No expose: Costos, márgenes, datos administrativos
- ✅ Rate limit: 60 requests / 60 segundos por IP
- ✅ Validación: Tenant activo, Branch activa, Items activos

---

## Performance

- **Queries:** 4 queries exactas (sin N+1)
- **Índices:** Utiliza `categoryId`, `branchId`, `slug`
- **Caching:** Recomendado para futuras versiones (Redis)
- **Selección de campos:** Explícita (no devuelve datos innecesarios)

---

## Tipos en packages/types

Las interfaces públicas están centralizadas en `packages/types/src/index.ts`:

- `PublicMenuItemDto`
- `PublicCategoryDto`
- `PublicBranchDto`
- `PublicTenantDto`
- `PublicMenuResponseDto`

Estas son versiones **simplificadas** de las entidades internas (MenuItem, Branch, etc.) optimizadas para consumo público.

---

## Integración Frontend (menu-mf)

Para consumir este endpoint desde menu-mf, agregar método a `packages/api-client`:

```typescript
export const menuPublicService = {
  getPublicMenu: (tenantSlug: string, branchSlug?: string) =>
    apiClient.get<ApiResponse<PublicMenuResponseDto>>(
      `/public/menu/${tenantSlug}`,
      { params: branchSlug ? { branch: branchSlug } : undefined }
    ),
};
```

---

## Roadmap Futuro

| Fase | Feature | Prioridad |
|------|---------|-----------|
| 2 | Modifiers Engine | Alta |
| 2 | Inventory Integration | Alta |
| 3 | Schedule Engine | Media |
| 3 | Tax Engine | Media |
| 4 | Redis Caching | Baja |
| TBD | QR Code Generator | TBD |

---

## Referencias

- [Menu Public Engine - Implementación](./menu/README.md) (si existe)
- [Deuda Técnica Completa](../../docs/TECHNICAL_DEBT.md)
- [Multi-tenancy Pattern](../../docs/MULTI_TENANCY.md)

---

**Última actualización:** 2026-07-24  
**Autor:** Claude Code  
**Estado:** Producción (Fase 1)
