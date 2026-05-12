-- FIX 016 — Iscrizioni online: tabelle moduli_iscrizione e richieste_iscrizione
--
-- La migration 20260422_moduli_iscrizione.sql usava DISABLE ROW LEVEL SECURITY
-- senza GRANT → PostgREST non trovava le tabelle nello schema cache e tornava
-- "could not find the table public.moduli_iscrizione in the schema cache".
--
-- Questo file:
--   1. Crea entrambe le tabelle in modo idempotente (CREATE TABLE IF NOT EXISTS)
--   2. Abilita RLS con policy club_id per utenti autenticati
--   3. Aggiunge policy separata per anon (lettura moduli + inserimento richieste)
--   4. Emette i GRANT necessari
--   5. Notifica PostgREST di ricaricare la schema cache

-- ── 1. Tabella moduli_iscrizione ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moduli_iscrizione (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                  UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  slug                     VARCHAR(100) UNIQUE NOT NULL,
  titolo                   VARCHAR(255) NOT NULL,
  descrizione              TEXT,
  tipo                     VARCHAR(30)  DEFAULT 'iscrizione',
  stagione                 VARCHAR(10)  DEFAULT '2024-25',
  attivo                   BOOLEAN      DEFAULT true,
  data_apertura            DATE,
  data_chiusura            DATE,
  max_iscrizioni           INT,

  richiedi_data_nascita    BOOLEAN DEFAULT true,
  richiedi_codice_fiscale  BOOLEAN DEFAULT true,
  richiedi_genitore        BOOLEAN DEFAULT true,
  richiedi_documento       BOOLEAN DEFAULT false,
  richiedi_consenso_gdpr   BOOLEAN DEFAULT true,
  richiedi_consenso_foto   BOOLEAN DEFAULT true,

  pagamento_obbligatorio   BOOLEAN DEFAULT false,
  importo_iscrizione       DECIMAL(8,2),

  qr_code_url              TEXT,
  note_interne             TEXT,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moduli_iscrizione_club
  ON moduli_iscrizione(club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moduli_iscrizione_slug
  ON moduli_iscrizione(slug);

-- ── 2. Tabella richieste_iscrizione ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS richieste_iscrizione (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id         UUID        NOT NULL REFERENCES moduli_iscrizione(id) ON DELETE CASCADE,
  club_id           UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

  nome              VARCHAR(150) NOT NULL,
  cognome           VARCHAR(150) NOT NULL,
  data_nascita      DATE,
  codice_fiscale    VARCHAR(16),
  indirizzo         TEXT,
  comune            VARCHAR(100),

  genitore_nome     VARCHAR(150),
  genitore_cognome  VARCHAR(150),
  genitore_email    VARCHAR(255) NOT NULL,
  genitore_telefono VARCHAR(50),
  genitore_cf       VARCHAR(16),
  relazione         VARCHAR(30)  DEFAULT 'genitore',

  consenso_gdpr     BOOLEAN      DEFAULT false,
  consenso_foto     BOOLEAN      DEFAULT false,
  consenso_data     TIMESTAMPTZ,
  ip_address        VARCHAR(45),

  stato             VARCHAR(20)  DEFAULT 'in_attesa',
  note_segreteria   TEXT,
  documento_url     TEXT,

  pagamento_stato   VARCHAR(20),
  pagamento_importo DECIMAL(8,2),

  giocatore_id      UUID REFERENCES giocatori(id),
  famiglia_id       UUID REFERENCES famiglie(id),

  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_richieste_iscrizione_club
  ON richieste_iscrizione(club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_richieste_iscrizione_modulo
  ON richieste_iscrizione(modulo_id);

CREATE INDEX IF NOT EXISTS idx_richieste_iscrizione_stato
  ON richieste_iscrizione(club_id, stato);

-- ── 3. RLS — moduli_iscrizione ────────────────────────────────────────────────

ALTER TABLE moduli_iscrizione ENABLE ROW LEVEL SECURITY;

-- Segreteria/staff: accesso completo ai propri moduli
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON moduli_iscrizione;
  CREATE POLICY club_isolation ON moduli_iscrizione
    FOR ALL TO authenticated
    USING (club_id = my_club_id() OR is_super_admin());
END $$;

-- Pubblico (anon): sola lettura dei moduli attivi — necessario per /iscriviti/[slug]
DO $$ BEGIN
  DROP POLICY IF EXISTS anon_read ON moduli_iscrizione;
  CREATE POLICY anon_read ON moduli_iscrizione
    FOR SELECT TO anon
    USING (attivo = true);
END $$;

-- ── 4. RLS — richieste_iscrizione ─────────────────────────────────────────────

ALTER TABLE richieste_iscrizione ENABLE ROW LEVEL SECURITY;

-- Segreteria/staff: accesso completo alle richieste del proprio club
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON richieste_iscrizione;
  CREATE POLICY club_isolation ON richieste_iscrizione
    FOR ALL TO authenticated
    USING (club_id = my_club_id() OR is_super_admin());
END $$;

-- Pubblico (anon): solo INSERT — il form pubblico non è autenticato
DO $$ BEGIN
  DROP POLICY IF EXISTS anon_insert ON richieste_iscrizione;
  CREATE POLICY anon_insert ON richieste_iscrizione
    FOR INSERT TO anon
    WITH CHECK (true);
END $$;

-- Pubblico (anon): SELECT necessario per contare le iscrizioni (controllo max_iscrizioni)
DO $$ BEGIN
  DROP POLICY IF EXISTS anon_count ON richieste_iscrizione;
  CREATE POLICY anon_count ON richieste_iscrizione
    FOR SELECT TO anon
    USING (true);
END $$;

-- ── 5. GRANT ──────────────────────────────────────────────────────────────────

-- Accesso completo per utenti autenticati (staff)
GRANT SELECT, INSERT, UPDATE, DELETE ON moduli_iscrizione    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON richieste_iscrizione TO authenticated;

-- Accesso minimale per anon (form pubblico)
GRANT SELECT, INSERT               ON moduli_iscrizione    TO anon;
GRANT SELECT, INSERT               ON richieste_iscrizione TO anon;

-- ── 6. Notifica PostgREST di ricaricare la schema cache ──────────────────────

NOTIFY pgrst, 'reload schema';
