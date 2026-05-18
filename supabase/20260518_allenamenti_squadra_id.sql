-- Aggiunge colonna squadra_id alla tabella allenamenti se non presente.
-- La tabella è stata creata in 20260418_mercato_ds.sql con CREATE TABLE IF NOT EXISTS,
-- ma se la tabella esisteva già (senza la colonna), la migration non l'aveva aggiunta.
ALTER TABLE allenamenti
  ADD COLUMN IF NOT EXISTS squadra_id UUID REFERENCES squadre(id) ON DELETE CASCADE;
