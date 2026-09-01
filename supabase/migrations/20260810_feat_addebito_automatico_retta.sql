-- Addebito automatico mensile della retta (ClubIS Pay) — completa la tabella
-- retta_abbonamenti già creata (ma mai collegata a nulla) in
-- 20260725_stripe_connect.sql.

ALTER TABLE retta_abbonamenti
  ADD COLUMN IF NOT EXISTS famiglia_id UUID REFERENCES famiglie(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  -- distingue una pausa per carta rifiutata da una pausa decisa dalla
  -- società, così il frontend famiglia mostra il messaggio giusto e non
  -- offre un "riattiva" che spetta solo alla società.
  ADD COLUMN IF NOT EXISTS pausa_da VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_retta_abbonamenti_famiglia ON retta_abbonamenti(famiglia_id);
CREATE INDEX IF NOT EXISTS idx_retta_abbonamenti_stripe_sub ON retta_abbonamenti(stripe_subscription_id);

-- Stesso bug di pattern già incontrato due volte in questa sessione
-- (quote_giovanili): in questo progetto service_role bypassa la RLS ma ha
-- comunque bisogno del GRANT esplicito sulla tabella, altrimenti anche
-- createAdminClient() fallisce con "permission denied". Lo concediamo qui
-- preventivamente, così l'anteprima admin/impersonation funziona da subito.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retta_abbonamenti TO authenticated;
GRANT ALL                             ON public.retta_abbonamenti TO service_role;
