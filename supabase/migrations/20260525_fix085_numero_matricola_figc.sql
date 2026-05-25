-- Aggiunge il numero di matricola FIGC (identificativo numerico univoco del giocatore nel registro FIGC)
-- Distinto da codice_tessera_figc (alfanumerico, già esistente)
ALTER TABLE giocatori
  ADD COLUMN IF NOT EXISTS numero_matricola_figc VARCHAR(8);

COMMENT ON COLUMN giocatori.numero_matricola_figc IS 'Numero matricola FIGC — solo cifre, max 8 caratteri';
