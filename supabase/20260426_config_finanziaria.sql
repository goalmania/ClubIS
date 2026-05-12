-- Feature 7: Configurazione Finanziaria

CREATE TABLE IF NOT EXISTS conti_corrente (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  iban            TEXT,
  intestatario    TEXT,
  banca           TEXT,
  filiale         TEXT,
  bic             TEXT,
  predefinito     BOOLEAN DEFAULT false,
  saldo_iniziale  DECIMAL(12,2) DEFAULT 0,
  attivo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS causali_pagamento (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  codice              TEXT NOT NULL,
  descrizione         TEXT NOT NULL,
  tipo                TEXT NOT NULL CHECK (tipo IN ('entrata', 'uscita', 'entrambi')),
  categoria_contabile TEXT,  -- codice categoria (A.01, B.01 ecc.)
  attivo              BOOLEAN DEFAULT true,
  UNIQUE(club_id, codice)
);

CREATE TABLE IF NOT EXISTS categorie_contabili (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID REFERENCES clubs(id) ON DELETE CASCADE, -- NULL = sistema
  codice      TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrata', 'uscita')),
  is_sistema  BOOLEAN DEFAULT true,
  attivo      BOOLEAN DEFAULT true,
  ordine      INT DEFAULT 0
);

ALTER TABLE conti_corrente DISABLE ROW LEVEL SECURITY;
ALTER TABLE causali_pagamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorie_contabili DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS conti_corrente_club ON conti_corrente(club_id);
CREATE INDEX IF NOT EXISTS causali_pagamento_club ON causali_pagamento(club_id);
CREATE INDEX IF NOT EXISTS categorie_contabili_tipo ON categorie_contabili(tipo);

-- Seed categorie contabili standard per ASD (club_id = NULL → disponibili per tutti)
INSERT INTO categorie_contabili (club_id, codice, descrizione, tipo, is_sistema, ordine) VALUES
-- ENTRATE (A)
(NULL, 'A.01', 'Quote associative e di iscrizione',          'entrata', true,  1),
(NULL, 'A.02', 'Proventi da gare e manifestazioni sportive', 'entrata', true,  2),
(NULL, 'A.03', 'Sponsorizzazioni e pubblicità',              'entrata', true,  3),
(NULL, 'A.04', 'Contributi pubblici (Comune, Regione, CONI)','entrata', true,  4),
(NULL, 'A.05', 'Contributi privati e donazioni',             'entrata', true,  5),
(NULL, 'A.06', 'Proventi da cessione diritti TV/media',      'entrata', true,  6),
(NULL, 'A.07', 'Trasferimenti e svincoli atleti',            'entrata', true,  7),
(NULL, 'A.08', 'Proventi attività complementari (bar ecc.)', 'entrata', true,  8),
(NULL, 'A.09', 'Rimborsi e recuperi vari',                   'entrata', true,  9),
(NULL, 'A.10', 'Altre entrate istituzionali',                'entrata', true, 10),
-- USCITE (B)
(NULL, 'B.01', 'Compensi e collaborazioni sportive (D.Lgs. 36/2021)', 'uscita', true, 11),
(NULL, 'B.02', 'Stipendi e oneri personale dipendente',      'uscita', true, 12),
(NULL, 'B.03', 'Affitto e uso impianti sportivi',            'uscita', true, 13),
(NULL, 'B.04', 'Materiale sportivo e attrezzature',          'uscita', true, 14),
(NULL, 'B.05', 'Trasferte, vitto e alloggio',                'uscita', true, 15),
(NULL, 'B.06', 'Iscrizioni campionati e tasse federali',     'uscita', true, 16),
(NULL, 'B.07', 'Assicurazioni e coperture',                  'uscita', true, 17),
(NULL, 'B.08', 'Spese amministrative e segreteria',          'uscita', true, 18),
(NULL, 'B.09', 'Utenze (luce, acqua, gas, telefono)',        'uscita', true, 19),
(NULL, 'B.10', 'Consulenze (legale, fiscale, medica)',        'uscita', true, 20),
(NULL, 'B.11', 'Acquisti materiale di consumo',              'uscita', true, 21);
