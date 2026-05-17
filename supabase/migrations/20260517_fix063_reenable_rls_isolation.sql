-- FIX 063 — Ri-abilita RLS su tutte le tabelle disabilitate da setup_admin.sql
--
-- setup_admin.sql (pensato per sviluppo) ha eseguito DISABLE ROW LEVEL SECURITY
-- su tutte le tabelle principali. Se applicato in produzione, qualsiasi query
-- senza filtro club_id esplicito restituisce dati di TUTTI i club (data leakage).
--
-- Questa migration:
--   1. Ri-abilita RLS su ogni tabella critica
--   2. Ri-crea le policy club_isolation con USING + WITH CHECK dove mancanti
--   3. Garantisce che il demo club (a0000000-...) non sia visibile ad altri utenti
--
-- Da eseguire in Supabase SQL Editor → New query → Run.

-- ── clubs ─────────────────────────────────────────────────────────────────
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON clubs;
CREATE POLICY club_isolation ON clubs
  FOR ALL TO authenticated
  USING (
    id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── utenti ────────────────────────────────────────────────────────────────
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON utenti;
CREATE POLICY club_isolation ON utenti
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti u2 WHERE u2.id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
    OR id = auth.uid()
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti u2 WHERE u2.id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── giocatori ─────────────────────────────────────────────────────────────
ALTER TABLE giocatori ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON giocatori;
CREATE POLICY club_isolation ON giocatori
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── tesseramenti ──────────────────────────────────────────────────────────
ALTER TABLE tesseramenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON tesseramenti;
CREATE POLICY club_isolation ON tesseramenti
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── certificati_medici ────────────────────────────────────────────────────
ALTER TABLE certificati_medici ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON certificati_medici;
CREATE POLICY club_isolation ON certificati_medici
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── contratti ─────────────────────────────────────────────────────────────
ALTER TABLE contratti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON contratti;
CREATE POLICY club_isolation ON contratti
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── famiglie ──────────────────────────────────────────────────────────────
ALTER TABLE famiglie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS famiglie_access ON famiglie;
CREATE POLICY famiglie_access ON famiglie
  FOR ALL TO authenticated
  USING (
    giocatore_id IN (
      SELECT t.giocatore_id FROM tesseramenti t
      WHERE t.club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
    OR auth_user_id = auth.uid()
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    giocatore_id IN (
      SELECT t.giocatore_id FROM tesseramenti t
      WHERE t.club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── collaboratori_staff ───────────────────────────────────────────────────
ALTER TABLE collaboratori_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON collaboratori_staff;
CREATE POLICY club_isolation ON collaboratori_staff
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── sessioni_allenamento ──────────────────────────────────────────────────
ALTER TABLE sessioni_allenamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON sessioni_allenamento;
CREATE POLICY club_isolation ON sessioni_allenamento
  FOR ALL TO authenticated
  USING (
    squadra_id IN (SELECT id FROM squadre WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid()))
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    squadra_id IN (SELECT id FROM squadre WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid()))
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── convocazioni ──────────────────────────────────────────────────────────
ALTER TABLE convocazioni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON convocazioni;
CREATE POLICY club_isolation ON convocazioni
  FOR ALL TO authenticated
  USING (
    partita_id IN (
      SELECT id FROM partite
      WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid()))
    )
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    partita_id IN (
      SELECT id FROM partite
      WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid()))
    )
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── statistiche_partita ───────────────────────────────────────────────────
ALTER TABLE statistiche_partita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON statistiche_partita;
CREATE POLICY club_isolation ON statistiche_partita
  FOR ALL TO authenticated
  USING (
    partita_id IN (
      SELECT id FROM partite
      WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid()))
    )
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    partita_id IN (
      SELECT id FROM partite
      WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid()))
    )
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── valutazioni_tecniche ──────────────────────────────────────────────────
ALTER TABLE valutazioni_tecniche ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON valutazioni_tecniche;
CREATE POLICY club_isolation ON valutazioni_tecniche
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── report_scouting ───────────────────────────────────────────────────────
ALTER TABLE report_scouting ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON report_scouting;
CREATE POLICY club_isolation ON report_scouting
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── messaggi ──────────────────────────────────────────────────────────────
ALTER TABLE messaggi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON messaggi;
CREATE POLICY club_isolation ON messaggi
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── messaggi_letture ──────────────────────────────────────────────────────
ALTER TABLE messaggi_letture ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON messaggi_letture;
CREATE POLICY club_isolation ON messaggi_letture
  FOR ALL TO authenticated
  USING (
    messaggio_id IN (
      SELECT id FROM messaggi
      WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
    OR utente_id = auth.uid()
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    messaggio_id IN (
      SELECT id FROM messaggi
      WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── prima_nota ────────────────────────────────────────────────────────────
ALTER TABLE prima_nota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON prima_nota;
CREATE POLICY club_isolation ON prima_nota
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── notifiche_sistema ─────────────────────────────────────────────────────
ALTER TABLE notifiche_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON notifiche_sistema;
CREATE POLICY club_isolation ON notifiche_sistema
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR destinatario_id = auth.uid()
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── partite ────────────────────────────────────────────────────────────────
ALTER TABLE partite ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_isolation ON partite;
CREATE POLICY club_isolation ON partite
  FOR ALL TO authenticated
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid()) = TRUE
  );

-- ── GRANT a service_role su tutte le tabelle appena riabilitate ────────────
GRANT ALL ON clubs                 TO service_role;
GRANT ALL ON utenti                TO service_role;
GRANT ALL ON giocatori             TO service_role;
GRANT ALL ON tesseramenti          TO service_role;
GRANT ALL ON certificati_medici    TO service_role;
GRANT ALL ON contratti             TO service_role;
GRANT ALL ON famiglie              TO service_role;
GRANT ALL ON collaboratori_staff   TO service_role;
GRANT ALL ON sessioni_allenamento  TO service_role;
GRANT ALL ON convocazioni          TO service_role;
GRANT ALL ON statistiche_partita   TO service_role;
GRANT ALL ON valutazioni_tecniche  TO service_role;
GRANT ALL ON report_scouting       TO service_role;
GRANT ALL ON messaggi              TO service_role;
GRANT ALL ON messaggi_letture      TO service_role;
GRANT ALL ON prima_nota            TO service_role;
GRANT ALL ON notifiche_sistema     TO service_role;
GRANT ALL ON partite               TO service_role;
