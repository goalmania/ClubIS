-- FIX 067d — Pulizia demo: script corretto e minimale
--
-- Solo le 3 tabelle con giocatore_id FK senza ON DELETE CASCADE:
--   documenti_generazioni_log, squalifiche_comunicato, quietanze
-- Le altre (piani_pagamento, rate_pagamento, ecc.) hanno SET NULL → non bloccano.
-- moduli_iscrizione / richieste_iscrizione non hanno giocatore_id → delete by club_id.

-- 1. Rimuove le righe figlie che bloccano il DELETE giocatori
DELETE FROM documenti_generazioni_log
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR  club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM squalifiche_comunicato
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR  club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM quietanze
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR  club_id = 'a0000000-0000-0000-0000-000000000001';

-- 2. Giocatori demo
DELETE FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- 3. Utenti fittizi rimasti (senza account reale in auth.users)
DELETE FROM utenti
WHERE  club_id      = 'a0000000-0000-0000-0000-000000000001'
  AND  is_super_admin = false
  AND  id NOT IN (SELECT id FROM auth.users);

-- 4. Club demo
DELETE FROM trial_registrations WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM clubs WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 5. Verifica finale (deve dare 0, 0, 0)
SELECT 'giocatori_demo' AS verifica, COUNT(*) AS n FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'utenti_demo',  COUNT(*) FROM utenti WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'club_demo',    COUNT(*) FROM clubs  WHERE id = 'a0000000-0000-0000-0000-000000000001';
