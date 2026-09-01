-- Campi: aggiunge costo di affitto e orari di disponibilità, per far
-- vedere al segretario quanto costa e quando è libero un campo (scuola
-- calcio). Additivo, nessuna colonna esistente toccata.

ALTER TABLE campi
  ADD COLUMN IF NOT EXISTS costo_orario NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS orari_disponibili TEXT;

SELECT 'OK — colonne costo_orario e orari_disponibili aggiunte a campi' AS risultato;
