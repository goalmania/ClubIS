-- FIX 060 — GRANT e RLS per distinte_gara, accrediti, presenze, cis_notification_outbox
--
-- Causa: le tabelle sopra mancano dei GRANT a `authenticated` e/o `service_role`,
-- generando "permission denied" quando il client usa la sessione utente o
-- quando createAdminClient() tenta di scrivere su queste tabelle.
--
-- Pattern corretto:
--   1. GRANT SELECT/INSERT/UPDATE/DELETE on table TO authenticated;
--   2. GRANT ALL on table TO service_role;
--   3. RLS abilitata con policy club_id (dove non già presente)
--   4. WITH CHECK esplicito per INSERT/UPDATE

-- ── distinte_gara ──────────────────────────────────────────────────────────────
-- RLS già abilitata in fix036; aggiungiamo i GRANT mancanti e
-- ricreiamo la policy con WITH CHECK esplicito.

GRANT SELECT, INSERT, UPDATE, DELETE ON distinte_gara TO authenticated;
GRANT ALL ON distinte_gara TO service_role;

DROP POLICY IF EXISTS distinte_gara_club ON distinte_gara;
CREATE POLICY distinte_gara_club ON distinte_gara
  FOR ALL
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── accrediti ─────────────────────────────────────────────────────────────────
-- RLS disabilitata (accessi via API con admin client).
-- Servono comunque i GRANT perché createAdminClient() usa service_role.

GRANT SELECT, INSERT, UPDATE, DELETE ON accrediti TO authenticated;
GRANT ALL ON accrediti TO service_role;

-- Assicuriamo che RLS sia disabilitata (era già così in schema.sql)
ALTER TABLE accrediti DISABLE ROW LEVEL SECURITY;

-- ── presenze ──────────────────────────────────────────────────────────────────
-- RLS abilitata in schema.sql; mancavano i GRANT.

GRANT SELECT, INSERT, UPDATE, DELETE ON presenze TO authenticated;
GRANT ALL ON presenze TO service_role;

-- Ricreiamo la policy con WITH CHECK esplicito per INSERT
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON presenze;
  CREATE POLICY club_isolation ON presenze FOR ALL
  USING (
    (
      sessione_id IN (
        SELECT sa.id FROM sessioni_allenamento sa
        JOIN squadre s ON sa.squadra_id = s.id
        WHERE s.club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
      )
    )
    OR club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    (
      sessione_id IN (
        SELECT sa.id FROM sessioni_allenamento sa
        JOIN squadre s ON sa.squadra_id = s.id
        WHERE s.club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
      )
    )
    OR club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );
END $$;

-- ── cis_notification_outbox ────────────────────────────────────────────────────
-- RLS già abilitata in schema.sql; mancavano i GRANT.

GRANT SELECT, INSERT, UPDATE, DELETE ON cis_notification_outbox TO authenticated;
GRANT ALL ON cis_notification_outbox TO service_role;
