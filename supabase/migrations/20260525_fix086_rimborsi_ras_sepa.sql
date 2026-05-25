-- Registro rimborsi RAS (D.Lgs. 36/2021) — per volontari sportivi
CREATE TABLE IF NOT EXISTS rimborsi_ras (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  soggetto_nome    TEXT NOT NULL,
  soggetto_cognome TEXT NOT NULL,
  codice_fiscale   TEXT NOT NULL,
  ruolo            TEXT NOT NULL,
  tipo_rimborso    TEXT NOT NULL,
  importo          NUMERIC(10,2) NOT NULL,
  data_erogazione  DATE NOT NULL,
  trimestre        INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  anno             INTEGER NOT NULL,
  causale          TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rimborsi_ras_club_trimestre ON rimborsi_ras(club_id, anno, trimestre);

-- Dati bancari collaboratori (separati per sicurezza)
CREATE TABLE IF NOT EXISTS dati_bancari_collaboratori (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  codice_fiscale  TEXT NOT NULL,
  iban            TEXT NOT NULL,
  intestatario    TEXT NOT NULL,
  bic             TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, codice_fiscale)
);

-- Distinte SEPA generate (storico)
CREATE TABLE IF NOT EXISTS distinte_sepa (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  message_id          TEXT NOT NULL UNIQUE,
  data_generazione    TIMESTAMPTZ DEFAULT NOW(),
  data_esecuzione     DATE NOT NULL,
  numero_transazioni  INTEGER NOT NULL,
  importo_totale      NUMERIC(10,2) NOT NULL,
  stato               TEXT NOT NULL DEFAULT 'generata',
  rimborsi_ids        UUID[] NOT NULL,
  xml_content         TEXT
);

-- Campi club per SEPA (se non esistono)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS ragione_sociale TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS indirizzo_sede  TEXT;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON rimborsi_ras              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dati_bancari_collaboratori TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON distinte_sepa              TO authenticated;
