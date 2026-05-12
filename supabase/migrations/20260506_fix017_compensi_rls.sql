-- FIX 017 — Compensi: RLS policy e GRANT mancanti
--
-- La tabella compensi è stata creata con DISABLE ROW LEVEL SECURITY in
-- 20260422_compensi.sql, ma RLS risulta attivo in produzione (abilitato
-- successivamente via dashboard o operazione manuale) senza alcuna policy →
-- ogni INSERT/SELECT restituisce "new row violates row-level security policy".
--
-- Fix:
--   1. ENABLE RLS in modo idempotente (no-op se già attivo)
--   2. Crea policy club_isolation per tutti gli operatori autenticati
--   3. GRANT SELECT/INSERT/UPDATE/DELETE ad authenticated
--   4. GRANT SELECT su soglie_fiscali (tabella di supporto, stessa situazione)

-- ── 1. compensi ───────────────────────────────────────────────────────────────

ALTER TABLE compensi ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON compensi;
  CREATE POLICY club_isolation ON compensi
    FOR ALL TO authenticated
    USING (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON compensi TO authenticated;

-- ── 2. soglie_fiscali ─────────────────────────────────────────────────────────
-- Tabella di sola lettura: tutti i ruoli autenticati devono poter leggere
-- le soglie dell'anno corrente (usata nel calcolo del compenso netto).

ALTER TABLE soglie_fiscali ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS read_all ON soglie_fiscali;
  CREATE POLICY read_all ON soglie_fiscali
    FOR SELECT TO authenticated
    USING (true);
END $$;

GRANT SELECT ON soglie_fiscali TO authenticated;
