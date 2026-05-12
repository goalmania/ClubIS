-- APPLY_NOW_grants.sql
-- Garantisce che i ruoli anon e authenticated abbiano i permessi necessari
-- sulle tabelle usate dal browser client (anon key).
-- SQL Editor → New query → Run

GRANT SELECT ON public.giocatori        TO anon, authenticated;
GRANT SELECT ON public.tesseramenti     TO anon, authenticated;
GRANT SELECT ON public.utenti           TO anon, authenticated;
GRANT SELECT ON public.gruppi           TO anon, authenticated;
GRANT SELECT ON public.gruppi_membri    TO anon, authenticated;
GRANT SELECT ON public.materiale_sportivo  TO anon, authenticated;
GRANT SELECT ON public.famiglie         TO anon, authenticated;
GRANT SELECT ON public.prima_nota       TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.gruppi        TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gruppi_membri TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.giocatori     TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tesseramenti  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.famiglie      TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.prima_nota    TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.materiale_sportivo TO authenticated;

-- Verifica
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('giocatori', 'tesseramenti', 'gruppi', 'gruppi_membri', 'utenti')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
