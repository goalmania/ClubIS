-- FIX 087 — RLS policy mancanti su ricariche_portafoglio_figc
-- Errore: "new row violates row-level security policy for table ricariche_portafoglio_figc"
-- La tabella aveva RLS disabilitato (fix007) ma successivamente rienabled senza policy.
-- Fix: abilitiamo RLS esplicitamente e aggiungiamo le policy corrette.

-- Verifica policy esistenti prima di applicare:
-- SELECT * FROM pg_policies WHERE tablename = 'ricariche_portafoglio_figc';

-- Abilita RLS
ALTER TABLE public.ricariche_portafoglio_figc ENABLE ROW LEVEL SECURITY;

-- Rimuovi eventuali policy precedenti (idempotente)
DROP POLICY IF EXISTS "ricariche_figc_select" ON public.ricariche_portafoglio_figc;
DROP POLICY IF EXISTS "ricariche_figc_insert" ON public.ricariche_portafoglio_figc;
DROP POLICY IF EXISTS "ricariche_figc_update" ON public.ricariche_portafoglio_figc;
DROP POLICY IF EXISTS "ricariche_figc_delete" ON public.ricariche_portafoglio_figc;

-- SELECT: il club può leggere solo le proprie ricariche
CREATE POLICY "ricariche_figc_select"
ON public.ricariche_portafoglio_figc
FOR SELECT
USING (
  club_id = my_club_id()
  OR is_super_admin()
);

-- INSERT: il club può inserire solo ricariche per sé stesso
CREATE POLICY "ricariche_figc_insert"
ON public.ricariche_portafoglio_figc
FOR INSERT
WITH CHECK (
  club_id = my_club_id()
  OR is_super_admin()
);

-- UPDATE: il club può aggiornare solo le proprie ricariche
CREATE POLICY "ricariche_figc_update"
ON public.ricariche_portafoglio_figc
FOR UPDATE
USING (
  club_id = my_club_id()
  OR is_super_admin()
)
WITH CHECK (
  club_id = my_club_id()
  OR is_super_admin()
);

-- DELETE: il club può eliminare solo le proprie ricariche
CREATE POLICY "ricariche_figc_delete"
ON public.ricariche_portafoglio_figc
FOR DELETE
USING (
  club_id = my_club_id()
  OR is_super_admin()
);

-- Assicura GRANT corretti per il ruolo authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ricariche_portafoglio_figc TO authenticated;
GRANT SELECT ON public.ricariche_portafoglio_figc TO anon;

-- Verifica finale
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'ricariche_portafoglio_figc'
ORDER BY cmd;
