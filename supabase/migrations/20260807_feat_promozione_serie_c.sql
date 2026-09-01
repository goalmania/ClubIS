-- FEAT — Traccia la stagione di promozione dalla Serie D alla Serie C.
-- Serve al modulo Compliance COVISOC per calcolare correttamente la
-- fideiussione di iscrizione al campionato: 350.000€ per i club già
-- affiliati in Serie C, 700.000€ per i neopromossi dalla Serie D
-- (Manuale Licenze Nazionali, Titolo I, par. IV e V) — cifre da
-- riverificare ogni stagione sul comunicato ufficiale Lega Pro.

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS promozione_serie_c_stagione TEXT;

COMMENT ON COLUMN clubs.promozione_serie_c_stagione IS
  'Stagione (formato "2026/27") in cui il club è stato promosso dalla Serie D alla Serie C. Valorizzato solo per quella singola stagione di transizione.';
