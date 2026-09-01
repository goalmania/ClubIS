-- Collega quote mensili (scuola calcio) e rate dei piani di pagamento (club
-- agonistici) al pagamento con carta via Stripe Connect, sullo stesso modello
-- già usato per le iscrizioni pubbliche (richieste_iscrizione.stripe_checkout_session_id).
-- Finché queste colonne restano NULL il flusso "dichiara pagamento manuale"
-- esistente continua a funzionare esattamente come prima — nessuna migrazione
-- di dati necessaria.

ALTER TABLE quote_giovanili
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE rate_pagamento
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
-- rate_pagamento.stripe_payment_intent_id esiste già dalla migration
-- 20260418_pagamenti_module.sql ma non era mai stato popolato: ora lo
-- valorizziamo dal webhook insieme al checkout_session_id.

-- ── Fix bug preesistente, scoperto testando questo flusso ──────────────────
-- quote_giovanili (20260430_settore_giovanile.sql) fa solo DISABLE ROW LEVEL
-- SECURITY ma non concede mai il GRANT esplicito, a differenza di come è
-- stato corretto per quote_iscrizione/squadre/fornitori_clienti nella
-- migration 20260517_fix062_rls_grants_segretario.sql. In questo progetto
-- service_role bypassa RLS ma richiede comunque i GRANT di tabella — senza
-- di essi ogni query (anche via createAdminClient) fallisce con
-- "permission denied for table quote_giovanili". Bug pre-esistente, non
-- causato da queste modifiche, ma le blocca: lo sistemiamo qui.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_giovanili TO authenticated;
GRANT ALL                             ON public.quote_giovanili TO service_role;
