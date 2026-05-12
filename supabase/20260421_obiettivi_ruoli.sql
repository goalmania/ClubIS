-- ============================================================
-- OBIETTIVI_CLUB: aggiungi colonna ruoli_visibili
-- ============================================================

ALTER TABLE obiettivi_club
  ADD COLUMN IF NOT EXISTS ruoli_visibili TEXT[]
    DEFAULT '{presidente}';

-- Backfill: associa ruoli di default in base alla categoria
UPDATE obiettivi_club SET ruoli_visibili =
  CASE categoria
    WHEN 'sportivo'          THEN ARRAY['presidente', 'allenatore', 'ds']
    WHEN 'economico'         THEN ARRAY['presidente', 'segretario']
    WHEN 'finanziario'       THEN ARRAY['presidente', 'segretario']
    WHEN 'crescita_giovani'  THEN ARRAY['presidente', 'allenatore', 'ds', 'osservatore']
    WHEN 'strutturale'       THEN ARRAY['presidente', 'segretario']
    WHEN 'comunicazione'     THEN ARRAY['presidente', 'segretario']
    ELSE                          ARRAY['presidente']
  END
WHERE ruoli_visibili IS NULL
   OR ruoli_visibili = '{presidente}';

-- Indice GIN per ricerche contains() efficienti
CREATE INDEX IF NOT EXISTS idx_obiettivi_ruoli
  ON obiettivi_club USING GIN (ruoli_visibili);
