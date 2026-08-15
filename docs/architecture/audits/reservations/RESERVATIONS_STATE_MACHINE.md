# 🔄 MÁQUINA DE ESTADOS: RESERVACIONES

**Documento:** RESERVATIONS_STATE_MACHINE.md  
**Auditoría:** analysis/reservations-flow-audit  
**Fecha:** 2026-07-24  

---

## ESTADOS Y TRANSICIONES

### Diagrama Textual

```
                    [CREATE]
                       ↓
                    PENDING ←──── (re-pending?)
                      ↓
                  CONFIRMED ←──── (confirm endpoint)
                      ↓
                    ARRIVED ←───── (check-in endpoint)
                      ↓
                  COMPLETED ←──── (complete endpoint)

CANCELLED ←──────────────────────────── (any state?)
  ↓
  └─ Desde: PENDING, CONFIRMED

NO_SHOW ←────────────────────────────── (only ARRIVED?)
  ↓
  └─ Desde: ??? (desconocido)
```

### Tabla de Transiciones Real

| Desde | A PENDING | A CONFIRMED | A ARRIVED | A COMPLETED | A CANCELLED | A NO_SHOW | Validación |
|-------|-----------|-------------|-----------|------------|------------|-----------|-----------|
| **(inicial)** | ✅ default | ❌ | ❌ | ❌ | ❌ | ❌ | POST /create |
| **PENDING** | ✅ no-op | ✅ | ❌ | ❌ | ✅ | ❌ | PATCH /status |
| **CONFIRMED** | ❌ | ✅ no-op | ✅ | ❌ | ✅ | ❌ | PATCH /status |
| **ARRIVED** | ❌ | ❌ | ✅ no-op | ✅ | ❓ | ❓ | PATCH /status |
| **COMPLETED** | ❌ | ❌ | ❌ | ✅ no-op | ❌ | ❌ | PATCH /status |
| **CANCELLED** | ❌ | ❌ | ❌ | ❌ | ✅ no-op | ❌ | PATCH /status |
| **NO_SHOW** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ no-op | PATCH /status |

**Leyenda:**
- ✅ = Transición permitida
- ❌ = Transición prohibida
- ✅ no-op = Idempotente (sin cambio)
- ❓ = Desconocido (necesita verificación en service)

---

## ANÁLISIS POR ESTADO

### PENDING (Estado Inicial)

```
Significado:     Reserva creada, cliente no ha confirmado
Quién lo asigna: Sistema (default en POST /create)
Transición in:   Crear reserva
Transición out:  → CONFIRMED (confirmar)
                 → CANCELLED (cancelar antes de confirmar)
Efecto mesa:     ¿Sin cambio o → RESERVED?
Efecto orden:    Ninguno
Duración:        Indeterminada (¿hasta cuándo válida?)
Validaciones:    ¿Expiración?
```

**Hallazgo:** Estado PENDING puede durar indefinidamente sin confirmación.

### CONFIRMED

```
Significado:     Cliente confirmó asistencia
Quién lo asigna: PATCH /status con status=CONFIRMED
Transición in:   PENDING → CONFIRMED
Transición out:  → ARRIVED (cliente llegó)
                 → CANCELLED (cliente cancela después de confirmar)
Efecto mesa:     ¿Sin cambio o → RESERVED?
Efecto orden:    Ninguno
Duración:        Hasta hora de reserva o cancelación
Validaciones:    ¿Próximo a horario?
```

**Hallazgo:** Sin campo `confirmedAt`, no se sabe cuándo confirmó.

### ARRIVED

```
Significado:     Cliente llegó al restaurante
Quién lo asigna: PATCH /status con status=ARRIVED (mesero)
Transición in:   CONFIRMED → ARRIVED (check-in)
Transición out:  → COMPLETED (cliente se va)
                 → ❓ CANCELLED (puede cancelarse después de llegar?)
                 → ❓ NO_SHOW (contradictorio: llegó pero no-show?)
Efecto mesa:     ¿→ OCCUPIED? (verificar)
Efecto orden:    ¿Auto-crear orden? (NO VERIFICADO)
Duración:        Hasta que se complete o cancele
Validaciones:    ¿Horario coincide? ¿Mesa disponible?
```

**Hallazgo:** Transiciones desde ARRIVED opacas, auto-creación de orden desconocida.

### COMPLETED

```
Significado:     Reserva finalizada (cliente se fue)
Quién lo asigna: PATCH /status con status=COMPLETED
Transición in:   ARRIVED → COMPLETED
Transición out:  Terminal (no hay salida)
Efecto mesa:     ¿→ AVAILABLE? (verificar)
Efecto orden:    Ninguno (ya pagada)
Duración:        Permanente
Validaciones:    ¿Duración mínima pasada?
```

**Hallazgo:** Estado terminal correcto.

### CANCELLED

```
Significado:     Reserva cancelada (por cliente o admin)
Quién lo asigna: PATCH /status con status=CANCELLED
Transición in:   Desde PENDING, CONFIRMED (posiblemente desde ARRIVED)
Transición out:  Terminal (no hay salida)
Efecto mesa:     ¿→ AVAILABLE? (verificar)
Efecto orden:    ¿Cancelar orden asociada? (NO EXISTE RELACIÓN)
Duración:        Permanente
Validaciones:    ¿Cuándo puede cancelarse?
```

**Hallazgo:** Sin relación a Order, no se cancela la orden.

### NO_SHOW

```
Significado:     Cliente no se presentó
Quién lo asigna: PATCH /status con status=NO_SHOW
Transición in:   ¿Desde CONFIRMED o ARRIVED?
Transición out:  Terminal (no hay salida)
Efecto mesa:     ¿→ AVAILABLE? (verificar)
Efecto orden:    ¿Cancelar o marcar no-show? (NO VERIFICADO)
Duración:        Permanente
Validaciones:    ¿Debe estar pasada la hora programada?
                 ¿Quién puede marcar no-show? (solo CASHIER+?)
```

**Hallazgo:** NO_SHOW puede marcarse incluso si cliente llegó (ARRIVED → NO_SHOW contradictorio).

---

## TRANSICIONES INVÁLIDAS IDENTIFICADAS

| Transición | ¿Protegida? | Riesgo |
|-----------|-----------|--------|
| COMPLETED → PENDING | ✅ Bloqueada | No aplica |
| COMPLETED → CANCELLED | ✅ Bloqueada | Correcto |
| CANCELLED → CONFIRMED | ✅ Bloqueada | Correcto |
| ARRIVED → NO_SHOW | ❓ DESCONOCIDA | ¿Contradictorio? |
| ARRIVED → CANCELLED | ❓ DESCONOCIDA | Posible problema |
| NO_SHOW → CONFIRMED | ✅ Bloqueada | Correcto |

---

## MÁQUINA DE ESTADOS ESPERADA (IDEAL)

```
          POST /create
               ↓
            PENDING (default)
            ↙     ↘
     CONFIRMED   CANCELLED ──→ (terminal)
         ↓
      ARRIVED
      ↙     ↘
   COMPLETED  NO_SHOW ──→ (terminal)
      ↓         ↓
   (terminal) (terminal)
   
   Plus:
   CANCELLED (desde cualquier estado excepto COMPLETED)
```

---

## CAMPOS AUSENTES PARA MÁQUINA DE ESTADOS

Para implementar máquina de estados correcta, necesitaría:

- `confirmedAt?: DateTime` — Cuándo se confirmó
- `arrivedAt?: DateTime` — Cuándo llegó
- `completedAt?: DateTime` — Cuándo se completó
- `cancelledAt?: DateTime` — Cuándo se canceló
- `noShowAt?: DateTime` — Cuándo se marcó no-show
- `cancelReason?: String` — Por qué se canceló
- `noShowReason?: String` — Por qué no se presentó
- `durationMinutes: Int` — Duración para calcular fin

---

## VERIFICACIÓN REQUERIDA

- [ ] Leer `ReservationsService.updateStatus()` para ver qué transiciones valida
- [ ] Confirmar cambios de `TableStatus` al transicionar
- [ ] Confirmar si Order se crea automáticamente en ARRIVED
- [ ] Confirmar si ARRIVED→NO_SHOW es válida
- [ ] Confirmar si ARRIVED→CANCELLED es válida
- [ ] Confirmar si CANCELLED libera la mesa

---

**Hallazgo:** Máquina de estados es implícita en código, no explícita en documentación.
