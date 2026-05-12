-- FIX 053 — GRANT service_role su tutte le tabelle create dai migration files
-- Le migration fix013-fix030 concedevano permessi solo ad `authenticated`.
-- createAdminClient() usa service_role → senza questo → "permission denied".
-- Questo file copre tutte le tabelle interessate in un colpo solo.
-- Sostituisce fix051 (impianti); fix051 può restare: GRANT è idempotente.

GRANT ALL ON eventi_calendario          TO service_role;
GRANT ALL ON eventi_partecipanti        TO service_role;
GRANT ALL ON eventi_allegati            TO service_role;

GRANT ALL ON conti_corrente             TO service_role;
GRANT ALL ON causali_pagamento          TO service_role;
GRANT ALL ON categorie_contabili        TO service_role;

GRANT ALL ON sconti_listino             TO service_role;

GRANT ALL ON moduli_iscrizione          TO service_role;
GRANT ALL ON richieste_iscrizione       TO service_role;

GRANT ALL ON compensi                   TO service_role;
GRANT ALL ON soglie_fiscali             TO service_role;

GRANT ALL ON comunicazioni_club         TO service_role;

GRANT ALL ON documenti_archivio         TO service_role;
GRANT ALL ON documenti_definizioni      TO service_role;
GRANT ALL ON documenti_varianti         TO service_role;
GRANT ALL ON documenti_stato_utente     TO service_role;
GRANT ALL ON documenti_generazioni_log  TO service_role;

GRANT ALL ON checklist_template         TO service_role;
GRANT ALL ON checklist_eseguita         TO service_role;
GRANT ALL ON ticket_impianto            TO service_role;
GRANT ALL ON manutenzioni               TO service_role;
GRANT ALL ON ritiri                     TO service_role;

GRANT ALL ON famiglie                   TO service_role;
GRANT ALL ON piani_pagamento            TO service_role;
GRANT ALL ON rate_pagamento             TO service_role;
GRANT ALL ON soggetti_pagamento         TO service_role;

GRANT ALL ON partite                    TO service_role;

GRANT ALL ON stadio_configurazioni       TO service_role;
GRANT ALL ON stadio_settori              TO service_role;
GRANT ALL ON stadio_biglietteria_partita TO service_role;

GRANT ALL ON obiettivi_club             TO service_role;
GRANT ALL ON contratti                  TO service_role;
