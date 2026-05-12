-- Moduli iscrizione online (link pubblico per famiglie)

CREATE TABLE IF NOT EXISTS moduli_iscrizione (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  titolo          VARCHAR(255) NOT NULL,
  descrizione     TEXT,
  tipo            VARCHAR(30) DEFAULT 'iscrizione',
  stagione        VARCHAR(10) DEFAULT '2024-25',
  attivo          BOOLEAN DEFAULT true,
  data_apertura   DATE,
  data_chiusura   DATE,
  max_iscrizioni  INT,

  richiedi_data_nascita    BOOLEAN DEFAULT true,
  richiedi_codice_fiscale  BOOLEAN DEFAULT true,
  richiedi_genitore        BOOLEAN DEFAULT true,
  richiedi_documento       BOOLEAN DEFAULT false,
  richiedi_consenso_gdpr   BOOLEAN DEFAULT true,
  richiedi_consenso_foto   BOOLEAN DEFAULT true,

  pagamento_obbligatorio   BOOLEAN DEFAULT false,
  importo_iscrizione       DECIMAL(8,2),

  qr_code_url     TEXT,
  note_interne    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE moduli_iscrizione DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS richieste_iscrizione (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id       UUID NOT NULL REFERENCES moduli_iscrizione(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

  nome            VARCHAR(150) NOT NULL,
  cognome         VARCHAR(150) NOT NULL,
  data_nascita    DATE,
  codice_fiscale  VARCHAR(16),
  indirizzo       TEXT,
  comune          VARCHAR(100),

  genitore_nome     VARCHAR(150),
  genitore_cognome  VARCHAR(150),
  genitore_email    VARCHAR(255) NOT NULL,
  genitore_telefono VARCHAR(50),
  genitore_cf       VARCHAR(16),
  relazione         VARCHAR(30) DEFAULT 'genitore',

  consenso_gdpr   BOOLEAN DEFAULT false,
  consenso_foto   BOOLEAN DEFAULT false,
  consenso_data   TIMESTAMPTZ,
  ip_address      VARCHAR(45),

  stato           VARCHAR(20) DEFAULT 'in_attesa',
  note_segreteria TEXT,
  documento_url   TEXT,

  pagamento_stato   VARCHAR(20),
  pagamento_importo DECIMAL(8,2),

  giocatore_id    UUID REFERENCES giocatori(id),
  famiglia_id     UUID REFERENCES famiglie(id),

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE richieste_iscrizione DISABLE ROW LEVEL SECURITY;
