CREATE TABLE IF NOT EXISTS comunicati_figc (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID NOT NULL REFERENCES clubs(id),
  comitato_regionale  VARCHAR(100) NOT NULL,
  numero_comunicato   VARCHAR(50),
  data_comunicato     DATE NOT NULL,
  url_pdf             TEXT,
  testo_estratto      TEXT,
  processato          BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squalifiche_comunicato (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicato_id    UUID REFERENCES comunicati_figc(id) ON DELETE CASCADE,
  club_id          UUID NOT NULL REFERENCES clubs(id),
  nome_raw         VARCHAR(200) NOT NULL,
  cognome_raw      VARCHAR(200),
  societa_raw      VARCHAR(200),
  tipo_sanzione    VARCHAR(100),  -- squalifica / diffida / ammenda
  durata           VARCHAR(100),  -- es. "2 giornate" / "fino al [data]"
  giocatore_id     UUID REFERENCES giocatori(id),
  match_score      NUMERIC(3,2) DEFAULT 0, -- 0.00-1.00
  confermato       BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comunicati_figc DISABLE ROW LEVEL SECURITY;
ALTER TABLE squalifiche_comunicato DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_comunicati_figc_club ON comunicati_figc(club_id);
CREATE INDEX IF NOT EXISTS idx_squalifiche_comunicato_club ON squalifiche_comunicato(club_id, comunicato_id);
