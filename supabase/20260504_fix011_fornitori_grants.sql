-- FIX 011 — Fornitori: RLS attivo + GRANT mancanti
-- SQL Editor → New query → Run

-- 1. Disabilita RLS (la migration originale non era stata applicata)
ALTER TABLE public.fornitori_clienti  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamenti_fornitore DISABLE ROW LEVEL SECURITY;

-- 2. GRANT al ruolo authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornitori_clienti  TO authenticated;
GRANT SELECT                          ON public.fornitori_clienti  TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamenti_fornitore TO authenticated;
GRANT SELECT                          ON public.pagamenti_fornitore TO anon;

-- Verifica
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('fornitori_clienti', 'pagamenti_fornitore')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
