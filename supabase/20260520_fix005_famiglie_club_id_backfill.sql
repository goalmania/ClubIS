-- FIX 005: backfill famiglie.club_id + fix import famiglie
--
-- Problema: la migration fix065 ha aggiunto club_id alla tabella famiglie
-- con RLS club_id = my_club_id(), ma il codice di import non valorizzava
-- club_id al momento dell'insert. I record esistevano nel DB ma erano
-- invisibili al client front-end (RLS li filtrava via).
--
-- Eseguire nel SQL Editor di Supabase → New query → Run

-- 1. Backfill: imposta club_id dal tesseramento attivo più recente
UPDATE famiglie f
SET    club_id = t.club_id
FROM   tesseramenti t
WHERE  t.giocatore_id = f.giocatore_id
  AND  t.stato = 'attivo'
  AND  f.club_id IS NULL;

-- 2. Fallback: se non c'è tesseramento attivo, usa l'ultimo tesseramento
UPDATE famiglie f
SET    club_id = (
  SELECT t2.club_id
  FROM   tesseramenti t2
  WHERE  t2.giocatore_id = f.giocatore_id
  ORDER  BY t2.created_at DESC
  LIMIT  1
)
WHERE  f.club_id IS NULL
  AND  EXISTS (
    SELECT 1 FROM tesseramenti t3 WHERE t3.giocatore_id = f.giocatore_id
  );

-- 3. Verifica risultato
SELECT
  COUNT(*)                                        AS totale,
  COUNT(*) FILTER (WHERE club_id IS NULL)         AS senza_club_id,
  COUNT(*) FILTER (WHERE club_id IS NOT NULL)     AS con_club_id
FROM famiglie;
