-- FIX 003: rende data_nascita nullable nella tabella giocatori
--
-- Problema: la colonna data_nascita è definita NOT NULL nello schema originale.
-- Durante l'import CSV, se la riga non ha la data di nascita (campo assente o vuoto),
-- il payload invia data_nascita: null e l'INSERT fallisce con:
--   "null value in column "data_nascita" violates not-null constraint"
-- Questo causa 0 importazioni anche quando il parsing del file è corretto.
--
-- Da eseguire UNA SOLA VOLTA nel Supabase SQL Editor.

ALTER TABLE giocatori ALTER COLUMN data_nascita DROP NOT NULL;

-- Verifica
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'giocatori' AND column_name = 'data_nascita';
