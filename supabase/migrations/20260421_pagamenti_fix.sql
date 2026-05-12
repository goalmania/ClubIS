-- Soggetti pagamento generici (club, staff, fornitori, enti)
CREATE TABLE IF NOT EXISTS soggetti_pagamento (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo       VARCHAR(30) NOT NULL,
  -- famiglia | giocatore | staff | fornitore | sponsor | ente | club_esterno | altro
  nome       VARCHAR(255) NOT NULL,
  email      VARCHAR(255),
  iban       VARCHAR(34),
  note       TEXT,
  ref_id     UUID, -- opzionale: punta a famiglie.id | utenti.id | sponsors.id
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE soggetti_pagamento DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_soggetti_pagamento_club ON soggetti_pagamento(club_id, tipo);

-- Estendi piani_pagamento con campi categoria/soggetto
ALTER TABLE piani_pagamento ADD COLUMN IF NOT EXISTS tipo_pagamento VARCHAR(100);
ALTER TABLE piani_pagamento ADD COLUMN IF NOT EXISTS categoria      VARCHAR(20) DEFAULT 'entrata';
ALTER TABLE piani_pagamento ADD COLUMN IF NOT EXISTS soggetto_id    UUID REFERENCES soggetti_pagamento(id);
ALTER TABLE piani_pagamento ADD COLUMN IF NOT EXISTS soggetto_nome  VARCHAR(255);
