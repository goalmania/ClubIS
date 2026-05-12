-- FIX 037: aggiunge colori hex alla tabella clubs per il PDF distinta
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS colore_primario   VARCHAR(7) DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS colore_secondario VARCHAR(7) DEFAULT '#ffffff';
