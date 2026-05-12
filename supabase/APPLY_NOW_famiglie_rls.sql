-- APPLY_NOW_famiglie_rls.sql
-- Disabilita RLS su famiglie e tesseramenti per permettere l'import CSV via API.
-- ⚠️  Esegui nel SQL Editor di Supabase → New query → Run

ALTER TABLE public.famiglie       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesseramenti   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.giocatori      DISABLE ROW LEVEL SECURITY;

-- Verifica
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('famiglie', 'tesseramenti', 'giocatori');
