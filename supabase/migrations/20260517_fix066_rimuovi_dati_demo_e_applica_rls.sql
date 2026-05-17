-- FIX 066 — Rimuove i dati demo del CIS Demo Club e applica RLS completo
--
-- Il club demo (a0000000-0000-0000-0000-000000000001) è stato inserito da
-- setup_admin.sql con dati fittizi. Con RLS disabilitato questi dati
-- sono visibili a tutti i club reali.
--
-- PASSO 1: verifica cosa c'è nel DB (esegui solo le SELECT prima)
-- PASSO 2: elimina i dati demo
-- PASSO 3: applica RLS (richiama fix065 oppure è già incluso sotto)
--
-- ⚠️  LEGGERE PRIMA DI ESEGUIRE:
--     Controlla che l'ID del club demo sia effettivamente a0000000-...
--     Se non hai un club demo, salta la sezione DELETE.

-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTICA — esegui queste SELECT per capire la situazione
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Vedi tutti i club nel DB
SELECT id, nome, created_at FROM clubs ORDER BY created_at;

-- 2. Vedi quanti record ha il club demo per tabella
SELECT 'tesseramenti' AS tabella, COUNT(*) FROM tesseramenti WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'squadre',           COUNT(*) FROM squadre           WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'giocatori',         COUNT(*) FROM giocatori         WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'partite',           COUNT(*) FROM partite           WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'utenti',            COUNT(*) FROM utenti            WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'prima_nota',        COUNT(*) FROM prima_nota        WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'quote_iscrizione',  COUNT(*) FROM quote_iscrizione  WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- 3. Verifica se Paolo di Muro ha il club_id giusto
SELECT u.id, u.email, u.club_id, c.nome AS nome_club
FROM utenti u
LEFT JOIN clubs c ON c.id = u.club_id
WHERE u.email ILIKE '%dimuro%' OR u.email ILIKE '%paolo%' OR u.nome ILIKE '%paolo%'
ORDER BY u.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- PULIZIA DATI DEMO
-- Decommenta ed esegui SOLO se la diagnostica conferma che i dati
-- appartengono al club demo e non a club reali.
-- ═══════════════════════════════════════════════════════════════════════════

/*

-- Elimina i dati demo IN ORDINE (rispetta le FK)
DELETE FROM statistiche_partita
  WHERE partita_id IN (SELECT id FROM partite WHERE club_id = 'a0000000-0000-0000-0000-000000000001');

DELETE FROM convocazioni
  WHERE partita_id IN (SELECT id FROM partite WHERE club_id = 'a0000000-0000-0000-0000-000000000001');

DELETE FROM presenze
  WHERE sessione_id IN (
    SELECT id FROM sessioni_allenamento
    WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = 'a0000000-0000-0000-0000-000000000001')
  );

DELETE FROM sessioni_allenamento
  WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = 'a0000000-0000-0000-0000-000000000001');

DELETE FROM partite           WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM valutazioni_tecniche WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM report_scouting   WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM certificati_medici WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM contratti         WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM prima_nota        WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM quote_iscrizione  WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM tesseramenti      WHERE club_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM squadre           WHERE club_id = 'a0000000-0000-0000-0000-000000000001';

-- Elimina i giocatori demo (solo quelli senza tesseramenti reali)
DELETE FROM giocatori
  WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
  AND id NOT IN (SELECT DISTINCT giocatore_id FROM tesseramenti);

-- Elimina gli utenti demo (tutti tranne quelli con account reali in auth.users)
DELETE FROM utenti
  WHERE club_id = 'a0000000-0000-0000-0000-000000000001'
  AND id NOT IN (SELECT id FROM auth.users);

-- Elimina il club demo
DELETE FROM clubs WHERE id = 'a0000000-0000-0000-0000-000000000001';

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- CORREZIONE club_id ERRATO PER UN UTENTE
-- Se la diagnostica mostra che un utente ha club_id = demo club invece
-- del suo club reale, correggi così:
-- ═══════════════════════════════════════════════════════════════════════════

/*
-- Prima trova l'ID del club corretto:
SELECT id, nome FROM clubs WHERE nome ILIKE '%brindisi%';

-- Poi aggiorna l'utente (sostituisci gli UUID con quelli reali):
UPDATE utenti
  SET club_id = '<UUID_CLUB_BRINDISI>'
  WHERE id = '<UUID_UTENTE_PAOLO>'
  AND club_id = 'a0000000-0000-0000-0000-000000000001';
*/
