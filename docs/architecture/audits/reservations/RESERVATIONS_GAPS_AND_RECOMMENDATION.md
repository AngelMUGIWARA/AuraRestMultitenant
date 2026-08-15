# 📋 CONCLUSIONES Y RECOMENDACIONES: AUDITORÍA RESERVACIONES

**Documento:** RESERVATIONS_GAPS_AND_RECOMMENDATION.md  
**Auditoría:** analysis/reservations-flow-audit  
**Fecha:** 2026-07-24  
**Rama:** analysis/reservations-flow-audit  

---

## RESPUESTAS A PREGUNTAS CRÍTICAS

### 1. ¿El módulo cumple el requisito de Reservas?

**RESPUESTA:** 🟡 **PARCIALMENTE**

**Evidencia:**
- ✅ Módulo existe y es funcional
- ✅ Estados básicos implementados (PENDING, CONFIRMED, ARRIVED, COMPLETED, CANCELLED, NO_SHOW)
- ✅ Multi-tenancy presente
- ✅ Branch isolation en decoradores
- ✅ Roles configurados
- ❌ Validaciones críticas ausentes (conflictos, capacidad)
- ❌ Integración mesas incompleta
- ❌ Integración órdenes ausente

**Requisito Base:** "Gestión de mesas con estados libre, ocupada y reservada"
- ✅ Estados existen
- ❌ Cambios de estado no verificables

---

### 2. ¿Puede marcarse como completado?

**RESPUESTA:** 🔴 **NO**

**Defectos Bloqueantes:**
- P0-001: Discrepancia de tipos entre packages/types y Prisma
- P0-002: Race condition de concurrencia sin protección
- P0-003: Cambios de mesa no verificables

Mientras existan P0 sin resolver, módulo no está listo para producción.

---

### 3. ¿Existe riesgo de doble reserva?

**RESPUESTA:** 🔴 **SÍ, CRÍTICO**

**Escenario:**
```
Cliente A: POST /create (table-1, 19:00)
Cliente B: POST /create (table-1, 19:00)  [Simultáneamente]

Resultado: Ambas reservas creadas ✅
           Misma mesa, misma hora 🔴
           DOBLE RESERVA
```

**Causa Raíz:**
- Sin transacciones serializables
- Sin `@@unique([tableId, branchId, scheduledAt])`
- Sin validación de conflictos

**Probabilidad:** ALTA (requiere timing, pero es posible)

---

### 4. ¿La integración con Mesas es correcta?

**RESPUESTA:** 🔴 **NO VERIFICABLE**

| Operación | Cambio Esperado | ¿Verificado? |
|-----------|-----------------|------------|
| Crear (PENDING) | Mesa sin cambio o RESERVED | ❌ NO |
| Confirmar | Mesa sin cambio o RESERVED | ❌ NO |
| Check-in (ARRIVED) | Mesa → OCCUPIED | ❌ NO |
| Completar | Mesa → AVAILABLE | ❌ NO |
| Cancelar | Mesa → AVAILABLE | ❌ NO |
| No-show | Mesa → AVAILABLE | ❌ NO |

**Riesgo:** Mesa puede quedar OCCUPIED incluso si reserva se cancela.

---

### 5. ¿La integración con Órdenes existe?

**RESPUESTA:** 🔴 **NO**

**Evidencia:**
- Modelo Order NO tiene `reservationId`
- Modelo Reservation NO tiene `orderId`
- No existe relación en Prisma

**Impacto:**
- Imposible enlazar orden con reserva
- No se puede auto-crear orden en check-in
- No se puede marcar orden como no-show

**Deuda Técnica Crítica**

---

### 6. ¿El aislamiento multi-tenant es seguro?

**RESPUESTA:** 🟡 **PROBABLEMENTE SÍ, pero no verificado**

| Escenario | Protección |
|-----------|-----------|
| Tenant A consulta Reservation de B | ✅ TenantGuard |
| Tenant A usa tableId de B | ❓ DESCONOCIDO |
| Tenant A accede con branchId de B | ❓ DESCONOCIDO |

**Recomendación:** Auditar service.ts para confirmar validaciones.

---

### 7. ¿Los roles son correctos?

**RESPUESTA:** 🟡 **PARCIALMENTE**

**Lo que funciona:**
- ✅ Roles decorados correctamente
- ✅ WAITER NO puede cambiar estado
- ✅ CASHIER+ puede cambiar estado

**Lo que falta:**
- ❌ Sin permisos dinámicos (solo roles fijos)
- ❓ Sin validación de branch del usuario

**Clasificación:** Aceptable para MVP, mejorable para producción.

---

### 8. ¿Qué defectos son bloqueantes?

**RESPUESTA:** 3 DEFECTOS P0

| Defecto | Severidad | Bloquea | Solución |
|---------|-----------|--------|----------|
| Race condition (doble reserva) | 🔴 P0 | ✅ SÍ | Transacción serializable |
| Discrepancia de tipos | 🔴 P0 | ✅ SÍ | Sincronizar types |
| Cambios de mesa desconocidos | 🔴 P0 | ✅ SÍ | Verificar + arreglar service |

---

### 9. ¿Se requiere una rama de corrección?

**RESPUESTA:** 🔴 **SÍ**

**Rama Recomendada:** `fix/reservations-engine`

**Alcance:**

**P0 (Crítico - semana 1):**
- [ ] Agregar validación de conflictos horarios
- [ ] Agregar índice `@@unique([branchId, tableId, scheduledAt])`
- [ ] Envolver POST /create en transacción `Serializable`
- [ ] Sincronizar packages/types con Prisma model
- [ ] Verificar y arreglar cambios de TableStatus
- [ ] Agregar `durationMinutes` a Reservation
- [ ] Agregar field `order_validation` a confirmar si Order se crea

**P1 (Alto - semana 2):**
- [ ] Agregar validación de capacidad `partySize <= table.capacity`
- [ ] Hacer branchId required en filtros o autofiltrar
- [ ] Agregar validación `table.branchId = request.branchId`
- [ ] Implementar expiración de PENDING (2 horas)
- [ ] Implementar cambio RESERVED (30 min antes)
- [ ] Agregar campos de auditoría (confirmedAt, confirmedBy, etc.)

**P2 (Medio - semana 3+):**
- [ ] Agregar Order.reservationId FK
- [ ] Tests para conflictos, concurrencia, transiciones
- [ ] E2E tests
- [ ] Índices de performance

---

### 10. ¿Cuál debe ser el nombre y alcance de esa rama?

**RESPUESTA:**

```
Branch: fix/reservations-engine
Base: dev
Duración estimada: 2-3 semanas

Commit 1: Validaciones críticas (conflictos, capacity, tipos)
Commit 2: Transacciones y índices
Commit 3: Auditoría y cambios de mesa
Commit 4: Tests
Commit 5: Documentación
```

**Alcance:** Resolver P0 + P1, dejar P2 documentado para futuro.

---

### 11. ¿Qué no debe modificarse?

**RESPUESTA:** Cambios FUERA de scope:

- ❌ No refactorizar arquitectura (está bien)
- ❌ No cambiar roles/permisos (ya está funcional)
- ❌ No eliminar estados
- ❌ No cambiar rutas de endpoint
- ❌ No implementar campos no evidenciados

**En Scope:**
- ✅ Validaciones
- ✅ Índices
- ✅ Sincronización de tipos
- ✅ Transacciones
- ✅ Tests
- ✅ Documentación

---

### 12. ¿Cuál debe ser el siguiente módulo a revisar?

**RESPUESTA:** **Tables Management**

**Justificación:**
- Reservaciones depende de Tables
- Si Tables no tiene buen aislamiento/validación, Reservaciones hereda riesgos
- Vale la pena auditar antes de cerrar Reservaciones

**Alternativas:**
- Orders (integración con Reservaciones)
- Promotions (afecta precios en órdenes)
- Kitchen (afecta flujo de órdenes)

**Recomendación:** Tables → Orders → Promotions

---

## RESUMEN FINAL

| Aspecto | Calificación | Evidencia |
|---------|------------|-----------|
| **Existencia** | ✅ SÍ | Módulo completo |
| **Completitud** | 🟡 PARCIAL | Flujos básicos, faltan validaciones |
| **Defectos P0** | 🔴 3 | Críticos, bloquean producción |
| **Defectos P1** | 🔴 8+ | Altos, requieren corrección |
| **Defectos P2** | 🟡 ~5 | Medios, mejora técnica |
| **Seguridad** | 🟡 DUDOSA | Multi-tenancy SÍ, validaciones NO |
| **Tests** | 🔴 10% | Apenas existen, casos críticos no |
| **Producción Ready** | 🔴 NO | Riesgo de doble reserva |

---

## VEREDICTO

## 🟡 REQUIERE CORRECCIONES

**El módulo de Reservaciones:**
- ✅ Existe y es funcional
- ✅ Implementa flujos básicos
- ✅ Tiene multi-tenancy
- ❌ Presenta defectos P0 bloqueantes
- ❌ No es seguro para producción sin correcciones

**Ruta Forward:**

1. **Crear rama:** `fix/reservations-engine`
2. **Resolver P0:** Conflictos, concurrencia, tipos (1-2 semanas)
3. **Resolver P1:** Validaciones, tests (2-3 semanas)
4. **Revisar:** Tables Management en paralelo
5. **Integración:** Órdenes (fase 2)

**No bloquea otros módulos** pero **REQUIERE corrección antes de producción**.

---

**Auditoría Completada:** 2026-07-24  
**Rama Auditada:** analysis/reservations-flow-audit  
**Estado:** LISTO PARA REVISIÓN MANUAL

