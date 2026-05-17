-- FIX 067 — Corregge club_id errato utenti Di Muro e rimuove dati demo
--
-- PROBLEMA: tutti gli utenti della famiglia Di Muro hanno
--   club_id = 'a0000000-0000-0000-0000-000000000001' (CIS Demo Club)
-- invece di '7ef901d8-9c1d-4b99-9520-319597e7e43c' (SSD BRINDISI FC).
-- Questo è il motivo per cui vedono 51 giocatori / 10 squadre di demo
-- in tutta la dashboard: getUserContext() restituisce il club_id sbagliato
-- e tutte le query filtrano sul club demo.
--
-- STEP 1 — aggiorna club_id utenti Di Muro  (ESEGUIRE SEMPRE)
-- STEP 2 — rimuove dati demo                (ESEGUIRE SEMPRE in produzione)
-- STEP 3 — rimuove il club demo             (ESEGUIRE SEMPRE in produzione)
--
-- ══════════════════════════════════════════════════════════════════════════
-- VERIFICA PREVENTIVA (esegui queste SELECT prima se vuoi controllare)
-- ══════════════════════════════════════════════════════════════════════════

-- Utenti attualmente sul club demo (non super-admin)
-- SELECT id, email, nome, cognome, ruolo, club_id
-- FROM utenti
-- WHERE club_id = 'a0000000-0000-0000-0000-000000000001' AND is_super_admin = false;

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 1: CORREGGI club_id UTENTI DI MURO → SSD BRINDISI FC
-- ══════════════════════════════════════════════════════════════════════════

UPDATE utenti
SET    club_id = '7ef901d8-9c1d-4b99-9520-319597e7e43c'
WHERE  club_id = 'a0000000-0000-0000-0000-000000000001'
  AND  is_super_admin = false
  AND  email IN (
         'dimuropaolo7@gmail.com',
         'dimuroasia45@gmail.com',
         'dimuroasia7@gmail.com',
         'dimuropaolo@gmail.com',
         'dimuropaolo77@gmail.com'
       );

-- Catch-all: se ci sono altri utenti reali rimasti sul club demo
-- che non hanno email @dimuro, aggiornali pure (escludi solo super-admin)
UPDATE utenti
SET    club_id = '7ef901d8-9c1d-4b99-9520-319597e7e43c'
WHERE  club_id  = 'a0000000-0000-0000-0000-000000000001'
  AND  is_super_admin = false
  AND  id IN (SELECT id FROM auth.users);   -- solo account reali, non record fittizi

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 2: RIMUOVI DATI DEMO (rispetta le FK, partire dalle tabelle figlie)
-- ══════════════════════════════════════════════════════════════════════════

-- Statistiche e presenze legate alle partite/allenamenti demo
DELETE FROM statistiche_partita
WHERE  partita_id IN (
         SELECT id FROM partite WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
       );

DELETE FROM convocazioni
WHERE  partita_id IN (
         SELECT id FROM partite WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
       );

DELETE FROM presenze
WHERE  sessione_id IN (
         SELECT id FROM sessioni_allenamento
         WHERE  squadra_id IN (
                  SELECT id FROM squadre WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
                )
       );

DELETE FROM sessioni_allenamento
WHERE  squadra_id IN (
         SELECT id FROM squadre WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
       );

-- Tabelle con club_id diretto
DELETE FROM partite              WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM valutazioni_tecniche WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM report_scouting      WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM certificati_medici   WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM contratti            WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM prima_nota           WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM quote_iscrizione     WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM tesseramenti         WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM famiglie             WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM messaggi             WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM notifiche_sistema    WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM inviti_club          WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- Materiali e scadenze
DELETE FROM materiale_sportivo   WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- Collaboratori e pagamenti
DELETE FROM collaboratori_staff  WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM pagamenti            WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM pagamenti_fornitore  WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- Documenti, eventi, scadenze
DELETE FROM quietanze            WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM fornitori_clienti    WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM eventi_calendario    WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM scadenze_figc        WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM comunicati_figc      WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM accrediti            WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM documenti_archivio   WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM documenti_generati   WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM sponsors             WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM trasferte            WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM infortuni            WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM comunicazioni_club   WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM gruppi               WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- Squadre e giocatori demo
DELETE FROM squadre  WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- Utenti demo rimasti (solo record fittizi senza account reale in auth.users)
DELETE FROM utenti
WHERE  club_id     = 'a0000000-0000-0000-0000-000000000001'
  AND  is_super_admin = false
  AND  id NOT IN (SELECT id FROM auth.users);

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 3: ELIMINA IL CLUB DEMO
-- ══════════════════════════════════════════════════════════════════════════

-- Rimuove il club demo solo se non ci sono più utenti che lo referenziano
DELETE FROM trial_registrations
WHERE  club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM clubs
WHERE  id = 'a0000000-0000-0000-0000-000000000001';

-- ══════════════════════════════════════════════════════════════════════════
-- VERIFICA FINALE
-- ══════════════════════════════════════════════════════════════════════════

-- Deve restituire 0 righe se tutto è andato bene
SELECT 'utenti_rimasti_su_demo' AS check, COUNT(*) AS n
FROM   utenti
WHERE  club_id = 'a0000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 'club_demo_rimasto', COUNT(*)
FROM   clubs
WHERE  id = 'a0000000-0000-0000-0000-000000000001';

-- Verifica che gli utenti Di Muro ora puntino a BRINDISI FC
SELECT id, email, nome, cognome, ruolo, club_id
FROM   utenti
WHERE  email IN (
         'dimuropaolo7@gmail.com',
         'dimuroasia45@gmail.com',
         'dimuroasia7@gmail.com',
         'dimuropaolo@gmail.com',
         'dimuropaolo77@gmail.com'
       )
ORDER BY email;
