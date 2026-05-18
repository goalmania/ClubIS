-- Backfill club_id su tutti i record inseriti prima che la colonna esistesse.
-- La colonna è stata aggiunta da fix065 ma i record pre-esistenti hanno club_id = NULL.
-- Ogni tabella usa la propria catena di FK per risalire al club corretto.

-- partite → via squadre
UPDATE partite p
SET    club_id = sq.club_id
FROM   squadre sq
WHERE  p.squadra_id = sq.id
  AND  p.club_id IS NULL;

-- tesseramenti → via giocatori (che hanno già club_id, o via squadre)
UPDATE tesseramenti t
SET    club_id = g.club_id
FROM   giocatori g
WHERE  t.giocatore_id = g.id
  AND  t.club_id IS NULL
  AND  g.club_id IS NOT NULL;

-- certificati_medici → via giocatori
UPDATE certificati_medici cm
SET    club_id = g.club_id
FROM   giocatori g
WHERE  cm.giocatore_id = g.id
  AND  cm.club_id IS NULL
  AND  g.club_id IS NOT NULL;

-- contratti → via giocatori
UPDATE contratti c
SET    club_id = g.club_id
FROM   giocatori g
WHERE  c.giocatore_id = g.id
  AND  c.club_id IS NULL
  AND  g.club_id IS NOT NULL;

-- presenze → via sessioni_allenamento → via squadre
UPDATE presenze pr
SET    club_id = sq.club_id
FROM   sessioni_allenamento sa
JOIN   squadre sq ON sq.id = sa.squadra_id
WHERE  pr.sessione_id = sa.id
  AND  pr.club_id IS NULL
  AND  sq.club_id IS NOT NULL;

-- sessioni_allenamento → via squadre
UPDATE sessioni_allenamento sa
SET    club_id = sq.club_id
FROM   squadre sq
WHERE  sa.squadra_id = sq.id
  AND  sa.club_id IS NULL;

-- convocazioni → via partite
UPDATE convocazioni cv
SET    club_id = p.club_id
FROM   partite p
WHERE  cv.partita_id = p.id
  AND  cv.club_id IS NULL
  AND  p.club_id IS NOT NULL;

-- statistiche_partita → via partite
UPDATE statistiche_partita sp
SET    club_id = p.club_id
FROM   partite p
WHERE  sp.partita_id = p.id
  AND  sp.club_id IS NULL
  AND  p.club_id IS NOT NULL;

-- valutazioni_tecniche → via giocatori
UPDATE valutazioni_tecniche vt
SET    club_id = g.club_id
FROM   giocatori g
WHERE  vt.giocatore_id = g.id
  AND  vt.club_id IS NULL
  AND  g.club_id IS NOT NULL;

-- report_scouting → via giocatori (se presente)
UPDATE report_scouting rs
SET    club_id = g.club_id
FROM   giocatori g
WHERE  rs.giocatore_id = g.id
  AND  rs.club_id IS NULL
  AND  g.club_id IS NOT NULL;

-- quote_iscrizione → via giocatori
UPDATE quote_iscrizione qi
SET    club_id = g.club_id
FROM   giocatori g
WHERE  qi.giocatore_id = g.id
  AND  qi.club_id IS NULL
  AND  g.club_id IS NOT NULL;

-- pagamenti → via quote_iscrizione o giocatori (colonna fk variabile, best-effort)
UPDATE pagamenti pg
SET    club_id = qi.club_id
FROM   quote_iscrizione qi
WHERE  pg.quota_id = qi.id
  AND  pg.club_id IS NULL
  AND  qi.club_id IS NOT NULL;
