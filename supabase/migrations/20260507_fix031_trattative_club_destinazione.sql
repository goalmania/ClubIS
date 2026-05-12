-- FIX 031: aggiunge colonna club_destinazione alla tabella trattative
ALTER TABLE trattative
  ADD COLUMN IF NOT EXISTS club_destinazione VARCHAR(200);
