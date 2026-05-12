-- ============================================================
-- TABELLE MANCANTI DAL DATABASE
-- Tutte le tabelle usate dal codice ma non presenti nello schema
-- Esegui questo file nel SQL Editor di Supabase
-- ============================================================

-- 1. SPONSORS
CREATE TABLE IF NOT EXISTS sponsors (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome         VARCHAR(200) NOT NULL,
  tipo         VARCHAR(20) NOT NULL DEFAULT 'partner', -- gold, silver, bronze, partner
  importo_annuo NUMERIC(12,2),
  attivo       BOOLEAN NOT NULL DEFAULT TRUE,
  data_inizio  DATE,
  data_fine    DATE,
  referente    VARCHAR(200),
  email        VARCHAR(200),
  telefono     VARCHAR(50),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sponsors_club ON sponsors(club_id);

-- 2. SPONSOR_PAGAMENTI
CREATE TABLE IF NOT EXISTS sponsor_pagamenti (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  importo    NUMERIC(12,2) NOT NULL,
  data       DATE NOT NULL,
  stato      VARCHAR(30) NOT NULL DEFAULT 'atteso', -- atteso, incassato, stornato
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sponsor_pag_club ON sponsor_pagamenti(club_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_pag_sponsor ON sponsor_pagamenti(sponsor_id);

-- 3. TRASFERTE
CREATE TABLE IF NOT EXISTS trasferte (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partita_id       UUID REFERENCES partite(id) ON DELETE SET NULL,
  destinazione     VARCHAR(300) NOT NULL,
  data_partenza    DATE NOT NULL,
  data_rientro     DATE,
  mezzo            VARCHAR(50), -- pullman, treno, aereo, pulmino, auto
  costo_stimato    NUMERIC(12,2),
  costo_effettivo  NUMERIC(12,2),
  note             TEXT,
  stato            VARCHAR(30) NOT NULL DEFAULT 'pianificata', -- pianificata, confermata, completata, annullata
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trasferte_club ON trasferte(club_id);

-- 4. VISITE_MEDICHE
CREATE TABLE IF NOT EXISTS visite_mediche (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id               UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id          UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  tipo                  VARCHAR(100) NOT NULL, -- idoneita_agonistica, visita_periodica, visita_infortunio
  data                  DATE NOT NULL,
  esito                 VARCHAR(30) NOT NULL DEFAULT 'in_attesa', -- idoneo, non_idoneo, sospesa, in_attesa
  struttura             VARCHAR(200),
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visite_club ON visite_mediche(club_id);
CREATE INDEX IF NOT EXISTS idx_visite_giocatore ON visite_mediche(giocatore_id);

-- 5. INFORTUNI
CREATE TABLE IF NOT EXISTS infortuni (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id                 UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id            UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  tipo                    VARCHAR(100) NOT NULL, -- muscolare, osseo, articolare, contusione, altro
  gravita                 VARCHAR(20) NOT NULL DEFAULT 'lieve', -- lieve, moderato, grave
  zona_corpo              VARCHAR(100),
  data_infortunio         DATE NOT NULL,
  data_rientro_prevista   DATE,
  data_rientro_effettiva  DATE,
  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_infortuni_club ON infortuni(club_id);
CREATE INDEX IF NOT EXISTS idx_infortuni_giocatore ON infortuni(giocatore_id);

-- 6. SQUALIFICHE
CREATE TABLE IF NOT EXISTS squalifiche (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id      UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  motivo            TEXT NOT NULL,
  partite_restanti  INTEGER NOT NULL DEFAULT 0,
  data_inizio       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_squalifiche_club ON squalifiche(club_id);

-- 7. ALLENAMENTI
CREATE TABLE IF NOT EXISTS allenamenti (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  data       DATE NOT NULL,
  ora        TIME,
  luogo      VARCHAR(300),
  tipo       VARCHAR(100), -- tattico, fisico, tecnico, partitella
  obiettivo  TEXT,
  esercizi   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_allenamenti_club ON allenamenti(club_id, data);

-- 8. OBIETTIVI_STAGIONALI
CREATE TABLE IF NOT EXISTS obiettivi_stagionali (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  area           VARCHAR(50) NOT NULL, -- sportivo, economico, settore, sociale, strutture
  titolo         VARCHAR(200) NOT NULL,
  descrizione    TEXT,
  target         NUMERIC(15,2),
  valore_attuale NUMERIC(15,2) DEFAULT 0,
  unita          VARCHAR(50),
  stato          VARCHAR(30) NOT NULL DEFAULT 'in_corso', -- in_corso, raggiunto, a_rischio, fallito
  scadenza       DATE,
  priorita       INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obiettivi_club ON obiettivi_stagionali(club_id);

-- 9. TRATTATIVE (DS Mercato)
CREATE TABLE IF NOT EXISTS trattative (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_nome   VARCHAR(200) NOT NULL,
  ruolo            VARCHAR(50),
  club_provenienza VARCHAR(200),
  tipo_operazione  VARCHAR(20) NOT NULL DEFAULT 'acquisto', -- acquisto, cessione, prestito
  stato            VARCHAR(30) NOT NULL DEFAULT 'scouting', -- scouting, contatto, trattativa, accordo, chiuso
  valore_stimato   NUMERIC(12,2),
  priorita         INTEGER NOT NULL DEFAULT 0,
  scadenza         DATE,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trattative_club ON trattative(club_id);

-- 10. DOCUMENTI_ARCHIVIO
CREATE TABLE IF NOT EXISTS documenti_archivio (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  titolo           VARCHAR(300) NOT NULL,
  categoria        VARCHAR(50) NOT NULL DEFAULT 'altro', -- fiscale, federale, sanitario, contratti, verbali, altro
  file_url         TEXT,
  tag              TEXT[],
  data_caricamento DATE NOT NULL DEFAULT CURRENT_DATE,
  dimensione_kb    INTEGER,
  caricato_da      UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documenti_club ON documenti_archivio(club_id, categoria);

-- 11. FIGC_MODULI_LOG
CREATE TABLE IF NOT EXISTS figc_moduli_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo_modulo VARCHAR(50) NOT NULL, -- infortuni, svincolo, distinta, affiliazione
  dati        JSONB NOT NULL DEFAULT '{}'::JSONB,
  creato_da   UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_figc_log_club ON figc_moduli_log(club_id, created_at DESC);

-- 12. PROTOCOLLI_PREVENZIONE
CREATE TABLE IF NOT EXISTS protocolli_prevenzione (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  titolo      VARCHAR(200) NOT NULL,
  descrizione TEXT,
  area        VARCHAR(100), -- muscolare, articolare, cardiovascolare, etc.
  frequenza   VARCHAR(50),  -- giornaliero, settimanale, mensile
  attivo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_protocolli_club ON protocolli_prevenzione(club_id);

-- 13. PIANI_PAGAMENTO
CREATE TABLE IF NOT EXISTS piani_pagamento (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  famiglia_id    UUID NOT NULL REFERENCES famiglie(id) ON DELETE CASCADE,
  giocatore_id   UUID REFERENCES giocatori(id) ON DELETE SET NULL,
  descrizione    VARCHAR(300) NOT NULL,
  importo_totale NUMERIC(12,2) NOT NULL,
  numero_rate    INTEGER NOT NULL DEFAULT 1,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_piani_club ON piani_pagamento(club_id);
CREATE INDEX IF NOT EXISTS idx_piani_famiglia ON piani_pagamento(famiglia_id);

-- 14. RATE_PAGAMENTO
CREATE TABLE IF NOT EXISTS rate_pagamento (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id              UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  piano_id             UUID NOT NULL REFERENCES piani_pagamento(id) ON DELETE CASCADE,
  famiglia_id          UUID NOT NULL REFERENCES famiglie(id) ON DELETE CASCADE,
  giocatore_id         UUID REFERENCES giocatori(id) ON DELETE SET NULL,
  numero_rata          INTEGER NOT NULL,
  importo              NUMERIC(12,2) NOT NULL,
  scadenza             DATE NOT NULL,
  stato                VARCHAR(20) NOT NULL DEFAULT 'in_attesa', -- in_attesa, pagata, annullata
  data_pagamento       DATE,
  metodo_pagamento     VARCHAR(50),
  ricevuta_numero      VARCHAR(100),
  ultimo_sollecito_at  TIMESTAMPTZ,
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_club ON rate_pagamento(club_id);
CREATE INDEX IF NOT EXISTS idx_rate_piano ON rate_pagamento(piano_id);
CREATE INDEX IF NOT EXISTS idx_rate_famiglia ON rate_pagamento(famiglia_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_pagamenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE trasferte ENABLE ROW LEVEL SECURITY;
ALTER TABLE visite_mediche ENABLE ROW LEVEL SECURITY;
ALTER TABLE infortuni ENABLE ROW LEVEL SECURITY;
ALTER TABLE squalifiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE allenamenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE obiettivi_stagionali ENABLE ROW LEVEL SECURITY;
ALTER TABLE trattative ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti_archivio ENABLE ROW LEVEL SECURITY;
ALTER TABLE figc_moduli_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocolli_prevenzione ENABLE ROW LEVEL SECURITY;
ALTER TABLE piani_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_pagamento ENABLE ROW LEVEL SECURITY;

-- Policy standard: ogni utente vede solo i dati del proprio club
DROP POLICY IF EXISTS sponsors_club ON sponsors;
CREATE POLICY sponsors_club ON sponsors FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS sponsor_pag_club ON sponsor_pagamenti;
CREATE POLICY sponsor_pag_club ON sponsor_pagamenti FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS trasferte_club ON trasferte;
CREATE POLICY trasferte_club ON trasferte FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS visite_club ON visite_mediche;
CREATE POLICY visite_club ON visite_mediche FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS infortuni_club ON infortuni;
CREATE POLICY infortuni_club ON infortuni FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS squalifiche_club ON squalifiche;
CREATE POLICY squalifiche_club ON squalifiche FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS allenamenti_club ON allenamenti;
CREATE POLICY allenamenti_club ON allenamenti FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS obiettivi_club ON obiettivi_stagionali;
CREATE POLICY obiettivi_club ON obiettivi_stagionali FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS trattative_club ON trattative;
CREATE POLICY trattative_club ON trattative FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS documenti_club ON documenti_archivio;
CREATE POLICY documenti_club ON documenti_archivio FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS figc_log_club ON figc_moduli_log;
CREATE POLICY figc_log_club ON figc_moduli_log FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS protocolli_club ON protocolli_prevenzione;
CREATE POLICY protocolli_club ON protocolli_prevenzione FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS piani_club ON piani_pagamento;
CREATE POLICY piani_club ON piani_pagamento FOR ALL USING (club_id = my_club_id());

DROP POLICY IF EXISTS rate_club ON rate_pagamento;
CREATE POLICY rate_club ON rate_pagamento FOR ALL USING (club_id = my_club_id());
