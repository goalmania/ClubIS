-- FIX 054 — GRANT service_role + authenticated su scadenze_figc
-- La tabella è stata creata in 20260430_segreteria_exp.sql con DISABLE RLS
-- ma senza GRANT a service_role → "permission denied" da createAdminClient().

GRANT ALL ON scadenze_figc TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON scadenze_figc TO authenticated;
