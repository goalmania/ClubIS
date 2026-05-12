-- ============================================================
-- FIX RLS — esegui questo nel SQL Editor di Supabase
-- dopo aver eseguito schema_safe.sql
-- ============================================================

-- 1. Rimuovi tutte le policy esistenti su utenti
DROP POLICY IF EXISTS club_isolation ON utenti;
DROP POLICY IF EXISTS utenti_self ON utenti;

-- 2. Policy corretta: ogni utente vede se stesso + i membri del suo club
CREATE POLICY utenti_read ON utenti
  FOR SELECT
  USING (
    id = auth.uid()
    OR
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
  );

CREATE POLICY utenti_update ON utenti
  FOR UPDATE
  USING (id = auth.uid());

-- 3. Rimuovi e ricrea policy clubs (serve che l'utente legga il suo club)
DROP POLICY IF EXISTS club_isolation ON clubs;

CREATE POLICY clubs_read ON clubs
  FOR SELECT
  USING (
    id = (SELECT club_id FROM utenti WHERE id = auth.uid())
  );

CREATE POLICY clubs_update ON clubs
  FOR UPDATE
  USING (
    id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND (SELECT ruolo FROM utenti WHERE id = auth.uid()) IN ('presidente', 'segretario')
  );

-- 4. Fix policy giocatori (visibili se tesserati nel club)
DROP POLICY IF EXISTS giocatori_club ON giocatori;

CREATE POLICY giocatori_club ON giocatori
  FOR ALL
  USING (
    id IN (
      SELECT giocatore_id FROM tesseramenti
      WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
  );

-- 5. Fix policy famiglie
DROP POLICY IF EXISTS famiglie_club ON famiglie;

CREATE POLICY famiglie_club ON famiglie
  FOR ALL
  USING (
    giocatore_id IN (
      SELECT giocatore_id FROM tesseramenti
      WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
    OR auth_user_id = auth.uid()
  );

-- 6. Fix convocazioni
DROP POLICY IF EXISTS convocazioni_club ON convocazioni;

CREATE POLICY convocazioni_club ON convocazioni
  FOR ALL
  USING (
    partita_id IN (
      SELECT p.id FROM partite p
      JOIN squadre s ON p.squadra_id = s.id
      WHERE s.club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
  );

-- 7. Fix statistiche partita
DROP POLICY IF EXISTS statistiche_club ON statistiche_partita;

CREATE POLICY statistiche_club ON statistiche_partita
  FOR ALL
  USING (
    partita_id IN (
      SELECT p.id FROM partite p
      JOIN squadre s ON p.squadra_id = s.id
      WHERE s.club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
  );

-- 8. Fix valutazioni tecniche
DROP POLICY IF EXISTS valutazioni_club ON valutazioni_tecniche;

CREATE POLICY valutazioni_club ON valutazioni_tecniche
  FOR ALL
  USING (club_id = (SELECT club_id FROM utenti WHERE id = auth.uid()));

-- 9. Fix pagamenti
DROP POLICY IF EXISTS pagamenti_club ON pagamenti;

CREATE POLICY pagamenti_club ON pagamenti
  FOR ALL
  USING (
    quota_id IN (
      SELECT id FROM quote_iscrizione
      WHERE club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    )
  );

-- 10. Aggiorna le funzioni helper per usare subquery invece di chiamate ricorsive
CREATE OR REPLACE FUNCTION my_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM utenti WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION my_ruolo()
RETURNS ruolo_utente AS $$
  SELECT ruolo FROM utenti WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

