-- FIX 067e — Pulizia definitiva: gestisce anche richieste_iscrizione.giocatore_id

DELETE FROM documenti_generazioni_log
WHERE giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM squalifiche_comunicato
WHERE giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM quietanze
WHERE giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM richieste_iscrizione
WHERE giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM utenti
WHERE  club_id = 'a0000000-0000-0000-0000-000000000001'
  AND  is_super_admin = false
  AND  id NOT IN (SELECT id FROM auth.users);

DELETE FROM trial_registrations WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM clubs WHERE id = 'a0000000-0000-0000-0000-000000000001';

SELECT 'giocatori_demo' AS verifica, COUNT(*) AS n FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'utenti_demo',  COUNT(*) FROM utenti WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL SELECT 'club_demo',    COUNT(*) FROM clubs  WHERE id = 'a0000000-0000-0000-0000-000000000001';
