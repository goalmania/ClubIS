-- FIX 081 — Ricarica schema cache PostgREST per trasferte.evento_calendario_id
--
-- La migration fix061 ha aggiunto la colonna evento_calendario_id ma non ha
-- notificato PostgREST di ricaricare la cache dello schema, causando l'errore:
-- "COULD NOT FIND THE 'EVENTO_CALENDARIO_ID' COLUMN OF 'TRASFERTE' IN THE SCHEMA CACHE"
--
-- Ri-applichiamo l'ALTER TABLE (idempotente) e notifichiamo PostgREST.

ALTER TABLE trasferte
  ADD COLUMN IF NOT EXISTS evento_calendario_id UUID
    REFERENCES eventi_calendario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trasferte_evento_calendario
  ON trasferte(evento_calendario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON trasferte TO authenticated;
GRANT ALL ON trasferte TO service_role;

-- Forza PostgREST a ricaricare la cache dello schema
NOTIFY pgrst, 'reload schema';
