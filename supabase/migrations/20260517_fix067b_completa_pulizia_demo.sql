-- FIX 067b — Completa la pulizia del club demo
--
-- fix067 si è fermato sul DELETE FROM giocatori per una FK non-CASCADE
-- su documenti_generazioni_log.giocatore_id.
-- Gli UPDATE club_id degli utenti Di Muro sono già stati applicati.
-- Questo script completa la rimozione dei dati demo rimanenti.

-- Tabelle figlie di giocatori senza ON DELETE CASCADE
DELETE FROM documenti_generazioni_log
WHERE  club_id = 'a0000000-0000-0000-0000-000000000001'
   OR  giocatore_id IN (
         SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
       );

-- Ora possiamo eliminare i giocatori demo
DELETE FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- Utenti demo rimasti (solo record fittizi senza account reale)
DELETE FROM utenti
WHERE  club_id      = 'a0000000-0000-0000-0000-000000000001'
  AND  is_super_admin = false
  AND  id NOT IN (SELECT id FROM auth.users);

-- Elimina il club demo
DELETE FROM trial_registrations WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM clubs WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- ── Verifica finale ───────────────────────────────────────────────────────
SELECT 'giocatori_demo_rimasti'  AS check, COUNT(*) AS n FROM giocatori  WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'utenti_demo_rimasti',    COUNT(*) FROM utenti    WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'club_demo_rimasto',      COUNT(*) FROM clubs     WHERE id      = 'a0000000-0000-0000-0000-000000000001';
