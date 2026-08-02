# 🏗️ INFRAESTRUCTURA REQUERIDA PARA TESTS DE INTEGRACIÓN

**Fecha:** 2026-07-24  
**Status:** ⏭️ TESTS PREPARADOS, INFRAESTRUCTURA NO DISPONIBLE

---

## 📋 ESTADO ACTUAL

### Tests de Integración Disponibles
```
✨ apps/backend/src/reservations/reservations.repository.integration.spec.ts
✨ apps/backend/src/reservations/reservations.concurrency.integration.spec.ts

Estado: describe.skip() - Infraestructura PostgreSQL no disponible localmente
```

### PostgreSQL Detectado
- ✅ Puerto 5432: LISTENING (PostgreSQL 17 instalado)
- ❌ Acceso: Credenciales no coinciden con configuración esperada

### Prisma Status
- ✅ Schema válido: `prisma/tenant/schema.prisma`
- ⏭️ Migraciones: No ejecutadas (requiere acceso a BD)

---

## 🔧 PASOS PARA EJECUTAR TESTS DE INTEGRACIÓN

### Opción 1: Usar PostgreSQL Local Existente

**1. Identificar credenciales de PostgreSQL 17**
```bash
# En Windows, revisar:
C:\Program Files\PostgreSQL\17\data\pg_hba.conf
# Buscar líneas de autenticación para usuario postgres
```

**2. Crear base de datos de prueba**
```bash
# Opción A: Si acceso local es posible
psql -U postgres -c "CREATE DATABASE restaurant_db_test;"

# Opción B: Usando herramienta pgAdmin
# Conectar a PostgreSQL → Crear nueva BD: restaurant_db_test
```

**3. Configurar .env.test**
```bash
cp apps/backend/.env apps/backend/.env.test

# Editar .env.test con credenciales correctas:
DATABASE_URL="postgresql://[USER]:[PASSWORD]@localhost:5432/restaurant_db_test"
TENANT_DATABASE_URL="postgresql://[USER]:[PASSWORD]@localhost:5432/restaurant_db_test?schema=test_overlap_integration"
```

**4. Ejecutar migraciones**
```bash
cd apps/backend
NODE_ENV=test pnpm exec prisma migrate deploy --schema prisma/tenant/schema.prisma
```

**5. Habilitar tests**
```bash
# En reservations.repository.integration.spec.ts línea ~47
# Cambiar: describe.skip('...')
# Por:     describe('...')

# En reservations.concurrency.integration.spec.ts línea ~48
# Cambiar: describe.skip('...')
# Por:     describe('...')
```

**6. Ejecutar tests**
```bash
pnpm --filter backend test -- reservations.repository.integration --runInBand
pnpm --filter backend test -- reservations.concurrency.integration --runInBand

# O ambos:
pnpm --filter backend test -- reservations --runInBand
```

---

### Opción 2: Usar Docker (Recomendado)

**1. Levantar PostgreSQL 15 en Docker**
```bash
docker run --name postgres-test \
  -e POSTGRES_DB=restaurant_db_test \
  -e POSTGRES_PASSWORD=test123 \
  -p 5432:5432 \
  -d postgres:15

# Esperar 5-10 segundos
sleep 10
```

**2. Verificar conectividad**
```bash
docker exec postgres-test pg_isready -U postgres
# Expected: accepting connections
```

**3. Actualizar .env.test**
```
DATABASE_URL="postgresql://postgres:test123@localhost:5432/restaurant_db_test"
TENANT_DATABASE_URL="postgresql://postgres:test123@localhost:5432/restaurant_db_test?schema=test_overlap_integration"
```

**4. Ejecutar migraciones**
```bash
cd apps/backend
cp .env.test .env  # Usar .env.test para tests

NODE_ENV=test pnpm exec prisma migrate deploy --schema prisma/tenant/schema.prisma
```

**5. Habilitar tests**
```bash
# Cambiar describe.skip() a describe() en:
# - reservations.repository.integration.spec.ts
# - reservations.concurrency.integration.spec.ts
```

**6. Ejecutar tests**
```bash
pnpm --filter backend test -- reservations --runInBand
```

**7. Limpiar (opcional)**
```bash
docker stop postgres-test && docker rm postgres-test
```

---

## ✅ VERIFICACIÓN PREVIA

Antes de ejecutar los tests, verificar:

```bash
# 1. PostgreSQL accesible
psql -U [USER] -h localhost -p 5432 -c "SELECT version();"

# 2. Base de datos existe
psql -U [USER] -h localhost -p 5432 -c "SELECT datname FROM pg_database WHERE datname='restaurant_db_test';"

# 3. Prisma puede conectar
cd apps/backend
pnpm exec prisma db pull  # Debería no fallar con auth error

# 4. Schema es válido
pnpm exec prisma validate --schema prisma/tenant/schema.prisma
# Expected: The schema at prisma\tenant\schema.prisma is valid 🚀

# 5. Tests están habilitados
grep -n "describe.skip" src/reservations/*.integration.spec.ts
# Expected: No matches (si describe.skip encontrado, están disabled)
```

---

## 🧪 SUITE DE TESTS DE INTEGRACIÓN

### ReservationRepository.integration.spec.ts (12 tests)

**Propósito:** Validar `findOverlappingReservation()` contra PostgreSQL real

**Casos:**
1. Detecta nuevo inicio dentro de existente
2. Detecta nuevo fin dentro de existente
3. Detecta nueva envolvente
4. Detecta existente envolvente
5. Detecta mismo intervalo
6. Permite contigua después
7. Permite contigua antes
8. Ignora CANCELLED
9. Ignora COMPLETED
10. Filtra por branchId
11. Filtra por tableId
12. Excluye reserva específica

**Verificación:**
- SQL parametrizado con `Prisma.sql`
- Fórmula de solapamiento correcta
- Estados ignorados implementados
- Exclusión funciona

---

### ReservationsService.concurrency.integration.spec.ts (2 tests)

**Propósito:** Validar transacción Serializable bajo concurrencia real

**Casos:**
1. Dos simultáneas en mesa idéntica
   - Exactamente una se crea (201 PENDING)
   - Exactamente una falla (409 Conflict)
   - BD contiene exactamente una reserva
   - TableStatus coherente (AVAILABLE)

2. Dos en horarios diferentes
   - Ambas se crean exitosamente
   - Dos reservas persistidas
   - Horarios exactos sin solapamiento

**Verificación:**
- isolationLevel: 'Serializable' funciona
- Race condition prevenida
- Retry con backoff exponencial
- No hay transacciones parciales

---

## 📊 SALIDA ESPERADA

Cuando tests de integración se ejecutan:

```
PASS src/reservations/reservations.repository.integration.spec.ts (XX.XXXs)
  ReservationRepository - Integración PostgreSQL
    findOverlappingReservation - Casos de Solapamiento
      ✓ debe detectar cuando nueva inicio está dentro de existente (XXms)
      ✓ debe detectar cuando nueva fin está dentro de existente (XXms)
      ... [12 total tests]

PASS src/reservations/reservations.concurrency.integration.spec.ts (XX.XXXs)
  ReservationsService - Concurrencia Serializable
    ✓ debe permitir solo una reserva cuando dos se lanzan simultáneamente (XXXms)
    ✓ debe permitir dos reservas si son en horas diferentes (XXXms)

Test Suites: 2 passed
Tests:       14 passed
Time:        XX.XXXs
```

---

## 🔍 TROUBLESHOOTING

### Error: "Can't reach database server"
```
Causa: PostgreSQL no está corriendo o puerto incorrecto
Solución: Verificar que PostgreSQL está en puerto 5432 (o ajustar DATABASE_URL)
```

### Error: "Authentication failed"
```
Causa: Credenciales incorrectas
Solución: Verificar usuario/contraseña en PostgreSQL
  - Para PostgreSQL local en Windows, usuario por default: postgres
  - Sin contraseña o contraseña: postgres
```

### Error: "Database does not exist"
```
Causa: BD restaurant_db_test no fue creada
Solución: Crear manualmente:
  psql -U postgres -c "CREATE DATABASE restaurant_db_test;"
```

### Error: "schema does not exist"
```
Causa: Schema test_overlap_integration no existe
Solución: Prisma lo crea automáticamente en `prisma migrate deploy`
  Si error persiste, crear manualmente:
  psql -d restaurant_db_test -c "CREATE SCHEMA test_overlap_integration;"
```

### Tests skipped
```
Causa: describe.skip() no fue removido
Solución: Editar archivos .integration.spec.ts y cambiar:
  describe.skip('...', () => {
  Por:
  describe('...', () => {
```

---

## 📝 CI/CD INTEGRATION

Para CI/CD (GitHub Actions, GitLab CI, etc.):

```yaml
services:
  postgres-test:
    image: postgres:15
    env:
      POSTGRES_DB: restaurant_db_test
      POSTGRES_PASSWORD: test123
      POSTGRES_USER: postgres
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432

steps:
  - name: Run integration tests
    env:
      DATABASE_URL: postgresql://postgres:test123@localhost:5432/restaurant_db_test
      NODE_ENV: test
    run: |
      cd apps/backend
      pnpm exec prisma migrate deploy --schema prisma/tenant/schema.prisma
      pnpm test -- reservations --runInBand
```

---

## ✔️ RESUMEN

| Elemento | Estado | Acción |
|----------|--------|--------|
| Código de integración | ✅ Implementado | Listo |
| SQL parametrizado | ✅ Confirmado | No requiere cambios |
| Tests unitarios | ✅ Passing (35) | Completados |
| PostgreSQL | ✅ Disponible | Usar local o Docker |
| Migraciones | ⏳ Pendientes | Ejecutar cuando BD esté lista |
| Tests de integración | ⏳ Disabled (skip) | Habilitar cuando BD esté lista |
| Concurrencia | ✅ Implementada | Lista para probar |

**Próximo paso:** Configurar PostgreSQL local o Docker y seguir pasos para ejecutar tests de integración.

---

**Documento:** INTEGRATION_TEST_INFRASTRUCTURE.md  
**Rama:** fix/reservations-engine  
**Última actualización:** 2026-07-24
