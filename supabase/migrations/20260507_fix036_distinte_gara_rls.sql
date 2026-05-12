-- FIX 036: RLS policies per distinte_gara
-- La tabella era stata creata con DISABLE RLS in un file fuori dalla cartella migrations/
-- In produzione RLS risulta attiva senza policy → insert bloccato.

ALTER TABLE distinte_gara ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS distinte_gara_club ON distinte_gara;

CREATE POLICY distinte_gara_club ON distinte_gara
  FOR ALL
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
  );
