# 🪑 INTEGRACIÓN MESAS: RESERVACIONES

**Documento:** RESERVATIONS_TABLE_INTEGRATION.md  
**Auditoría:** analysis/reservations-flow-audit  
**Fecha:** 2026-07-24  

---

## MODELOS RELACIONADOS

### Reservation Model

```prisma
model Reservation {
  id        String @id @default(cuid())
  tableId   String @map("table_id")
  // ...
  table     RestaurantTable @relation(fields: [tableId], references: [id])
  @@index([tableId])
  @@map("reservations")
}
```

### RestaurantTable Model

```prisma
model RestaurantTable {
  id           String      @id @default(cuid())
  number       Int
  capacity     Int
  status       TableStatus @default(AVAILABLE)
  isActive     Boolean     @default(true)
  branchId     String
  
  reservations Reservation[]  // Relación inversa
  @@map("tables")
}

enum TableStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
  MAINTENANCE
}
```

---

## ESCENARIOS DE INTERACCIÓN

### Escenario 1: Crear Reserva (POST /admin/reservations)

**Input:**
```json
{
  "guestName": "Juan Pérez",
  "partySize": 4,
  "scheduledAt": "2026-07-25T19:00:00Z",
  "branchId": "branch-1",
  "tableId": "table-5"
}
```

**Validaciones Esperadas:**
1. ✅ Table existe (fk: tableId → RestaurantTable.id)
2. ❓ Table activa (table.isActive = true)?
3. ❓ Table pertenece a branch (table.branchId = branchId)?
4. ❓ PartySize ≤ table.capacity?
5. ❓ Sin conflicto horario (otra reserva PENDING/CONFIRMED/ARRIVED)?

**Efecto en Mesa:**
- ❓ TableStatus sin cambio? → RESERVED?
- Permanece AVAILABLE?

**Resultado:**
```json
{
  "id": "res-1",
  "status": "PENDING",
  "tableId": "table-5",
  "scheduledAt": "2026-07-25T19:00:00Z"
}
```

**Hallazgo:** Sin verificación observable, estado de mesa desconocido.

---

### Escenario 2: Confirmar Reserva (PATCH /admin/reservations/:id/status → CONFIRMED)

**Input:**
```json
{
  "status": "CONFIRMED"
}
```

**Validaciones Esperadas:**
1. ✅ Reserva existe
2. ❓ Transición válida (PENDING → CONFIRMED)?
3. ❓ Table sigue disponible?

**Efecto en Mesa:**
- ❓ TableStatus sin cambio?
- ❓ → RESERVED?

**Hallazgo:** Confirmación no parece cambiar estado de mesa.

---

### Escenario 3: Check-in / Llegada (PATCH /admin/reservations/:id/status → ARRIVED)

**Input:**
```json
{
  "status": "ARRIVED"
}
```

**Validaciones Esperadas:**
1. ✅ Reserva existe
2. ❓ Transición válida (CONFIRMED → ARRIVED)?
3. ❓ Cliente llegó en horario (scheduledAt ± buffer)?
4. ❓ Table activa y disponible?

**Efecto en Mesa:**
- ❓ → OCCUPIED (esperado)
- ❓ Se crea Order automáticamente?

**Hallazgo:** Cambio a OCCUPIED NO SE PUEDE VERIFICAR sin código de service.

---

### Escenario 4: Completar Reserva (PATCH /admin/reservations/:id/status → COMPLETED)

**Input:**
```json
{
  "status": "COMPLETED"
}
```

**Validaciones Esperadas:**
1. ✅ Reserva existe
2. ❓ Transición válida (ARRIVED → COMPLETED)?
3. ❓ Duración mínima cumplida?

**Efecto en Mesa:**
- ❓ → AVAILABLE (esperado)
- ❓ Order asociado ya pagado?

**Hallazgo:** Liberación de mesa NO SE PUEDE VERIFICAR.

---

### Escenario 5: Cancelar Reserva (PATCH /admin/reservations/:id/status → CANCELLED)

**Input:**
```json
{
  "status": "CANCELLED"
}
```

**Validaciones Esperadas:**
1. ✅ Reserva existe
2. ❓ Transición válida (desde PENDING, CONFIRMED, o también ARRIVED)?
3. ❓ Cuánto tiempo antes de la hora se puede cancelar?

**Efecto en Mesa:**
- ❓ → AVAILABLE (esperado)
- ❓ Order asociado se cancela? (NO EXISTE RELACIÓN)

**Hallazgo:** Cancelación no cancela Order porque no existe relación.

---

### Escenario 6: No-show (PATCH /admin/reservations/:id/status → NO_SHOW)

**Input:**
```json
{
  "status": "NO_SHOW"
}
```

**Validaciones Esperadas:**
1. ✅ Reserva existe
2. ❓ Transición válida (desde CONFIRMED o ARRIVED)?
3. ❓ Ya pasó la hora programada?

**Efecto en Mesa:**
- ❓ → AVAILABLE (esperado)
- ❓ Order marcado como no-show? (NO EXISTE RELACIÓN)

**Hallazgo:** No se puede marcar Order como no-show sin relación.

---

## MATRIZ DE CAMBIOS DE MESA

| Operación | Estado Inicial | Estado Esperado | ¿Verificado? | Riesgo |
|-----------|---|---|---|---|
| Crear (PENDING) | AVAILABLE | SIN CAMBIO o RESERVED | ❌ NO | Confusión: mesa parece disponible |
| Confirmar (CONFIRMED) | AVAILABLE | SIN CAMBIO o RESERVED | ❌ NO | Confusión: mesa parece disponible |
| Check-in (ARRIVED) | AVAILABLE | OCCUPIED | ❌ NO | 🔴 Mesa no se ocupa |
| Completar (COMPLETED) | OCCUPIED | AVAILABLE | ❌ NO | 🔴 Mesa no se libera |
| Cancelar (CANCELLED) | AVAILABLE o RESERVED | AVAILABLE | ❌ NO | 🔴 Mesa no se libera |
| No-show (NO_SHOW) | AVAILABLE o RESERVED | AVAILABLE | ❌ NO | 🔴 Mesa no se libera |

---

## PROBLEMAS IDENTIFICADOS

### Problema 1: Sincronización Mesa ↔ Reserva

**Síntoma:** Cambios de estado de Reservation no se ven reflejados en TableStatus.

**Causa Probable:** ReservationsService no actualiza tabla al cambiar status.

**Impacto:**
- Mesa puede quedar OCCUPIED si reserva se cancela
- Mesa puede quedar AVAILABLE si hay reserva activa
- Inconsistencia de datos

**Evidencia:** Sin acceso a `ReservationsService.updateStatus()`, no se puede confirmar.

---

### Problema 2: Validación de Capacidad

**Síntoma:** No se verifica si partySize ≤ table.capacity.

**Impacto:**
- 10 personas pueden reservar mesa para 4

**Validación Requerida:** En CreateReservationDto o en service.

---

### Problema 3: Conflicto Horario

**Síntoma:** Dos reservas pueden tomar la misma mesa a la misma hora.

**Causa:** Sin validación de superposición, sin índice compuesto.

**Impacto:**
- Doble reserva de mesa (P0)

---

### Problema 4: Mesa Futura vs. Actual

**Síntoma:** Reserva futura cambia TableStatus actual.

**Ejemplo:**
- 10:00 AM: reservo mesa-1 para 19:00 PM
- TableStatus mesa-1 cambia a RESERVED en 10:00 AM
- Mesa no puede usarse hasta 19:00 PM

**Impacto:**
- Mesa bloqueada todo el día
- Pérdida de ingresos

**Ideal:** TableStatus debe cambiar solo cuando se acerca la reserva (30-60 min antes).

---

### Problema 5: Reserva Vencida

**Síntoma:** Reserva PENDING/CONFIRMED sin límite de tiempo.

**Impacto:**
- Mesa reservada indefinidamente
- Sin mecanismo de expiración

**Ideal:** Expirar reserva si no se confirma en 2 horas, o si no se llega 30 min después.

---

## FLUJO IDEAL (PROPUESTO)

```
POST /create (PENDING)
  ↓
  Validar: capacity, conflicto
  Crear Reservation (status=PENDING)
  TableStatus: SIN CAMBIO (AVAILABLE)
  ↓
  [Esperar confirmación]
  ↓
PATCH /status=CONFIRMED
  Validar: transición válida
  Actualizar Reservation (status=CONFIRMED)
  TableStatus: SIN CAMBIO (AVAILABLE) — aún no llegó
  Programar expiración (2-4 horas)
  ↓
  [30 minutos antes]
  ↓
  Sistema marca: "Próxima reserva en 30 min"
  Posible: TableStatus → RESERVED (opcional, visual)
  ↓
  [Cliente llega]
  ↓
PATCH /status=ARRIVED
  Validar: transición válida
  Actualizar Reservation (status=ARRIVED)
  Actualizar Table (status=OCCUPIED)
  Auto-crear Order (opcional)
  ↓
  [Cliente se va]
  ↓
PATCH /status=COMPLETED
  Validar: transición válida
  Actualizar Reservation (status=COMPLETED)
  Actualizar Table (status=AVAILABLE)  ← LIBERA MESA
  ↓
  (terminal)
```

---

## RECOMENDACIONES

### Inmediatas (P0)

1. **Verificar cambios de mesa** en ReservationsService
2. **Agregar validación de capacidad** antes de crear
3. **Agregar validación de conflictos** + índice compuesto
4. **Agregar transacción serializable** para evitar race condition

### Corto Plazo (P1)

5. **Agregar durationMinutes** a Reservation
6. **Implementar expiración** de PENDING (2 horas)
7. **Implementar cambio RESERVED** 30 min antes
8. **Crear Order automáticamente** en ARRIVED (si no existe)

### Largo Plazo (P2)

9. **Agregar confirmations audit** (timestamp de quién confirmó)
10. **Agregar métricas** (no-show %, ocupación promedio)

---

**Reporte:** Integración mesa ↔ reserva es débil. Cambios de estado no verificables.
