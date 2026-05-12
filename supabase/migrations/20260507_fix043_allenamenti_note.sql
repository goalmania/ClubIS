-- FIX 043: aggiunge la colonna note alla tabella allenamenti
ALTER TABLE allenamenti
  ADD COLUMN IF NOT EXISTS note TEXT;
