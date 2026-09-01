-- FEAT 002 — Aggiunge campo lega alle tabelle comunicati per distinguere LND / LegaPro / FIGC

-- Colonna lega su comunicati_figc
ALTER TABLE comunicati_figc ADD COLUMN IF NOT EXISTS lega TEXT NOT NULL DEFAULT 'LND';

-- Colonna lega su squalifiche_comunicato (denormalizzata per query veloci senza join)
ALTER TABLE squalifiche_comunicato ADD COLUMN IF NOT EXISTS lega TEXT NOT NULL DEFAULT 'LND';

-- Indice per filtrare per lega
CREATE INDEX IF NOT EXISTS idx_comunicati_figc_lega ON comunicati_figc(club_id, lega);
CREATE INDEX IF NOT EXISTS idx_squalifiche_comunicato_lega ON squalifiche_comunicato(club_id, lega);
