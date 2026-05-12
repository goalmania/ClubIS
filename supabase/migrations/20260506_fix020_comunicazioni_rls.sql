-- FIX 020 — Comunicazioni club: RLS policy e GRANT mancanti
--
-- 20260430_segreteria_exp.sql creava comunicazioni_club con
-- DISABLE ROW LEVEL SECURITY senza GRANT.
-- RLS è stato abilitato in seguito senza policy →
-- ogni INSERT restituisce "new row violates row-level security policy".

ALTER TABLE comunicazioni_club ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON comunicazioni_club;
  CREATE POLICY club_isolation ON comunicazioni_club
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON comunicazioni_club TO authenticated;
