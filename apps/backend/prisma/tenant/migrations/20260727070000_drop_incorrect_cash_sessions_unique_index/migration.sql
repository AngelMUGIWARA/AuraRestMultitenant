-- ============================================================
-- Corrige drift generado por 20260727062550_add_cash_sessions_unique_constraint.
--
-- Esa migración auto-generada creó un índice único COMPLETO sobre
-- (register_id, status), duplicando e invalidando la intención real:
-- el índice único PARCIAL "cash_session_open_per_register"
-- (WHERE status = 'OPEN') ya definido en 20260724010000_add_cash_register_engine,
-- que solo garantiza una sesión abierta por caja a la vez.
--
-- El índice completo (sin WHERE) impediría tener más de una sesión
-- CLOSED por caja en toda su historia. Se elimina aquí; el índice
-- parcial original queda intacto.
--
-- La causa raíz (el @@unique en schema.prisma que no puede expresar
-- el WHERE parcial) se corrige por separado quitando esa declaración
-- del schema, para que Prisma no vuelva a regenerar este índice.
-- ============================================================

DROP INDEX "cash_sessions_register_id_status_key";
