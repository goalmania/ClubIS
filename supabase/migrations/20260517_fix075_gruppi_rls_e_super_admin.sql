-- fix075: risolve gruppi RLS + super_admin per account Di Muro
-- ─────────────────────────────────────────────────────────────
-- ESEGUIRE UNA VOLTA nel Supabase SQL Editor.

-- ── 1. Disabilita RLS su gruppi/gruppi_membri ─────────────────────────────
--    (tabelle interne al club, non contengono dati cross-club sensibili)
ALTER TABLE IF EXISTS gruppi        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gruppi_membri DISABLE ROW LEVEL SECURITY;

-- ── 2. Grant espliciti (in caso non siano stati applicati da fix073) ───────
GRANT SELECT, INSERT, UPDATE, DELETE ON gruppi        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gruppi_membri TO authenticated;
GRANT ALL ON gruppi        TO service_role;
GRANT ALL ON gruppi_membri TO service_role;

-- ── 3. Marca gli account platform-admin come is_super_admin = true ─────────
--    Questi non devono mai comparire nella gestione account / staff dei club.
UPDATE utenti
SET    is_super_admin = true
WHERE  email IN (
  'dimuropaolo7@gmail.com',
  'dimuroasia45@gmail.com',
  'dimuroasia7@gmail.com',
  'dimuropaolo@gmail.com',
  'dimuropaolo77@gmail.com'
);

-- ── 4. Verifica (opzionale) ────────────────────────────────────────────────
-- SELECT email, is_super_admin FROM utenti WHERE is_super_admin = true;
