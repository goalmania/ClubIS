CREATE TABLE IF NOT EXISTS distinte_gara (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partita_id          UUID NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
  giocatori_snapshot  JSONB NOT NULL,
  staff_snapshot      JSONB,
  generata_da         UUID REFERENCES utenti(id),
  generata_at         TIMESTAMPTZ DEFAULT now(),
  versione            INT DEFAULT 1,
  UNIQUE(partita_id, versione)
);
CREATE INDEX IF NOT EXISTS idx_distinte_partita ON distinte_gara(partita_id);
ALTER TABLE distinte_gara DISABLE ROW LEVEL SECURITY;

ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS data_inizio DATE;
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS giornate_squalifica INT DEFAULT 1;
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS data_fine DATE;
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS comunicato_figc VARCHAR(100);
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS partita_id UUID REFERENCES partite(id);
