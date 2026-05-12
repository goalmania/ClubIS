-- Compensi collaboratori sportivi (Riforma Sport D.Lgs. 36/2021)

CREATE TABLE IF NOT EXISTS soglie_fiscali (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anno    INT NOT NULL,
  soglia_esenzione          DECIMAL(10,2) DEFAULT 5000.00,
  aliquota_ritenuta         DECIMAL(5,2)  DEFAULT 23.00,
  contributi_inps_percentuale DECIMAL(5,2) DEFAULT 25.00,
  UNIQUE(anno)
);
ALTER TABLE soglie_fiscali DISABLE ROW LEVEL SECURITY;

INSERT INTO soglie_fiscali (anno, soglia_esenzione, aliquota_ritenuta)
VALUES (2024, 5000.00, 23.00), (2025, 5000.00, 23.00)
ON CONFLICT (anno) DO NOTHING;

CREATE TABLE IF NOT EXISTS compensi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  collaboratore_id  UUID REFERENCES utenti(id),
  nome_esterno      VARCHAR(255),
  cf_esterno        VARCHAR(16),

  anno              INT NOT NULL,
  importo_lordo     DECIMAL(10,2) NOT NULL,
  importo_precedente DECIMAL(10,2) DEFAULT 0,
  supera_soglia     BOOLEAN DEFAULT false,
  importo_esente    DECIMAL(10,2) DEFAULT 0,
  importo_imponibile DECIMAL(10,2) DEFAULT 0,
  ritenuta          DECIMAL(10,2) DEFAULT 0,
  importo_netto     DECIMAL(10,2) DEFAULT 0,

  descrizione       VARCHAR(255) NOT NULL,
  mese              INT,
  data_pagamento    DATE,
  metodo            VARCHAR(30) DEFAULT 'bonifico',

  autocertificazione_generata BOOLEAN DEFAULT false,
  autocertificazione_url      TEXT,

  rata_id           UUID,

  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE compensi DISABLE ROW LEVEL SECURITY;
