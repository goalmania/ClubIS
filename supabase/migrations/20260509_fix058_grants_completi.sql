-- FIX 058 — GRANT completi su tutte le tabelle + DEFAULT PRIVILEGES
-- ============================================================
-- Problema: setup_admin.sql fa GRANT ALL ON ALL TABLES una sola volta.
-- Ogni tabella creata DOPO (feat003, feat007, feat008, ecc.) non aveva
-- grants → "permission denied" su salva/crea nel browser client.
-- Soluzione a due livelli:
--   1. GRANT retroattivo su tutte le tabelle esistenti
--   2. ALTER DEFAULT PRIVILEGES → le tabelle future ricevono grants in automatico

-- ── 1. GRANT retroattivo — tutte le tabelle esistenti ────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT                          ON ALL TABLES IN SCHEMA public TO anon;

-- Le sequenze servono per gli id auto-generati (uuid_generate_v4 non ne usa
-- ma SERIAL / BIGSERIAL sì — meglio coprire entrambi i casi)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- ── 2. DEFAULT PRIVILEGES — tabelle future ───────────────────────────────────
-- Da questo momento ogni nuova tabella riceve i grants automaticamente,
-- quindi non servono più i singoli GRANT nelle migration future.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO authenticated, anon;

-- ── 3. GRANT espliciti su clubs per UPDATE (era mancante) ────────────────────
GRANT SELECT, INSERT, UPDATE ON public.clubs TO authenticated;
