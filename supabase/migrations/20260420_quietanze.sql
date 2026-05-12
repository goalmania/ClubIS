CREATE TABLE IF NOT EXISTS quietanze (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id),
  giocatore_id     UUID NOT NULL REFERENCES giocatori(id),
  stagione         VARCHAR(10) NOT NULL DEFAULT '2024-25',
  tipo             VARCHAR(50) NOT NULL, -- rimborso_spese / compenso / quota_tesseramento
  importo_totale   NUMERIC(8,2) NOT NULL,
  periodo_da       DATE NOT NULL,
  periodo_a        DATE NOT NULL,
  firmata          BOOLEAN DEFAULT FALSE,
  firma_data       TIMESTAMPTZ,
  numero_quietanza VARCHAR(50),
  pdf_url          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quietanze DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quietanze_club_stagione ON quietanze(club_id, stagione);
CREATE INDEX IF NOT EXISTS idx_quietanze_giocatore ON quietanze(giocatore_id);
