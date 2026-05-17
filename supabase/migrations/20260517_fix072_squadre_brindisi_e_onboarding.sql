-- FIX 072 — Crea squadre mancanti per SSD BRINDISI FC + constraint univoco
--
-- Le squadre create durante l'onboarding erano associate al vecchio club_id
-- (demo club a0000000-...) invece che a 7ef901d8-... (SSD BRINDISI FC).
-- Dopo il fix067 il club_id utenti è corretto ma le squadre non esistono.

-- ── 1. Unique constraint su squadre (richiesto dal upsert onboarding) ───────
ALTER TABLE squadre
  ADD CONSTRAINT IF NOT EXISTS squadre_club_categoria_stagione_uq
  UNIQUE (club_id, categoria_eta, stagione);

-- ── 2. Squadre standard per SSD BRINDISI FC ─────────────────────────────────
INSERT INTO squadre (club_id, nome, categoria_eta, stagione, attiva)
VALUES
  ('7ef901d8-9c1d-4b99-9520-319597e7e43c', 'Prima Squadra', 'prima_squadra', '2025-26', true),
  ('7ef901d8-9c1d-4b99-9520-319597e7e43c', 'Juniores',      'juniores',      '2025-26', true),
  ('7ef901d8-9c1d-4b99-9520-319597e7e43c', 'Under 17',      'u17',           '2025-26', true),
  ('7ef901d8-9c1d-4b99-9520-319597e7e43c', 'Under 15',      'u15',           '2025-26', true),
  ('7ef901d8-9c1d-4b99-9520-319597e7e43c', 'Scuola Calcio', 'u8',            '2025-26', true)
ON CONFLICT (club_id, categoria_eta, stagione) DO NOTHING;

-- Verifica
SELECT nome, categoria_eta, stagione, attiva
FROM squadre
WHERE club_id = '7ef901d8-9c1d-4b99-9520-319597e7e43c'
ORDER BY nome;
