-- ============================================================
-- SPONSORS: upgrade tabella esistente o crea se non esiste
-- ============================================================

-- Nuove colonne (IF NOT EXISTS è idempotente)
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS ragione_sociale   VARCHAR(255);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS settore           VARCHAR(100);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS referente_nome    VARCHAR(150);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS referente_email   VARCHAR(255);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS referente_telefono VARCHAR(50);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS sito_web          VARCHAR(300);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS logo_url          VARCHAR(500);
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS data_scadenza     DATE;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS stato             VARCHAR(20) DEFAULT 'attivo';
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS benefici          TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();

-- Popola stato dalla vecchia colonna attivo se esiste
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'attivo'
  ) THEN
    UPDATE sponsors SET stato = CASE WHEN attivo THEN 'attivo' ELSE 'scaduto' END
    WHERE stato IS NULL OR stato = 'attivo';
  END IF;
END $$;

-- Migra data_fine → data_scadenza se esiste
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'data_fine'
  ) THEN
    UPDATE sponsors SET data_scadenza = data_fine WHERE data_scadenza IS NULL AND data_fine IS NOT NULL;
  END IF;
END $$;

-- Migra referente → referente_nome se esiste
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'referente'
  ) THEN
    UPDATE sponsors SET referente_nome = referente WHERE referente_nome IS NULL AND referente IS NOT NULL;
  END IF;
END $$;

-- Migra email → referente_email se esiste
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'email'
  ) THEN
    UPDATE sponsors SET referente_email = email WHERE referente_email IS NULL AND email IS NOT NULL;
  END IF;
END $$;

-- Migra telefono → referente_telefono se esiste
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsors' AND column_name = 'telefono'
  ) THEN
    UPDATE sponsors SET referente_telefono = telefono WHERE referente_telefono IS NULL AND telefono IS NOT NULL;
  END IF;
END $$;

-- Indice (DROP + CREATE per essere idempotente)
DROP INDEX IF EXISTS idx_sponsors_club;
CREATE INDEX idx_sponsors_club ON sponsors(club_id, stato);

ALTER TABLE sponsors DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- OBIETTIVI_CLUB: crea se non esiste
-- ============================================================

CREATE TABLE IF NOT EXISTS obiettivi_club (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  titolo      VARCHAR(255) NOT NULL,
  descrizione TEXT,
  categoria   VARCHAR(40) NOT NULL,
  -- sportivo | economico | finanziario | crescita_giovani |
  -- strutturale | comunicazione | altro
  target      VARCHAR(255),
  scadenza    DATE,
  stato       VARCHAR(20) DEFAULT 'in_corso',
  -- in_corso | raggiunto | non_raggiunto | sospeso
  priorita    INT DEFAULT 2,
  progresso   INT DEFAULT 0,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

DROP INDEX IF EXISTS idx_obiettivi_club;
CREATE INDEX idx_obiettivi_club ON obiettivi_club(club_id, categoria, stato);

ALTER TABLE obiettivi_club DISABLE ROW LEVEL SECURITY;
