-- FIX 055 — Aggiunge ruolo_destinatario a notifiche_sistema
-- Consente di mostrare nel dropdown da quale ruolo proviene ogni notifica
-- e di filtrare/raggruppare per ruolo in futuro.
-- Colonna nullable per retrocompatibilità con notifiche già esistenti.

ALTER TABLE notifiche_sistema
  ADD COLUMN IF NOT EXISTS ruolo_destinatario VARCHAR(30);

-- Indice per query per ruolo
CREATE INDEX IF NOT EXISTS idx_notifiche_ruolo
  ON notifiche_sistema (destinatario_id, ruolo_destinatario, letta);

-- Grant
GRANT ALL ON notifiche_sistema TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifiche_sistema TO authenticated;
