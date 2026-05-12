-- Modulo Pagamenti — piani a rate con solleciti e ricevute

-- 1. Campi aggiuntivi su clubs per ricevute e solleciti
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS iban           VARCHAR(34);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS codice_fiscale VARCHAR(16);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS piva           VARCHAR(11);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS indirizzo      TEXT;

-- 2. Piano di pagamento
CREATE TABLE IF NOT EXISTS piani_pagamento (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  famiglia_id     UUID REFERENCES famiglie(id) ON DELETE SET NULL,
  giocatore_id    UUID REFERENCES giocatori(id) ON DELETE SET NULL,
  descrizione     VARCHAR(255) NOT NULL,
  importo_totale  DECIMAL(10,2) NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_piani_pagamento_club  ON piani_pagamento(club_id);
CREATE INDEX IF NOT EXISTS idx_piani_pagamento_fam   ON piani_pagamento(famiglia_id);
CREATE INDEX IF NOT EXISTS idx_piani_pagamento_gioc  ON piani_pagamento(giocatore_id);

ALTER TABLE piani_pagamento ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON piani_pagamento;
  CREATE POLICY club_isolation ON piani_pagamento
    FOR ALL USING (
      club_id = my_club_id()
      OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
    );
END $$;

-- 3. Rate di pagamento
CREATE TABLE IF NOT EXISTS rate_pagamento (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  piano_id                 UUID NOT NULL REFERENCES piani_pagamento(id) ON DELETE CASCADE,
  club_id                  UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  numero_rata              INT NOT NULL,
  importo                  DECIMAL(10,2) NOT NULL,
  scadenza                 DATE NOT NULL,
  stato                    VARCHAR(20) NOT NULL DEFAULT 'in_attesa',
  data_pagamento           DATE,
  metodo_pagamento         VARCHAR(50),
  stripe_payment_intent_id TEXT,
  ricevuta_numero          VARCHAR(20),
  ultimo_sollecito_at      TIMESTAMPTZ,
  note                     TEXT
);

CREATE INDEX IF NOT EXISTS idx_rate_pagamento_club  ON rate_pagamento(club_id, scadenza);
CREATE INDEX IF NOT EXISTS idx_rate_pagamento_piano ON rate_pagamento(piano_id);
CREATE INDEX IF NOT EXISTS idx_rate_pagamento_stato ON rate_pagamento(club_id, stato);

ALTER TABLE rate_pagamento ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON rate_pagamento;
  CREATE POLICY club_isolation ON rate_pagamento
    FOR ALL USING (
      club_id = my_club_id()
      OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
    );
END $$;
