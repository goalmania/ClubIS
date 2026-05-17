-- FIX 062 — RLS e GRANT mancanti: fornitori_clienti, quote_iscrizione, squadre
--
-- Problemi segnalati:
--   1. "new row violates row-level security policy for table fornitori_clienti"
--      → RLS è attiva sulla tabella ma manca la policy WITH CHECK e i GRANT
--   2. "permission denied for table quote_iscrizione"
--      → service_role (createAdminClient) non ha GRANT esplicito sulla tabella
--   3. "permission denied for table squadre"
--      → idem, service_role manca GRANT su squadre
--   4. Registro IVA sync restituisce 0 (risolto lato codice, non SQL)
--
-- Pattern corretto Supabase:
--   service_role bypassa RLS ma HA ANCORA BISOGNO dei GRANT di tabella.
--   authenticated segue RLS → policy USING + WITH CHECK obbligatorie per INSERT/UPDATE.

-- ── 1. fornitori_clienti ─────────────────────────────────────────────────────
-- La migration originale (20260426_fornitori.sql) faceva DISABLE ROW LEVEL SECURITY
-- ma potrebbe non essere stata applicata. Applichiamo sia DISABLE che GRANT
-- per coprire entrambi i casi (DB con RLS attiva o no).

ALTER TABLE public.fornitori_clienti   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamenti_fornitore DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornitori_clienti   TO authenticated;
GRANT ALL                             ON public.fornitori_clienti   TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamenti_fornitore TO authenticated;
GRANT ALL                             ON public.pagamenti_fornitore TO service_role;

-- ── 2. quote_iscrizione ────────────────────────────────────────────────────
-- RLS abilitata in schema.sql con policy USING solo → INSERT bloccato.
-- Aggiungiamo WITH CHECK e GRANT a service_role.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_iscrizione TO authenticated;
GRANT ALL                             ON public.quote_iscrizione TO service_role;

-- Riscriviamo la policy con WITH CHECK esplicito
DROP POLICY IF EXISTS club_isolation ON quote_iscrizione;
CREATE POLICY club_isolation ON quote_iscrizione
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── 3. pagamenti (quota_iscrizione) ────────────────────────────────────────
-- Tabella pagamenti (distinta da rate_pagamento): usata dal flusso quote page

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamenti TO authenticated;
GRANT ALL                             ON public.pagamenti TO service_role;

DROP POLICY IF EXISTS club_isolation ON pagamenti;
-- La tabella pagamenti non ha club_id diretto, usa quota_id → nessuna RLS club-level
-- Manteniamo RLS disabilitata per questa tabella (accesso via quota_id già filtrato)
ALTER TABLE public.pagamenti DISABLE ROW LEVEL SECURITY;

-- ── 4. squadre ────────────────────────────────────────────────────────────────
-- RLS abilitata in schema.sql con policy USING solo → INSERT/UPDATE bloccato.
-- Aggiungiamo WITH CHECK e GRANT a service_role.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.squadre TO authenticated;
GRANT ALL                             ON public.squadre TO service_role;

DROP POLICY IF EXISTS club_isolation ON squadre;
CREATE POLICY club_isolation ON squadre
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── 5. quietanze ─────────────────────────────────────────────────────────────
-- Usata dal route /api/quietanze/genera (createAdminClient) → service_role GRANT

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quietanze TO authenticated;
GRANT ALL                             ON public.quietanze TO service_role;

-- ── 6. DEFAULT PRIVILEGES — aggiorna anche service_role per tabelle future ───
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO service_role;
