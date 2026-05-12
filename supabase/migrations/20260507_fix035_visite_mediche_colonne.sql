-- FIX 035: aggiunge colonne mancanti a visite_mediche
-- La tabella è stata creata da 20260418_missing_tables.sql senza medico e ora
ALTER TABLE visite_mediche
  ADD COLUMN IF NOT EXISTS medico VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ora    TIME;
