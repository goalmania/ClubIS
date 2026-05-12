-- FIGC-3: Rimborsi SEPA, RAS e Portafoglio FIGC
-- ============================================================

-- ── IBAN giocatori ──────────────────────────────────────────
ALTER TABLE giocatori
  ADD COLUMN IF NOT EXISTS iban                VARCHAR(34),
  ADD COLUMN IF NOT EXISTS intestatario_iban   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS codice_fiscale_figc VARCHAR(16);

-- ── IBAN staff ───────────────────────────────────────────────
ALTER TABLE utenti
  ADD COLUMN IF NOT EXISTS iban                VARCHAR(34),
  ADD COLUMN IF NOT EXISTS intestatario_iban   VARCHAR(255);

-- ── IBAN / BIC club (conto ordinante per bonifici) ───────────
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS iban                VARCHAR(34),
  ADD COLUMN IF NOT EXISTS intestatario_iban   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bic                 VARCHAR(11);

-- ── Batch bonifici SEPA ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonifici_batch (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  descrizione      VARCHAR(255) NOT NULL,
  mese             INT,   -- 1-12
  anno             INT,
  n_bonifici       INT     DEFAULT 0,
  importo_totale   DECIMAL(12,2) DEFAULT 0,
  stato            VARCHAR(20) DEFAULT 'bozza',
  -- bozza | generato | eseguito
  sepa_xml         TEXT,
  data_generazione TIMESTAMPTZ,
  data_esecuzione  DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bonifici_batch DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bonifici_batch_club ON bonifici_batch(club_id, anno, mese);

-- ── Registro RAS (Riforma Sport 2023) ───────────────────────
CREATE TABLE IF NOT EXISTS ras_registrazioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id      UUID REFERENCES giocatori(id),
  staff_id          UUID REFERENCES utenti(id),
  tipo_collaboratore VARCHAR(30) NOT NULL,
  -- giocatore | allenatore | preparatore | dirigente | medico | altro
  mese              INT  NOT NULL,   -- 1-12
  anno              INT  NOT NULL,
  importo           DECIMAL(10,2) NOT NULL,
  descrizione       VARCHAR(255) NOT NULL,
  data_pagamento    DATE,
  metodo            VARCHAR(20) DEFAULT 'bonifico',
  bonifico_batch_id UUID REFERENCES bonifici_batch(id),
  ras_inserito      BOOLEAN DEFAULT false,
  quietanza_firmata BOOLEAN DEFAULT false,
  note              TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ck_ras_soggetto CHECK (
    (giocatore_id IS NOT NULL) OR (staff_id IS NOT NULL)
  )
);
ALTER TABLE ras_registrazioni DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ras_club_anno_mese ON ras_registrazioni(club_id, anno, mese);
CREATE INDEX IF NOT EXISTS idx_ras_giocatore ON ras_registrazioni(giocatore_id);

-- ── Ricariche portafoglio FIGC ───────────────────────────────
CREATE TABLE IF NOT EXISTS ricariche_portafoglio_figc (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  importo    DECIMAL(8,2) NOT NULL,
  data       DATE NOT NULL DEFAULT CURRENT_DATE,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ricariche_portafoglio_figc DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ricariche_figc_club ON ricariche_portafoglio_figc(club_id);

-- ── Costi tesseramento (per stima portafoglio FIGC) ──────────
-- Usiamo una configurazione fissa per club, non una tabella separata
-- (si può espandere in futuro)
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS costo_tesseramento_definitivo  DECIMAL(6,2) DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS costo_tesseramento_prestito    DECIMAL(6,2) DEFAULT 5.00;
