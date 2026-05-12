-- Trattative di mercato per il DS
CREATE TABLE IF NOT EXISTS trattative (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id      UUID REFERENCES giocatori(id) ON DELETE SET NULL,
  nome_giocatore    VARCHAR(255),
  club_provenienza  VARCHAR(255),
  club_destinazione VARCHAR(255),
  tipo              VARCHAR(20) NOT NULL DEFAULT 'acquisto',
  -- acquisto | cessione | prestito_in | prestito_out | svincolo
  stato             VARCHAR(30) DEFAULT 'esplorazione',
  -- esplorazione | contatto | proposta | trattativa | conclusa | saltata
  importo_richiesto DECIMAL(10,2),
  importo_offerto   DECIMAL(10,2),
  importo_accordo   DECIMAL(10,2),
  procuratore       VARCHAR(255),
  note              TEXT,
  data_contatto     DATE,
  data_scadenza     DATE,
  ds_responsabile   UUID REFERENCES utenti(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE trattative DISABLE ROW LEVEL SECURITY;

-- Schemi tattici salvati
CREATE TABLE IF NOT EXISTS schemi_tattici (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  allenatore_id UUID REFERENCES utenti(id),
  nome          VARCHAR(150) NOT NULL,
  modulo        VARCHAR(10) NOT NULL,
  assegnazioni  JSONB NOT NULL DEFAULT '{}',
  note          TEXT,
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE schemi_tattici DISABLE ROW LEVEL SECURITY;

-- Pianificazione allenamenti (separata dalle sessioni con presenze)
CREATE TABLE IF NOT EXISTS allenamenti (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  squadra_id  UUID REFERENCES squadre(id) ON DELETE CASCADE,
  data        DATE NOT NULL,
  ora         TIME,
  luogo       VARCHAR(200),
  tipo        VARCHAR(50),
  -- tecnico|tattico|fisico|partita_simulata|scarico|riposo
  obiettivo   TEXT,
  esercizi    TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE allenamenti DISABLE ROW LEVEL SECURITY;

-- Colonna tuttocampo_url su clubs (se non già presente)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS tuttocampo_url TEXT;
