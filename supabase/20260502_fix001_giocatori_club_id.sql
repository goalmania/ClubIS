-- FIX 001: backfill giocatori.club_id da tesseramenti
-- Eseguire nel SQL Editor di Supabase prima del prossimo deploy.
--
-- Problema: i giocatori inseriti prima di questo fix hanno club_id = NULL
-- nella tabella giocatori, perché il codice non lo valorizzava al momento
-- dell'insert. Le query con .eq('club_id', ...) restituivano 0 risultati
-- e i selettori giocatore apparivano vuoti.

-- 1. Backfill: imposta club_id dal tesseramento attivo più recente
UPDATE giocatori g
SET    club_id = t.club_id
FROM   tesseramenti t
WHERE  t.giocatore_id = g.id
  AND  t.stato = 'attivo'
  AND  g.club_id IS NULL;

-- 2. Fallback: se non c'è tesseramento attivo, usa l'ultimo tesseramento
--    (qualunque stato) per non lasciare record orfani
UPDATE giocatori g
SET    club_id = (
  SELECT t2.club_id
  FROM   tesseramenti t2
  WHERE  t2.giocatore_id = g.id
  ORDER  BY t2.created_at DESC
  LIMIT  1
)
WHERE  g.club_id IS NULL
  AND  EXISTS (
    SELECT 1 FROM tesseramenti t3 WHERE t3.giocatore_id = g.id
  );

-- 3. Aggiorna la RLS policy su giocatori per usare club_id diretto
--    (più efficiente del join su tesseramenti)
--    Nota: RLS è attualmente disabilitata su giocatori (APPLY_NOW_disable_rls.sql).
--    Se si decide di riabilitarla, questa policy sarà corretta.
DROP POLICY IF EXISTS giocatori_access ON giocatori;
DROP POLICY IF EXISTS giocatori_club   ON giocatori;

CREATE POLICY giocatori_segretario ON giocatori
  FOR ALL
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR (SELECT is_super_admin FROM utenti WHERE id = auth.uid())
  );

-- Verifica risultato
SELECT
  COUNT(*)                                         AS totale,
  COUNT(*) FILTER (WHERE club_id IS NULL)          AS senza_club_id,
  COUNT(*) FILTER (WHERE club_id IS NOT NULL)      AS con_club_id
FROM giocatori;
