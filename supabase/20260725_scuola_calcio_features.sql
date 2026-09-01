-- ============================================================
-- Scuola calcio: rubrica valutazioni mensili + gestione campi
-- Additivo e idempotente: nessuna tabella/colonna esistente toccata.
-- ============================================================

-- ── Rubrica di valutazione mensile (dedicata, non riusa valutazioni_tecniche
-- che ha assi diversi pensati per il campionato agonistico) ────────────────
CREATE TABLE IF NOT EXISTS valutazioni_mensili_scuola_calcio (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id      UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  allenatore_id     UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  mese              CHAR(7) NOT NULL, -- 'YYYY-MM'
  tecnico           SMALLINT NOT NULL CHECK (tecnico BETWEEN 1 AND 5),
  impegno           SMALLINT NOT NULL CHECK (impegno BETWEEN 1 AND 5),
  rispetto_regole   SMALLINT NOT NULL CHECK (rispetto_regole BETWEEN 1 AND 5),
  socializzazione   SMALLINT NOT NULL CHECK (socializzazione BETWEEN 1 AND 5),
  nota              TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (giocatore_id, mese)
);

CREATE INDEX IF NOT EXISTS idx_valutazioni_mensili_giocatore ON valutazioni_mensili_scuola_calcio(giocatore_id, mese);

ALTER TABLE valutazioni_mensili_scuola_calcio ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS valutazioni_mensili_access ON valutazioni_mensili_scuola_calcio;
  CREATE POLICY valutazioni_mensili_access ON valutazioni_mensili_scuola_calcio FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

-- ── Campi (impianti sportivi) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campi (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome        VARCHAR(120) NOT NULL,
  indirizzo   TEXT,
  note        TEXT,
  attivo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campi_club ON campi(club_id);

ALTER TABLE campi ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS campi_access ON campi;
  CREATE POLICY campi_access ON campi FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

-- Collegamento facoltativo evento calendario -> campo (nullable, non tocca
-- il campo esistente luogo_testo). Serve per il controllo sovrapposizioni.
ALTER TABLE eventi_calendario
  ADD COLUMN IF NOT EXISTS campo_id UUID REFERENCES campi(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventi_calendario_campo ON eventi_calendario(campo_id, data_ora_inizio);

-- ── Richieste di iscrizione da link pubblico ────────────────────────────
-- Non crea direttamente giocatori/tesseramenti (dati non verificati, arrivano
-- da un form pubblico senza autenticazione): il segretario le rivede e le
-- converte a mano nel flusso di iscrizione esistente.
CREATE TABLE IF NOT EXISTS richieste_iscrizione_pubbliche (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome_bambino      VARCHAR(100) NOT NULL,
  cognome_bambino   VARCHAR(100) NOT NULL,
  data_nascita      DATE,
  nome_genitore     VARCHAR(150) NOT NULL,
  email_genitore    VARCHAR(255) NOT NULL,
  telefono_genitore VARCHAR(30),
  categoria_interesse VARCHAR(50),
  note              TEXT,
  stato             VARCHAR(20) NOT NULL DEFAULT 'nuovo' CHECK (stato IN ('nuovo','contattato','iscritto','rifiutato')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_richieste_iscrizione_club ON richieste_iscrizione_pubbliche(club_id, created_at DESC);

ALTER TABLE richieste_iscrizione_pubbliche ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS richieste_iscrizione_access ON richieste_iscrizione_pubbliche;
  CREATE POLICY richieste_iscrizione_access ON richieste_iscrizione_pubbliche FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

SELECT 'OK — valutazioni_mensili_scuola_calcio, campi, richieste_iscrizione_pubbliche creati' AS risultato;
