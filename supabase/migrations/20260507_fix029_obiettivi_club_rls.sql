-- FIX 029 — obiettivi_club: RLS policy e GRANT mancanti
--
-- La tabella era stata creata con DISABLE ROW LEVEL SECURITY in
-- 20260418_sponsor.sql, ma RLS è stato successivamente riabilitato
-- senza aggiungere alcuna policy → default-deny su INSERT/SELECT/UPDATE.
-- Errore: "new row violates row-level security policy for table obiettivi_club"

ALTER TABLE obiettivi_club ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON obiettivi_club;
  CREATE POLICY club_isolation ON obiettivi_club
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON obiettivi_club TO authenticated;

NOTIFY pgrst, 'reload schema';
