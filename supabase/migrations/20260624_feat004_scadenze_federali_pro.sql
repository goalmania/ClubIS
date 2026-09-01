-- FEAT 004 — Scadenze federali e Compliance COVISOC (Solo club Serie C+)

CREATE TABLE IF NOT EXISTS scadenze_federali_pro (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo                  TEXT NOT NULL,
  categoria_scadenza    TEXT NOT NULL,
  descrizione           TEXT NOT NULL,
  data_scadenza         DATE NOT NULL,
  stato                 TEXT NOT NULL DEFAULT 'da_completare',
  attestazione_caricata BOOLEAN NOT NULL DEFAULT FALSE,
  attestazione_url      TEXT,
  note                  TEXT,
  importo_coinvolto     NUMERIC(12,2),
  stagione              TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scadenze_pro_club    ON scadenze_federali_pro(club_id);
CREATE INDEX IF NOT EXISTS idx_scadenze_pro_data    ON scadenze_federali_pro(club_id, data_scadenza);
CREATE INDEX IF NOT EXISTS idx_scadenze_pro_stato   ON scadenze_federali_pro(club_id, stato);

ALTER TABLE scadenze_federali_pro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scadenze_pro_club ON scadenze_federali_pro;
CREATE POLICY scadenze_pro_club ON scadenze_federali_pro
  FOR ALL USING (club_id = my_club_id() OR is_super_admin());
