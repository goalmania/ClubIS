-- FIX 079 — Backfill giocatori.club_id per record pre-fix065
--
-- fix065 ha aggiunto la colonna club_id a giocatori ma non ha backfillato
-- i record esistenti. fix078 ha provato a backfillare tesseramenti via
-- giocatori.club_id, ma poiché giocatori.club_id era NULL il backfill
-- non riusciva. Questo fix risolve entrambi i problemi.
--
-- Strategia:
--   1. Backfilla giocatori.club_id via tesseramenti → squadre (catena FK solida)
--   2. Backfilla giocatori.club_id via utenti (fallback: codice fiscale match)
--   3. Ri-esegue il backfill di tesseramenti ora che giocatori ha club_id
--   4. Ri-esegue il backfill di certificati_medici

-- ── 1. giocatori → via tesseramenti → squadre ──────────────────────────────
UPDATE giocatori g
SET    club_id = t.club_id
FROM   tesseramenti t
WHERE  t.giocatore_id = g.id
  AND  g.club_id IS NULL
  AND  t.club_id IS NOT NULL;

-- ── 2. giocatori → via tesseramenti → squadre (se tesseramenti.club_id è NULL)
UPDATE giocatori g
SET    club_id = sq.club_id
FROM   tesseramenti t
JOIN   squadre sq ON sq.id = t.squadra_id
WHERE  t.giocatore_id = g.id
  AND  g.club_id IS NULL
  AND  sq.club_id IS NOT NULL;

-- ── 3. Re-backfill tesseramenti che ancora hanno club_id NULL ───────────────
UPDATE tesseramenti t
SET    club_id = g.club_id
FROM   giocatori g
WHERE  t.giocatore_id = g.id
  AND  t.club_id IS NULL
  AND  g.club_id IS NOT NULL;

-- ── 4. Re-backfill certificati_medici ──────────────────────────────────────
UPDATE certificati_medici cm
SET    club_id = g.club_id
FROM   giocatori g
WHERE  cm.giocatore_id = g.id
  AND  cm.club_id IS NULL
  AND  g.club_id IS NOT NULL;
