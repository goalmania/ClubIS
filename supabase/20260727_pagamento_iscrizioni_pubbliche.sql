-- Pagamento carta obbligatorio per i moduli di iscrizione a pagamento
-- (raduno/open day = importo_iscrizione vuoto => nessun pagamento richiesto,
-- invariato; modulo con importo_iscrizione > 0 => pagamento Stripe Checkout
-- obbligatorio prima di completare l'iscrizione, stile GoleePay).
--
-- pagamento_stato e pagamento_importo esistono già su richieste_iscrizione
-- ma non erano mai stati letti/scritti da nessun codice: da questa migration
-- in poi vengono popolati realmente dal flusso di checkout.

ALTER TABLE richieste_iscrizione
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_richieste_iscrizione_stripe_session
  ON richieste_iscrizione(stripe_checkout_session_id);

SELECT 'OK — colonna stripe_checkout_session_id aggiunta a richieste_iscrizione' AS risultato;
