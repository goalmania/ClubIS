-- FIX 051 — Grant service_role sulle tabelle impianti (mancante in fix022)
-- createAdminClient() usa service_role → senza questo GRANT → "permission denied"

GRANT ALL ON checklist_template TO service_role;
GRANT ALL ON checklist_eseguita TO service_role;
GRANT ALL ON ticket_impianto    TO service_role;
GRANT ALL ON manutenzioni       TO service_role;
GRANT ALL ON ritiri             TO service_role;
