# ✅ COBERTURA DE TESTS: RESERVACIONES

**Documento:** RESERVATIONS_TEST_COVERAGE.md  
**Auditoría:** analysis/reservations-flow-audit  
**Fecha:** 2026-07-24  

---

## SUITES ENCONTRADAS

### Backend Tests

#### reservations.service.spec.ts

```
✅ should return all reservations
✅ should format response correctly
✅ should forward search to repository
```

**Métodos testeados:** findAll (3 casos)  
**Métodos NO testeados:** create, updateStatus, getStats

#### reservations.repository.spec.ts

```
✅ should search by guestName (case-insensitive)
✅ should search by guestPhone
✅ should search by guestEmail
✅ should filter by combined criteria
```

**Métodos testeados:** findAll con search (4 casos)  
**Métodos NO testeados:** findById, create, update, delete

### Frontend Tests

#### reservations.service.test.ts

```
✅ getStats()
✅ getAll()
✅ getById()
✅ create()
✅ confirm()
✅ cancel()
✅ arrived()
✅ updateStatus()
```

**Métodos testeados:** 8 (API client calls, mocked)

#### useReservations.test.ts

```
✅ Polling every 30s
✅ Event listener registration
```

**Métodos testeados:** Hook behavior (2 casos)

---

## MATRIZ DE COBERTURA

| Escenario | Backend | Frontend | E2E | Cobertura |
|-----------|---------|----------|-----|-----------|
| **Crear Reserva** | ❌ | ✅ (mock) | ❌ | PARCIAL |
| **Validar Capacity** | ❌ | ❌ | ❌ | NULA |
| **Conflicto Horario** | ❌ | ❌ | ❌ | NULA |
| **Confirmar** | ❌ | ✅ (mock) | ❌ | PARCIAL |
| **Check-in** | ❌ | ✅ (mock) | ❌ | PARCIAL |
| **Completar** | ❌ | ✅ (mock) | ❌ | PARCIAL |
| **Cancelar** | ❌ | ✅ (mock) | ❌ | PARCIAL |
| **No-show** | ❌ | ✅ (mock) | ❌ | PARCIAL |
| **Listar/Filtros** | ✅ | ✅ | ❌ | MEDIA |
| **Mesa RESERVED** | ❌ | ❌ | ❌ | NULA |
| **Mesa OCCUPIED** | ❌ | ❌ | ❌ | NULA |
| **Mesa AVAILABLE** | ❌ | ❌ | ❌ | NULA |
| **Multi-tenancy** | ❌ | ❌ | ❌ | NULA |
| **Branch Isolation** | ❌ | ❌ | ❌ | NULA |
| **Race Condition** | ❌ | ❌ | ❌ | NULA |
| **Transición inválida** | ❌ | ❌ | ❌ | NULA |

---

## CASOS CRÍTICOS FALTANTES

### P0 - BLOQUEANTES

1. **Conflicto Horario**
   - Test: Crear 2 reservas misma mesa 19:00-20:00 → ambas fallan
   - Status: ❌ NO EXISTE
   - Impacto: Doble reserva

2. **Race Condition**
   - Test: 2 POST simultáneos misma mesa → 1 debe fallar
   - Status: ❌ NO EXISTE
   - Impacto: Doble reserva

3. **Capacidad**
   - Test: 10 personas, mesa 4 capacidad → fail
   - Status: ❌ NO EXISTE
   - Impacto: Overbooking

4. **Cambios de Mesa**
   - Test: ARRIVED → mesa OCCUPIED, COMPLETED → mesa AVAILABLE
   - Status: ❌ NO EXISTE
   - Impacto: Mesa stuck

### P1 - ALTOS

5. **Transiciones Inválidas**
   - Test: COMPLETED → PENDING debe fallar
   - Status: ❌ NO EXISTE
   - Impacto: Estado inconsistente

6. **Multi-tenancy**
   - Test: Tenant A no puede ver Tenant B
   - Status: ❌ NO EXISTE
   - Impacto: Fuga de datos

7. **Branch Isolation**
   - Test: Manager no puede listar otros branches
   - Status: ❌ NO EXISTE
   - Impacto: Fuga de datos

8. **Validación de Pertencencia**
   - Test: Usar tableId de otro tenant → fail
   - Status: ❌ NO EXISTE
   - Impacto: Reserva cruzada

---

## RESUMEN DE COBERTURA

| Categoría | Tests | Casos | % Cobertura |
|-----------|-------|-------|------------|
| Búsqueda | ✅ 4 | 1 (findAll) | 20% |
| Crear | ❌ 0 | 1 (create) | 0% |
| Actualizar | ❌ 0 | 1 (updateStatus) | 0% |
| Transiciones | ❌ 0 | 6 estados | 0% |
| Mesa | ❌ 0 | 6 operaciones | 0% |
| Validación | ❌ 0 | 10+ casos | 0% |
| Seguridad | ❌ 0 | 5+ escenarios | 0% |
| Concurrencia | ❌ 0 | 3+ casos | 0% |
| **TOTAL** | **4+8** | **50+** | **~10%** |

---

## RECOMENDACIONES

### Inmediatas

- [ ] Test: Conflicto horario detectado y rechazado
- [ ] Test: Race condition (concurrencia) manejada
- [ ] Test: Capacidad validada
- [ ] Test: Cambios de mesa verificados

### Corto Plazo

- [ ] Test: Transiciones de estado validadas
- [ ] Test: Aislamiento multi-tenant
- [ ] Test: Aislamiento branch por rol
- [ ] Test: Validación de pertencencia
- [ ] Test: No-show automático por timeout
- [ ] Test: Expiración de PENDING

### Integración

- [ ] E2E: Flujo completo (crear → confirmar → llegar → completar)
- [ ] E2E: Cancelación en cada estado
- [ ] E2E: Verificar cambios de mesa en BD

---

**Conclusión:** Cobertura de tests ~10%. Casos críticos (conflictos, concurrencia) no existen.
