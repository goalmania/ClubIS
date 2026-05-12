-- FIX 027 — obiettivi_club.ruoli_visibili mancante
--
-- La colonna era definita in supabase/20260421_obiettivi_ruoli.sql (root, mai applicata).
-- PostgREST restituiva "could not find the ruoli_visibili column" su INSERT/SELECT.

ALTER TABLE obiettivi_club
  ADD COLUMN IF NOT EXISTS ruoli_visibili TEXT[]
    DEFAULT '{presidente}';

-- Backfill righe già esistenti con ruoli coerenti alla categoria
UPDATE obiettivi_club
SET ruoli_visibili = CASE categoria
    WHEN 'sportivo'         THEN ARRAY['presidente', 'allenatore', 'ds']
    WHEN 'economico'        THEN ARRAY['presidente', 'segretario']
    WHEN 'finanziario'      THEN ARRAY['presidente', 'segretario']
    WHEN 'crescita_giovani' THEN ARRAY['presidente', 'allenatore', 'ds', 'osservatore']
    WHEN 'strutturale'      THEN ARRAY['presidente', 'segretario']
    WHEN 'comunicazione'    THEN ARRAY['presidente', 'segretario']
    ELSE                         ARRAY['presidente']
  END
WHERE ruoli_visibili IS NULL
   OR ruoli_visibili = '{presidente}';

-- Indice GIN per .contains() (UsedWidgetObiettivi)
CREATE INDEX IF NOT EXISTS idx_obiettivi_ruoli
  ON obiettivi_club USING GIN (ruoli_visibili);

-- Forza reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';
