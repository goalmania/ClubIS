-- FIX 082 — Pulizia dati cross-club e isolamento definitivo
--
-- Problema: la fix079 ha backfillato giocatori.club_id via tesseramenti → squadre.
-- Giocatori creati durante la fase demo con club_id=NULL e tesseramenti collegati
-- alle squadre di Brindisi (create da fix072) sono stati incorrettamente assegnati
-- a Brindisi invece di essere eliminati insieme ai dati demo.
--
-- Brindisi FC:  7ef901d8-9c1d-4b99-9520-319597e7e43c
-- Demo club:    a0000000-0000-0000-0000-000000000001 (già eliminato)

-- ── Diagnostica (da eseguire per verificare lo stato prima della pulizia) ──────
-- Decommentare per vedere i dati sospetti:
--
-- SELECT id, nome, cognome, created_at
-- FROM   giocatori
-- WHERE  club_id = '7ef901d8-9c1d-4b99-9520-319597e7e43c'
-- ORDER BY created_at;
--
-- SELECT t.id, g.nome, g.cognome, t.created_at, sq.nome AS squadra
-- FROM   tesseramenti t
-- JOIN   giocatori g  ON g.id = t.giocatore_id
-- JOIN   squadre   sq ON sq.id = t.squadra_id
-- WHERE  t.club_id = '7ef901d8-9c1d-4b99-9520-319597e7e43c'
-- ORDER BY t.created_at;

-- ── 1. Rimuovi notifiche di club inesistenti (demo eliminato) ─────────────────
DELETE FROM notifiche_sistema
WHERE  club_id NOT IN (SELECT id FROM clubs)
   AND club_id IS NOT NULL;

-- ── 2. Rimuovi notifiche con destinatario_id di utenti non più legati al club ──
-- (destinatario appartiene a un club diverso da quello della notifica)
DELETE FROM notifiche_sistema ns
WHERE  EXISTS (
  SELECT 1
  FROM   utenti u
  WHERE  u.id = ns.destinatario_id
    AND  u.club_id IS NOT NULL
    AND  u.club_id <> ns.club_id
);

-- ── 3. Rimuovi tesseramenti orfani (club_id punta a club inesistente) ──────────
DELETE FROM tesseramenti
WHERE  club_id NOT IN (SELECT id FROM clubs)
   AND club_id IS NOT NULL;

-- ── 4. Rimuovi giocatori orfani (club_id punta a club inesistente) ─────────────
-- Prima rimuovi le FK dipendenti
DELETE FROM certificati_medici
WHERE  club_id NOT IN (SELECT id FROM clubs)
   AND club_id IS NOT NULL;

DELETE FROM contratti
WHERE  club_id NOT IN (SELECT id FROM clubs)
   AND club_id IS NOT NULL;

DELETE FROM valutazioni_tecniche
WHERE  club_id NOT IN (SELECT id FROM clubs)
   AND club_id IS NOT NULL;

DELETE FROM giocatori
WHERE  club_id NOT IN (SELECT id FROM clubs)
   AND club_id IS NOT NULL;

-- ── 5. Rimuovi giocatori senza nessun tesseramento attivo (record fantasma) ────
-- Solo se non appartengono a nessun club reale via tesseramenti
DELETE FROM giocatori g
WHERE  NOT EXISTS (
  SELECT 1 FROM tesseramenti t WHERE t.giocatore_id = g.id
)
  AND  club_id NOT IN (SELECT id FROM clubs)
  AND  club_id IS NOT NULL;

-- ── 6. Verifica finale ────────────────────────────────────────────────────────
SELECT 'notifiche_orfane'     AS check, COUNT(*) AS n
FROM   notifiche_sistema
WHERE  club_id NOT IN (SELECT id FROM clubs) AND club_id IS NOT NULL
UNION ALL
SELECT 'giocatori_orfani',     COUNT(*)
FROM   giocatori
WHERE  club_id NOT IN (SELECT id FROM clubs) AND club_id IS NOT NULL
UNION ALL
SELECT 'tesseramenti_orfani',  COUNT(*)
FROM   tesseramenti
WHERE  club_id NOT IN (SELECT id FROM clubs) AND club_id IS NOT NULL;
