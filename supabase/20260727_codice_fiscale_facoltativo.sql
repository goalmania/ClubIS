-- ============================================================
-- Scuola calcio: codice fiscale facoltativo in fase di iscrizione
-- Additivo: rilassa solo il vincolo NOT NULL, UNIQUE resta invariato
-- (Postgres permette più valori NULL su una colonna UNIQUE).
-- ============================================================

ALTER TABLE giocatori
  ALTER COLUMN codice_fiscale DROP NOT NULL;

SELECT 'OK — giocatori.codice_fiscale ora facoltativo' AS risultato;
