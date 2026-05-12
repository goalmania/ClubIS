-- APPLY_NOW_gruppi_rls.sql
-- Disabilita RLS sulle tabelle necessarie per la gestione gruppi.
-- ⚠️  Esegui nel SQL Editor di Supabase → New query → Run

ALTER TABLE public.gruppi          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gruppi_membri   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.giocatori       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesseramenti    DISABLE ROW LEVEL SECURITY;

-- Verifica: rowsecurity deve essere FALSE per tutte e 4
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('gruppi', 'gruppi_membri', 'giocatori', 'tesseramenti');
