-- FIX 090 — Schema completo per provvedimenti FIGC
--
-- Aggiunge le colonne mancanti a squalifiche e comunicati_figc,
-- crea le tabelle diffide e ammonizioni,
-- aggiunge giocatore_id a prima_nota per ammende collegate a un giocatore.

-- ─────────────────────────────────────────────────────────────────────
-- 1. comunicati_figc — colonne mancanti
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE comunicati_figc
  ADD COLUMN IF NOT EXISTS testo_grezzo       TEXT,
  ADD COLUMN IF NOT EXISTS provvedimenti_json JSONB;

-- ─────────────────────────────────────────────────────────────────────
-- 2. squalifiche — colonne mancanti
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE squalifiche
  ADD COLUMN IF NOT EXISTS giornate_squalifica  INTEGER,
  ADD COLUMN IF NOT EXISTS giornate_rimanenti   INTEGER,
  ADD COLUMN IF NOT EXISTS data_fine            DATE,
  ADD COLUMN IF NOT EXISTS tipo_provvedimento   VARCHAR(50) DEFAULT 'squalifica',
  ADD COLUMN IF NOT EXISTS comunicato_figc      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();

-- Backfill giornate_rimanenti dai partite_restanti esistenti
UPDATE squalifiche
SET    giornate_rimanenti  = partite_restanti,
       giornate_squalifica = partite_restanti
WHERE  giornate_rimanenti IS NULL AND partite_restanti IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Tabella diffide
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diffide (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id        UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  stagione            VARCHAR(20),
  n_ammonizioni       INTEGER NOT NULL DEFAULT 0,
  soglia_diffida      INTEGER NOT NULL DEFAULT 5,
  soglia_squalifica   INTEGER NOT NULL DEFAULT 6,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, giocatore_id, stagione)
);

CREATE INDEX IF NOT EXISTS idx_diffide_club ON diffide(club_id);
CREATE INDEX IF NOT EXISTS idx_diffide_giocatore ON diffide(giocatore_id);

ALTER TABLE diffide ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON diffide;
CREATE POLICY club_isolation ON diffide FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- 4. Tabella ammonizioni (registro storico)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ammonizioni (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo         VARCHAR(50) NOT NULL DEFAULT 'ammonizione', -- ammonizione | diffida
  comunicato   VARCHAR(255),
  partita_id   UUID REFERENCES partite(id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ammonizioni_club ON ammonizioni(club_id);
CREATE INDEX IF NOT EXISTS idx_ammonizioni_giocatore ON ammonizioni(giocatore_id);

ALTER TABLE ammonizioni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON ammonizioni;
CREATE POLICY club_isolation ON ammonizioni FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- 5. prima_nota — aggiunge giocatore_id opzionale (per ammende)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE prima_nota
  ADD COLUMN IF NOT EXISTS giocatore_id UUID REFERENCES giocatori(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 6. categoria_movimento — aggiunge 'ammende_figc' se non presente
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE categoria_movimento ADD VALUE IF NOT EXISTS 'ammende_figc';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Grants per service_role
-- ─────────────────────────────────────────────────────────────────────
GRANT ALL ON diffide    TO service_role;
GRANT ALL ON ammonizioni TO service_role;
