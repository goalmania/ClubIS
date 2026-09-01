-- FEAT — Genere club/squadra (attività femminile)
-- Colonna ortogonale alla categoria/età: disaccoppia il genere dal livello
-- competitivo (clubs.categoria) e dalla fascia d'età (squadre.categoria_eta).
-- Non richiede nuove policy RLS: clubs e squadre sono già isolate per club_id
-- tramite my_club_id()/is_super_admin().

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS genere TEXT NOT NULL DEFAULT 'maschile'
  CHECK (genere IN ('maschile', 'femminile'));

ALTER TABLE squadre
  ADD COLUMN IF NOT EXISTS genere TEXT NOT NULL DEFAULT 'maschile'
  CHECK (genere IN ('maschile', 'femminile'));

-- Le squadre create in precedenza con categoria_eta='femminile' (bucket piatto,
-- confuso con l'età) diventano prima_squadra + genere femminile. I controlli
-- esistenti su ['prima_squadra','femminile'] restano corretti dopo la migrazione.
UPDATE squadre
SET genere = 'femminile', categoria_eta = 'prima_squadra'
WHERE categoria_eta = 'femminile';
