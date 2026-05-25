-- Rapporti arbitrali: un report per ogni partita, isolato per club
CREATE TABLE IF NOT EXISTS rapporti_arbitrali (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partita_id            UUID REFERENCES partite(id) ON DELETE SET NULL,
  data_partita          DATE,
  avversario            TEXT,
  competizione          TEXT,
  arbitro_nome          TEXT,
  arbitro_cognome       TEXT,
  assistente1           TEXT,
  assistente2           TEXT,
  quarto_ufficiale      TEXT,
  voto_arbitro          SMALLINT CHECK (voto_arbitro BETWEEN 1 AND 10),
  comportamento         TEXT CHECK (comportamento IN ('corretto', 'discutibile', 'scorretto')),
  ammoniti_nostri       TEXT,
  espulsi_nostri        TEXT,
  ammoniti_avversari    TEXT,
  espulsi_avversari     TEXT,
  episodi_contestati    TEXT,
  episodi_favorevoli    TEXT,
  note_generali         TEXT,
  stato                 TEXT NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza', 'completato')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapporti_arbitrali_club ON rapporti_arbitrali(club_id);
CREATE INDEX IF NOT EXISTS idx_rapporti_arbitrali_partita ON rapporti_arbitrali(partita_id);

-- RLS: isolamento per club
ALTER TABLE rapporti_arbitrali ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON rapporti_arbitrali;
CREATE POLICY club_isolation ON rapporti_arbitrali FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON rapporti_arbitrali TO authenticated;
