-- Feature 6: Fornitori e Clienti

CREATE TABLE IF NOT EXISTS fornitori_clienti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('fornitore', 'cliente', 'entrambi')),
  nome             TEXT NOT NULL,
  ragione_sociale  TEXT,
  piva             TEXT,
  codice_fiscale   TEXT,
  email            TEXT,
  telefono         TEXT,
  pec              TEXT,
  sdi              TEXT,
  indirizzo        TEXT,
  citta            TEXT,
  cap              TEXT,
  provincia        TEXT,
  categoria        TEXT DEFAULT 'altro',
  -- categorie: materiale_sportivo | servizi | strutture | comunicazione | legale | commercialista | altro
  iban             TEXT,
  bic              TEXT,
  note             TEXT,
  attivo           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagamenti_fornitore (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  fornitore_id    UUID NOT NULL REFERENCES fornitori_clienti(id) ON DELETE CASCADE,
  descrizione     TEXT NOT NULL,
  importo         DECIMAL(10,2) NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrata', 'uscita')),
  data_scadenza   DATE,
  data_pagamento  DATE,
  stato           TEXT DEFAULT 'da_pagare' CHECK (stato IN ('da_pagare', 'pagato', 'scaduto', 'annullato')),
  numero_fattura  TEXT,
  prima_nota_id   UUID REFERENCES prima_nota(id),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fornitori_clienti DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagamenti_fornitore DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS fornitori_clienti_club ON fornitori_clienti(club_id);
CREATE INDEX IF NOT EXISTS fornitori_clienti_tipo ON fornitori_clienti(tipo);
CREATE INDEX IF NOT EXISTS pagamenti_fornitore_club ON pagamenti_fornitore(club_id);
CREATE INDEX IF NOT EXISTS pagamenti_fornitore_fornitore ON pagamenti_fornitore(fornitore_id);
CREATE INDEX IF NOT EXISTS pagamenti_fornitore_stato ON pagamenti_fornitore(stato);
