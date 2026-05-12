-- FIX 021 — Archivio Documenti: WITH CHECK mancante e GRANT mancante
--
-- 20260418_missing_tables.sql creava la policy documenti_club senza WITH CHECK
-- e senza GRANT → INSERT restituisce "new row violates row-level security policy".

DO $$ BEGIN
  DROP POLICY IF EXISTS documenti_club ON documenti_archivio;
  CREATE POLICY documenti_club ON documenti_archivio
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON documenti_archivio TO authenticated;
