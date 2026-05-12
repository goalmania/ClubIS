-- Giocatori: colonne anagrafiche e mediche mancanti
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS attivo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS gruppo_sanguigno VARCHAR(5);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS allergie TEXT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS terapie_in_corso TEXT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS note_medico TEXT;

-- Infortuni: colonne cliniche aggiuntive
ALTER TABLE infortuni ADD COLUMN IF NOT EXISTS diagnosi TEXT;
ALTER TABLE infortuni ADD COLUMN IF NOT EXISTS prognosi TEXT;
ALTER TABLE infortuni ADD COLUMN IF NOT EXISTS terapia TEXT;
ALTER TABLE infortuni ADD COLUMN IF NOT EXISTS giorni_stop INT;
ALTER TABLE infortuni ADD COLUMN IF NOT EXISTS medico_refertante VARCHAR(100);
ALTER TABLE infortuni ADD COLUMN IF NOT EXISTS zona_corpo VARCHAR(100);

-- Certificati medici: colonne aggiuntive
ALTER TABLE certificati_medici ADD COLUMN IF NOT EXISTS data_rilascio DATE;
ALTER TABLE certificati_medici ADD COLUMN IF NOT EXISTS medico VARCHAR(150);
ALTER TABLE certificati_medici ADD COLUMN IF NOT EXISTS struttura VARCHAR(200);

-- Visite mediche (ricreare se assente con IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS visite_mediche (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id UUID REFERENCES giocatori(id) ON DELETE CASCADE,
  tipo         VARCHAR(50),
  data         DATE NOT NULL,
  ora          TIME,
  medico       VARCHAR(100),
  struttura    VARCHAR(200),
  note         TEXT,
  esito        VARCHAR(20),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visite_club2 ON visite_mediche(club_id, data DESC);
ALTER TABLE visite_mediche DISABLE ROW LEVEL SECURITY;

-- Protocolli prevenzione (ricreare se assente con IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS protocolli_prevenzione (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  titolo      VARCHAR(255) NOT NULL,
  descrizione TEXT,
  area        VARCHAR(100),
  frequenza   VARCHAR(100),
  attivo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_protocolli_club2 ON protocolli_prevenzione(club_id);
ALTER TABLE protocolli_prevenzione DISABLE ROW LEVEL SECURITY;
