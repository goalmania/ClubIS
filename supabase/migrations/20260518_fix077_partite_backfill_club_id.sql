-- Backfill club_id su partite inserite senza club_id (import pre-fix).
-- La colonna esiste già (fix065) ma i record importati hanno club_id = NULL.
UPDATE partite p
SET    club_id = sq.club_id
FROM   squadre sq
WHERE  p.squadra_id = sq.id
  AND  p.club_id IS NULL;
