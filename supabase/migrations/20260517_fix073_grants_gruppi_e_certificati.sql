-- FIX 073 — Grants espliciti per gruppi, gruppi_membri e tabelle con RLS
--
-- Problema: le tabelle gruppi/gruppi_membri sono state create DOPO setup_admin.sql,
-- quindi il GRANT ALL ON ALL TABLES non le ha coperte. Il ruolo "authenticated"
-- non può né leggere né scrivere su queste tabelle via client JWT.
--
-- Inoltre alcuni GRANT su tabelle con RLS (certificati_medici, contratti, scadenze)
-- potrebbero essere mancanti in ambienti dove setup_admin.sql non è stato eseguito
-- o dove le ALTER DEFAULT PRIVILEGES non si applicano alle migrazioni postgres.

-- ── gruppi ────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON gruppi        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gruppi_membri TO authenticated;
GRANT ALL ON gruppi        TO service_role;
GRANT ALL ON gruppi_membri TO service_role;

-- ── tabelle core con RLS (belt-and-suspenders) ───────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON certificati_medici TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contratti          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON squadre            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scadenze_figc      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON eventi_calendario  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trasferte          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pagamenti          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON famiglie           TO authenticated;

GRANT ALL ON certificati_medici TO service_role;
GRANT ALL ON contratti          TO service_role;
GRANT ALL ON squadre            TO service_role;
GRANT ALL ON scadenze_figc      TO service_role;
GRANT ALL ON eventi_calendario  TO service_role;
GRANT ALL ON trasferte          TO service_role;
GRANT ALL ON pagamenti          TO service_role;
GRANT ALL ON famiglie           TO service_role;

-- ── default privileges per tabelle future ─────────────────────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
