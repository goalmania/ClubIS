-- FIX 068 — Ripara inviti_club.usato_da e utenti.club_id per staff accettati prima del fix
--
-- PROBLEMA:
--   inviti/accetta non impostava usato_da né usato_at al momento dell'accettazione.
--   Alcuni utenti staff potrebbero avere club_id NULL o sbagliato nella tabella utenti.
--
-- STEP 1 — Imposta usato_da per inviti già usati (match univoco club+ruolo)
-- Sicuro solo quando esiste UN SOLO utente con quel club_id + ruolo.
-- ══════════════════════════════════════════════════════════════════════════

UPDATE inviti_club ic
SET    usato_da = u.id
FROM   utenti u
WHERE  ic.usato      = true
  AND  ic.usato_da   IS NULL
  AND  ic.club_id    = u.club_id
  AND  ic.ruolo      = u.ruolo
  AND  u.id IN (SELECT id FROM auth.users)
  AND  1 = (
         SELECT COUNT(*) FROM utenti u2
         WHERE  u2.club_id = ic.club_id
           AND  u2.ruolo   = ic.ruolo
           AND  u2.id IN (SELECT id FROM auth.users)
       );

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 2 — Imposta usato_at per gli inviti appena sistemati
-- ══════════════════════════════════════════════════════════════════════════

UPDATE inviti_club
SET    usato_at = created_at   -- approssimazione conservativa
WHERE  usato = true
  AND  usato_da IS NOT NULL
  AND  usato_at IS NULL;

-- ══════════════════════════════════════════════════════════════════════════
-- STEP 3 — Ripara club_id per utenti che hanno accettato un invito
--          ma il cui club_id in utenti non corrisponde all'invito
--          (caso: staff del CIS DEMO CLUB con club_id errato o NULL)
-- ══════════════════════════════════════════════════════════════════════════

UPDATE utenti u
SET    club_id = ic.club_id
FROM   inviti_club ic
WHERE  ic.usato_da = u.id
  AND  ic.usato    = true
  AND  (u.club_id IS NULL OR u.club_id != ic.club_id)
  AND  u.is_super_admin IS NOT TRUE;

-- ══════════════════════════════════════════════════════════════════════════
-- VERIFICA
-- ══════════════════════════════════════════════════════════════════════════

-- Inviti usati senza usato_da (dovrebbe scendere a 0 per i match univoci)
SELECT 'inviti_senza_usato_da' AS check, COUNT(*) AS n
FROM   inviti_club
WHERE  usato = true AND usato_da IS NULL;

-- Staff del CIS DEMO CLUB dopo la correzione
SELECT id, nome, cognome, ruolo, club_id, attivo
FROM   utenti
WHERE  club_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY cognome;
