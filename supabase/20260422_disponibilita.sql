-- ============================================================
-- DISPONIBILITÀ ROSA — Step 1: Schema squalifiche + diffide
-- ============================================================

-- Completa tabella squalifiche con colonne FIGC mancanti
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS tipo_provvedimento   VARCHAR(50);
-- squalifica | diffida | inibizione | ammenda
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS comunicato_numero    VARCHAR(50);
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS comunicato_data      DATE;
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS comunicato_url       TEXT;
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS giornate_squalifica  INT DEFAULT 1;
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS giornate_scontate    INT DEFAULT 0;
ALTER TABLE squalifiche ADD COLUMN IF NOT EXISTS giornate_rimanenti   INT;

-- Trigger: aggiorna giornate_rimanenti automaticamente
CREATE OR REPLACE FUNCTION update_giornate_rimanenti()
RETURNS TRIGGER AS $$
BEGIN
  NEW.giornate_rimanenti := NEW.giornate_squalifica - NEW.giornate_scontate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_giornate_rimanenti ON squalifiche;
CREATE TRIGGER trig_giornate_rimanenti
  BEFORE INSERT OR UPDATE ON squalifiche
  FOR EACH ROW EXECUTE FUNCTION update_giornate_rimanenti();

-- Backfill giornate_rimanenti per record esistenti
UPDATE squalifiche
SET giornate_rimanenti = COALESCE(giornate_squalifica, 1) - COALESCE(giornate_scontate, 0)
WHERE giornate_rimanenti IS NULL;

-- ============================================================
-- DIFFIDE — un record per giocatore, aggiornato ad ogni ammonizione
-- ============================================================

CREATE TABLE IF NOT EXISTS diffide (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id      UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  n_ammonizioni     INT DEFAULT 1,
  soglia_diffida    INT DEFAULT 5,
  -- in Eccellenza: squalificato alla 5a ammonizione
  soglia_squalifica INT DEFAULT 10,
  comunicato_numero VARCHAR(50),
  comunicato_data   DATE,
  note              TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, giocatore_id)
);

DROP INDEX IF EXISTS idx_diffide_club;
CREATE INDEX idx_diffide_club ON diffide(club_id, giocatore_id);
ALTER TABLE diffide DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- AMMONIZIONI — storico per calcolare progressivo stagionale
-- ============================================================

CREATE TABLE IF NOT EXISTS ammonizioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id      UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  partita_id        UUID REFERENCES partite(id),
  data_ammonizione  DATE NOT NULL,
  comunicato_numero VARCHAR(50),
  progressivo       INT,   -- 1, 2, 3, 4, 5... nella stagione
  created_at        TIMESTAMPTZ DEFAULT now()
);

DROP INDEX IF EXISTS idx_ammonizioni_giocatore;
CREATE INDEX idx_ammonizioni_giocatore ON ammonizioni(club_id, giocatore_id, data_ammonizione DESC);
ALTER TABLE ammonizioni DISABLE ROW LEVEL SECURITY;
