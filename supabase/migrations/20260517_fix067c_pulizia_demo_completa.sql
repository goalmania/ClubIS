-- FIX 067c — Pulizia definitiva club demo (risolve tutte le FK)
--
-- Elimina PRIMA tutte le righe figlie che referenziano giocatori senza CASCADE,
-- poi giocatori, poi le tabelle rimaste, poi il club.
-- Gli UPDATE club_id utenti Di Muro sono già stati applicati da fix067.

-- ── 1. Tabelle figlie di giocatori senza ON DELETE CASCADE ───────────────

DELETE FROM documenti_generazioni_log
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR  club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM squalifiche_comunicato
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001');

DELETE FROM quietanze
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR  club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM moduli_iscrizione
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR  club_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM richieste_iscrizione
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
   OR  club_id = 'a0000000-0000-0000-0000-000000000001';

-- Pagamenti/rate che referenziano giocatori
DELETE FROM rate_pagamento
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001');

DELETE FROM piani_pagamento
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001');

-- Documenti stato utente (giocatore_id senza cascade)
DELETE FROM documenti_stato_utente
WHERE  giocatore_id IN (SELECT id FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001');

-- ── 2. Ora possiamo eliminare i giocatori demo ───────────────────────────
DELETE FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- ── 3. Utenti fittizi rimasti (senza account reale) ──────────────────────
DELETE FROM utenti
WHERE  club_id      = 'a0000000-0000-0000-0000-000000000001'
  AND  is_super_admin = false
  AND  id NOT IN (SELECT id FROM auth.users);

-- ── 4. Elimina il club demo ──────────────────────────────────────────────
DELETE FROM trial_registrations WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM clubs WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- ── 5. Verifica finale (deve restituire 0, 0, 0) ─────────────────────────
SELECT 'giocatori_demo' AS verifica, COUNT(*) AS n FROM giocatori WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'utenti_demo',  COUNT(*) FROM utenti WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'club_demo',    COUNT(*) FROM clubs  WHERE id      = 'a0000000-0000-0000-0000-000000000001';
