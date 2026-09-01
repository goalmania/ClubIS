-- FEAT 003 — Contratti calciatori professionisti (Solo club Serie C+)

CREATE TABLE IF NOT EXISTS contratti_professionisti (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                 UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tesserato_id            UUID,  -- nullable: può essere un tesserato esterno non ancora in rosa
  nome_tesserato          TEXT NOT NULL,
  cognome_tesserato       TEXT NOT NULL,
  tipo_lavoratore         TEXT NOT NULL DEFAULT 'calciatore_professionista',
  retribuzione_lorda_annua NUMERIC(12,2),
  premi                   JSONB NOT NULL DEFAULT '[]',
  data_inizio             DATE NOT NULL,
  data_scadenza           DATE NOT NULL,
  durata_anni             INTEGER,
  clausola_rescissoria    NUMERIC(12,2),
  stato_deposito          TEXT NOT NULL DEFAULT 'da_depositare',
  lega_ref                TEXT,
  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratti_pro_club ON contratti_professionisti(club_id);
CREATE INDEX IF NOT EXISTS idx_contratti_pro_scadenza ON contratti_professionisti(club_id, data_scadenza);

ALTER TABLE contratti_professionisti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contratti_pro_club ON contratti_professionisti;
CREATE POLICY contratti_pro_club ON contratti_professionisti
  FOR ALL USING (club_id = my_club_id() OR is_super_admin());
