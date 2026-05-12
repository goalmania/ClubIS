-- FIX 007 — Portafoglio FIGC: GRANT mancanti su ricariche_portafoglio_figc
-- La tabella aveva RLS disabilitato ma nessun GRANT per il ruolo authenticated,
-- causando "permission denied" al momento di INSERT tramite Supabase client.
-- SQL Editor → New query → Run

-- Ricariche portafoglio FIGC
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ricariche_portafoglio_figc TO authenticated;
GRANT SELECT                          ON public.ricariche_portafoglio_figc TO anon;

-- Stesso problema per le altre tabelle dello stesso migration file (20260422_rimborsi_ras)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ras_registrazioni TO authenticated;
GRANT SELECT                          ON public.ras_registrazioni TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonifici_batch TO authenticated;
GRANT SELECT                          ON public.bonifici_batch TO anon;

-- Assicura RLS disabilitato (idempotente)
ALTER TABLE public.ricariche_portafoglio_figc DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ras_registrazioni          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonifici_batch             DISABLE ROW LEVEL SECURITY;

-- Verifica
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('ricariche_portafoglio_figc', 'ras_registrazioni', 'bonifici_batch')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
