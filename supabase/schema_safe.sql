-- ============================================================
-- CIS — Schema sicuro (idempotente, eseguibile più volte)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUM (creati solo se non esistono)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE categoria_club AS ENUM ('serie_a','serie_b','serie_c','serie_d','eccellenza','promozione','prima_categoria','seconda_categoria','terza_categoria','scuola_calcio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE piano_abbonamento AS ENUM ('base','pro','elite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruolo_utente AS ENUM ('presidente','ds','segretario','allenatore','osservatore','medico','famiglia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE categoria_eta AS ENUM ('u6','u8','u10','u12','u14','u15','u16','u17','u19','juniores','primavera','prima_squadra','femminile');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruolo_campo AS ENUM ('portiere','difensore_centrale','terzino','centrocampista_difensivo','centrocampista','trequartista','ala','seconda_punta','centravanti');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE piede AS ENUM ('destro','sinistro','ambidestro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE nazionalita_tipo AS ENUM ('italiano','ue','extracomunitario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_tesseramento AS ENUM ('definitivo','prestito','in_prova','svincolo','compartecipazione');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stato_tesseramento AS ENUM ('attivo','sospeso','cessato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_certificato AS ENUM ('agonistico','non_agonistico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_contratto_staff AS ENUM ('cococo','autonomo','dipendente','volontario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_sessione AS ENUM ('tecnico','tattico','fisico','partitella','recupero','video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stato_sessione AS ENUM ('programmato','effettuato','annullato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE motivo_assenza AS ENUM ('infortunio','malattia','lavoro','squalifica','non_giustificata','personale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stato_presenza_rapida AS ENUM ('presente','assente','giustificato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE materiale_richiesta_stato AS ENUM ('in_attesa','approvata','consegnata','rifiutata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE materiale_urgenza AS ENUM ('bassa','media','alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_partita AS ENUM ('campionato','coppa','amichevole','playoff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE casa_trasferta AS ENUM ('casa','trasferta','neutro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stato_partita AS ENUM ('programmata','giocata','rinviata','annullata','sospesa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stato_convocazione AS ENUM ('in_attesa','confermato','indisponibile');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE potenziale_giocatore AS ENUM ('basso','medio','alto','eccezionale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE esito_scouting AS ENUM ('in_valutazione','ingaggiato','rifiutato','archiviato','lista_attesa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stato_quota AS ENUM ('non_pagato','parziale','pagato','rimborsato','esonerato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE metodo_pagamento AS ENUM ('contanti','bonifico','stripe','paypal','assegno');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_movimento AS ENUM ('entrata','uscita');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE categoria_movimento AS ENUM ('quote_iscrizione','sponsorizzazioni','proventi_gare','stipendi','compensi_staff','trasferte','materiale_sportivo','affitto_strutture','utenze','federazione','altro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_notifica AS ENUM ('scadenza_certificato','scadenza_contratto','quota_arretrata','convocazione','messaggio','alert_sistema','abbonamento_cis');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_messaggio AS ENUM ('avviso','comunicazione','convocazione','alert_tecnico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABELLE (CREATE IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS clubs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                 VARCHAR(150) NOT NULL,
  nome_esteso          VARCHAR(255),
  figc_codice          VARCHAR(20) UNIQUE,
  categoria            categoria_club NOT NULL DEFAULT 'eccellenza',
  citta                VARCHAR(100) NOT NULL,
  provincia            CHAR(2),
  regione              VARCHAR(50),
  logo_url             TEXT,
  colori_sociali       VARCHAR(100),
  anno_fondazione      SMALLINT,
  piano_abbonamento    piano_abbonamento NOT NULL DEFAULT 'base',
  abbonamento_scadenza DATE,
  stripe_customer_id   VARCHAR(100),
  sito_web             VARCHAR(255),
  email_ufficiale      VARCHAR(255),
  telefono             VARCHAR(20),
  indirizzo_sede       TEXT,
  attivo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS utenti (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome            VARCHAR(100) NOT NULL,
  cognome         VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  telefono        VARCHAR(20),
  ruolo           ruolo_utente NOT NULL,
  squadre_ids     UUID[] DEFAULT '{}',
  foto_url        TEXT,
  attivo          BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_accesso  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squadre (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome            VARCHAR(150) NOT NULL,
  categoria_eta   categoria_eta NOT NULL,
  stagione        VARCHAR(10) NOT NULL DEFAULT '2024-25',
  allenatore_id   UUID REFERENCES utenti(id) ON DELETE SET NULL,
  campo_default   VARCHAR(255),
  colore_maglia   VARCHAR(50),
  attiva          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS giocatori (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              VARCHAR(100) NOT NULL,
  cognome           VARCHAR(100) NOT NULL,
  data_nascita      DATE NOT NULL,
  luogo_nascita     VARCHAR(100),
  nazionalita_tipo  nazionalita_tipo NOT NULL DEFAULT 'italiano',
  nazionalita_paese VARCHAR(60) DEFAULT 'Italia',
  codice_fiscale    VARCHAR(16) UNIQUE NOT NULL,
  ruolo_principale  ruolo_campo,
  ruolo_secondario  ruolo_campo,
  piede             piede DEFAULT 'destro',
  altezza_cm        SMALLINT,
  peso_kg           SMALLINT,
  foto_url          TEXT,
  email_contatto    VARCHAR(255),
  telefono_contatto VARCHAR(20),
  note_private      TEXT,
  consenso_gdpr     BOOLEAN NOT NULL DEFAULT FALSE,
  consenso_data     TIMESTAMPTZ,
  consenso_immagini BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giocatori_nome ON giocatori USING GIN (to_tsvector('italian', nome || ' ' || cognome));
CREATE INDEX IF NOT EXISTS idx_giocatori_cf ON giocatori(codice_fiscale);

CREATE TABLE IF NOT EXISTS tesseramenti (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id  UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  squadra_id    UUID REFERENCES squadre(id) ON DELETE SET NULL,
  stagione      VARCHAR(10) NOT NULL DEFAULT '2024-25',
  tipo          tipo_tesseramento NOT NULL DEFAULT 'definitivo',
  data_inizio   DATE NOT NULL,
  data_fine     DATE,
  numero_maglia SMALLINT,
  stato         stato_tesseramento NOT NULL DEFAULT 'attivo',
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(giocatore_id, club_id, stagione, stato) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_tesseramenti_club ON tesseramenti(club_id, stagione);
CREATE INDEX IF NOT EXISTS idx_tesseramenti_giocatore ON tesseramenti(giocatore_id);
CREATE INDEX IF NOT EXISTS idx_tesseramenti_squadra ON tesseramenti(squadra_id);

CREATE TABLE IF NOT EXISTS certificati_medici (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id   UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo           tipo_certificato NOT NULL DEFAULT 'agonistico',
  data_rilascio  DATE NOT NULL,
  data_scadenza  DATE NOT NULL,
  medico         VARCHAR(150),
  struttura      VARCHAR(200),
  documento_url  TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificati_scadenza ON certificati_medici(data_scadenza);
CREATE INDEX IF NOT EXISTS idx_certificati_giocatore ON certificati_medici(giocatore_id);

CREATE TABLE IF NOT EXISTS contratti (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id         UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  club_id              UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  data_inizio          DATE NOT NULL,
  data_scadenza        DATE NOT NULL,
  ingaggio_mensile     NUMERIC(10,2),
  bonus_clausole       JSONB DEFAULT '{}',
  opzione_rinnovo      BOOLEAN DEFAULT FALSE,
  clausola_rescissione NUMERIC(12,2),
  documento_url        TEXT,
  note_private         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratti_scadenza ON contratti(data_scadenza);

CREATE TABLE IF NOT EXISTS famiglie (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id       UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  nome               VARCHAR(100) NOT NULL,
  cognome            VARCHAR(100) NOT NULL,
  relazione          VARCHAR(20) NOT NULL DEFAULT 'genitore',
  email              VARCHAR(255),
  telefono           VARCHAR(20),
  telefono_emergenza VARCHAR(20),
  consenso_immagini  BOOLEAN DEFAULT FALSE,
  consenso_dati      BOOLEAN DEFAULT FALSE,
  auth_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaboratori_staff (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utente_id            UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  club_id              UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo_contratto       tipo_contratto_staff NOT NULL DEFAULT 'cococo',
  codice_fiscale       VARCHAR(16) NOT NULL,
  iban                 VARCHAR(34),
  compenso_mensile     NUMERIC(8,2),
  totale_annuo_erogato NUMERIC(10,2) DEFAULT 0,
  data_inizio          DATE NOT NULL,
  data_fine            DATE,
  attivo               BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessioni_allenamento (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squadra_id      UUID NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  allenatore_id   UUID REFERENCES utenti(id) ON DELETE SET NULL,
  data_ora        TIMESTAMPTZ NOT NULL,
  durata_minuti   SMALLINT DEFAULT 90,
  campo           VARCHAR(255),
  tipologia       tipo_sessione NOT NULL DEFAULT 'tecnico',
  obiettivo       VARCHAR(255),
  note_tecnico    TEXT,
  stato           stato_sessione NOT NULL DEFAULT 'programmato',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessioni_squadra ON sessioni_allenamento(squadra_id, data_ora);

CREATE TABLE IF NOT EXISTS presenze (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sessione_id     UUID REFERENCES sessioni_allenamento(id) ON DELETE CASCADE,
  giocatore_id    UUID REFERENCES giocatori(id) ON DELETE CASCADE,
  staff_id        UUID REFERENCES utenti(id) ON DELETE CASCADE,
  club_id         UUID REFERENCES clubs(id) ON DELETE CASCADE,
  data            DATE,
  stato           stato_presenza_rapida,
  presente        BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_assenza  motivo_assenza,
  note            VARCHAR(255),
  registrato_da   UUID REFERENCES utenti(id),
  registrato_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT presenze_target_check CHECK (giocatore_id IS NOT NULL OR staff_id IS NOT NULL),
  CONSTRAINT presenze_rapide_check CHECK (
    sessione_id IS NOT NULL
    OR (club_id IS NOT NULL AND data IS NOT NULL AND stato IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_presenze_giocatore ON presenze(giocatore_id);
CREATE INDEX IF NOT EXISTS idx_presenze_sessione ON presenze(sessione_id);
CREATE INDEX IF NOT EXISTS idx_presenze_rapide_club_data ON presenze(club_id, data DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_presenze_sessione_giocatore
  ON presenze(sessione_id, giocatore_id)
  WHERE sessione_id IS NOT NULL AND giocatore_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS partite (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squadra_id     UUID NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  avversario     VARCHAR(150) NOT NULL,
  data_ora       TIMESTAMPTZ NOT NULL,
  campo          VARCHAR(255),
  indirizzo      TEXT,
  tipo           tipo_partita NOT NULL DEFAULT 'campionato',
  competizione   VARCHAR(100),
  giornata       SMALLINT,
  casa_trasferta casa_trasferta NOT NULL DEFAULT 'casa',
  gol_fatti      SMALLINT,
  gol_subiti     SMALLINT,
  stato          stato_partita NOT NULL DEFAULT 'programmata',
  arbitro        VARCHAR(150),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partite_squadra ON partite(squadra_id, data_ora);

CREATE TABLE IF NOT EXISTS convocazioni (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partita_id      UUID NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
  giocatore_id    UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  stato_risposta  stato_convocazione NOT NULL DEFAULT 'in_attesa',
  motivo_assenza  VARCHAR(255),
  risposta_at     TIMESTAMPTZ,
  titolare        BOOLEAN,
  minuti_giocati  SMALLINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(partita_id, giocatore_id)
);

CREATE TABLE IF NOT EXISTS statistiche_partita (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partita_id      UUID NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
  giocatore_id    UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  minuti_giocati  SMALLINT DEFAULT 0,
  gol             SMALLINT DEFAULT 0,
  assist          SMALLINT DEFAULT 0,
  ammonizioni     SMALLINT DEFAULT 0 CHECK (ammonizioni BETWEEN 0 AND 2),
  espulsioni      SMALLINT DEFAULT 0 CHECK (espulsioni BETWEEN 0 AND 1),
  rigori_segnati  SMALLINT DEFAULT 0,
  parate          SMALLINT DEFAULT 0,
  voto_allenatore NUMERIC(3,1) CHECK (voto_allenatore BETWEEN 1 AND 10),
  UNIQUE(partita_id, giocatore_id)
);

CREATE TABLE IF NOT EXISTS valutazioni_tecniche (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id      UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  allenatore_id     UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  tecnica           SMALLINT CHECK (tecnica BETWEEN 1 AND 10),
  tattica           SMALLINT CHECK (tattica BETWEEN 1 AND 10),
  fisico            SMALLINT CHECK (fisico BETWEEN 1 AND 10),
  mentale           SMALLINT CHECK (mentale BETWEEN 1 AND 10),
  note              TEXT,
  visibile_famiglia BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valutazioni_giocatore ON valutazioni_tecniche(giocatore_id, data);

CREATE TABLE IF NOT EXISTS report_scouting (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id        UUID REFERENCES giocatori(id) ON DELETE SET NULL,
  nome_giocatore_ext  VARCHAR(200),
  club_attuale_ext    VARCHAR(150),
  osservatore_id      UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  club_richiedente_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  data_osservazione   DATE NOT NULL,
  partita_osservata   VARCHAR(255),
  tecnica             SMALLINT CHECK (tecnica BETWEEN 1 AND 10),
  tattica             SMALLINT CHECK (tattica BETWEEN 1 AND 10),
  fisico              SMALLINT CHECK (fisico BETWEEN 1 AND 10),
  mentale             SMALLINT CHECK (mentale BETWEEN 1 AND 10),
  voto_globale        SMALLINT CHECK (voto_globale BETWEEN 1 AND 10),
  potenziale          potenziale_giocatore DEFAULT 'medio',
  punti_forza         TEXT,
  punti_debolezza     TEXT,
  note_libere         TEXT,
  esito               esito_scouting DEFAULT 'in_valutazione',
  visibile_ds         BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scouting_club ON report_scouting(club_richiedente_id);
CREATE INDEX IF NOT EXISTS idx_scouting_osservatore ON report_scouting(osservatore_id);

CREATE TABLE IF NOT EXISTS materiale_sportivo (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo           VARCHAR(120) NOT NULL,
  descrizione    TEXT,
  quantita       INTEGER NOT NULL DEFAULT 1 CHECK (quantita > 0),
  stato          materiale_richiesta_stato NOT NULL DEFAULT 'in_attesa',
  urgenza        materiale_urgenza NOT NULL DEFAULT 'media',
  richiedente    VARCHAR(160),
  data_richiesta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materiale_sportivo_club_data ON materiale_sportivo(club_id, data_richiesta DESC);
CREATE INDEX IF NOT EXISTS idx_materiale_sportivo_club_stato ON materiale_sportivo(club_id, stato);

CREATE TABLE IF NOT EXISTS messaggi (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  mittente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  titolo      VARCHAR(200) NOT NULL,
  corpo       TEXT NOT NULL,
  tipo        tipo_messaggio NOT NULL DEFAULT 'comunicazione',
  destinatari JSONB NOT NULL DEFAULT '[]',
  destinatari_ruolo JSONB,
  destinatari_utente_ids JSONB,
  thread_id   UUID,
  allegato_url TEXT,
  inviato_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messaggi_thread_id ON messaggi(thread_id);

CREATE TABLE IF NOT EXISTS messaggi_letture (
  messaggio_id UUID NOT NULL REFERENCES messaggi(id) ON DELETE CASCADE,
  utente_id    UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  letto_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (messaggio_id, utente_id)
);

CREATE TABLE IF NOT EXISTS stadio_configurazioni (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome            VARCHAR(180) NOT NULL,
  indirizzo       TEXT,
  capienza_totale INTEGER NOT NULL DEFAULT 0 CHECK (capienza_totale >= 0),
  updated_by      UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id)
);

CREATE TABLE IF NOT EXISTS stadio_settori (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  configurazione_id UUID NOT NULL REFERENCES stadio_configurazioni(id) ON DELETE CASCADE,
  nome             VARCHAR(120) NOT NULL,
  capienza         INTEGER NOT NULL CHECK (capienza >= 0),
  colore           VARCHAR(16) NOT NULL DEFAULT '#64748b',
  ordine           INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stadio_biglietteria_partita (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partita_id UUID NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
  settore_id UUID NOT NULL REFERENCES stadio_settori(id) ON DELETE CASCADE,
  prezzo     NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (prezzo >= 0),
  venduti    INTEGER NOT NULL DEFAULT 0 CHECK (venduti >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partita_id, settore_id)
);

CREATE INDEX IF NOT EXISTS idx_stadio_config_club ON stadio_configurazioni(club_id);
CREATE INDEX IF NOT EXISTS idx_stadio_settori_config_ordine ON stadio_settori(configurazione_id, ordine);
CREATE INDEX IF NOT EXISTS idx_stadio_biglietteria_club_partita ON stadio_biglietteria_partita(club_id, partita_id);

CREATE TABLE IF NOT EXISTS quote_iscrizione (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id   UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  stagione       VARCHAR(10) NOT NULL DEFAULT '2024-25',
  importo_totale NUMERIC(8,2) NOT NULL,
  importo_pagato NUMERIC(8,2) NOT NULL DEFAULT 0,
  stato          stato_quota NOT NULL DEFAULT 'non_pagato',
  scadenza       DATE,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(giocatore_id, club_id, stagione)
);

CREATE INDEX IF NOT EXISTS idx_quote_club ON quote_iscrizione(club_id, stagione, stato);

CREATE TABLE IF NOT EXISTS pagamenti (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quota_id          UUID NOT NULL REFERENCES quote_iscrizione(id) ON DELETE CASCADE,
  importo           NUMERIC(8,2) NOT NULL,
  metodo            metodo_pagamento NOT NULL DEFAULT 'contanti',
  data_pagamento    DATE NOT NULL DEFAULT CURRENT_DATE,
  stripe_payment_id VARCHAR(100),
  ricevuta_url      TEXT,
  registrato_da     UUID REFERENCES utenti(id),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prima_nota (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo          tipo_movimento NOT NULL,
  categoria     categoria_movimento NOT NULL DEFAULT 'altro',
  importo       NUMERIC(10,2) NOT NULL,
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione   VARCHAR(255) NOT NULL,
  controparte   VARCHAR(150),
  documento_url TEXT,
  registrato_da UUID REFERENCES utenti(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prima_nota_club ON prima_nota(club_id, data);

CREATE TABLE IF NOT EXISTS notifiche_sistema (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  tipo            tipo_notifica NOT NULL,
  riferimento_id  UUID,
  titolo          VARCHAR(200) NOT NULL,
  messaggio       TEXT NOT NULL,
  letta           BOOLEAN NOT NULL DEFAULT FALSE,
  azione_url      TEXT,
  creata_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifiche_utente ON notifiche_sistema(destinatario_id, letta, creata_at DESC);

-- ============================================================
-- FUNZIONI E TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clubs_updated_at ON clubs;
CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS utenti_updated_at ON utenti;
CREATE TRIGGER utenti_updated_at BEFORE UPDATE ON utenti FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS giocatori_updated_at ON giocatori;
CREATE TRIGGER giocatori_updated_at BEFORE UPDATE ON giocatori FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION sync_importo_pagato()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quote_iscrizione
  SET importo_pagato = (SELECT COALESCE(SUM(importo), 0) FROM pagamenti WHERE quota_id = NEW.quota_id),
  stato = CASE
    WHEN (SELECT COALESCE(SUM(importo),0) FROM pagamenti WHERE quota_id = NEW.quota_id) = 0 THEN 'non_pagato'::stato_quota
    WHEN (SELECT COALESCE(SUM(importo),0) FROM pagamenti WHERE quota_id = NEW.quota_id) >= importo_totale THEN 'pagato'::stato_quota
    ELSE 'parziale'::stato_quota
  END
  WHERE id = NEW.quota_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_pagamenti ON pagamenti;
CREATE TRIGGER sync_pagamenti AFTER INSERT OR UPDATE OR DELETE ON pagamenti FOR EACH ROW EXECUTE FUNCTION sync_importo_pagato();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE squadre ENABLE ROW LEVEL SECURITY;
ALTER TABLE giocatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE tesseramenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificati_medici ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratti ENABLE ROW LEVEL SECURITY;
ALTER TABLE famiglie ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessioni_allenamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenze ENABLE ROW LEVEL SECURITY;
ALTER TABLE partite ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistiche_partita ENABLE ROW LEVEL SECURITY;
ALTER TABLE valutazioni_tecniche ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_scouting ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiale_sportivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaggi ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_iscrizione ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE prima_nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifiche_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_configurazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_settori ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_biglietteria_partita ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION my_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM utenti WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION my_ruolo()
RETURNS ruolo_utente AS $$
  SELECT ruolo FROM utenti WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- DROP e ricrea le policy (evita errori di duplicato)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY club_isolation ON clubs FOR ALL USING (id = my_club_id());
CREATE POLICY club_isolation ON utenti FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON squadre FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON tesseramenti FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON certificati_medici FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON sessioni_allenamento FOR ALL USING (squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id()));
CREATE POLICY club_isolation ON presenze FOR ALL USING (
  sessione_id IN (SELECT sa.id FROM sessioni_allenamento sa JOIN squadre s ON sa.squadra_id = s.id WHERE s.club_id = my_club_id())
  OR club_id = my_club_id()
);
CREATE POLICY club_isolation ON partite FOR ALL USING (squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id()));
CREATE POLICY club_isolation ON materiale_sportivo FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON messaggi FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON stadio_configurazioni FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON stadio_settori FOR ALL USING (
  configurazione_id IN (SELECT id FROM stadio_configurazioni WHERE club_id = my_club_id())
);
CREATE POLICY club_isolation ON stadio_biglietteria_partita FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON quote_iscrizione FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON prima_nota FOR ALL USING (club_id = my_club_id());
CREATE POLICY club_isolation ON notifiche_sistema FOR ALL USING (club_id = my_club_id() AND destinatario_id = auth.uid());
CREATE POLICY contratti_restricted ON contratti FOR ALL USING (club_id = my_club_id() AND my_ruolo() IN ('ds','presidente'));
CREATE POLICY scouting_restricted ON report_scouting FOR ALL USING (club_richiedente_id = my_club_id() AND my_ruolo() IN ('osservatore','ds','presidente'));

-- Giocatori: visibili se tesserati nel club dell'utente
CREATE POLICY giocatori_club ON giocatori FOR ALL USING (
  id IN (SELECT giocatore_id FROM tesseramenti WHERE club_id = my_club_id())
);

-- Famiglie: visibili ai membri del club
CREATE POLICY famiglie_club ON famiglie FOR ALL USING (
  giocatore_id IN (SELECT giocatore_id FROM tesseramenti WHERE club_id = my_club_id())
);

-- Convocazioni
CREATE POLICY convocazioni_club ON convocazioni FOR ALL USING (
  partita_id IN (SELECT id FROM partite WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id()))
);

-- Statistiche partita
CREATE POLICY statistiche_club ON statistiche_partita FOR ALL USING (
  partita_id IN (SELECT id FROM partite WHERE squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id()))
);

-- Valutazioni tecniche
CREATE POLICY valutazioni_club ON valutazioni_tecniche FOR ALL USING (club_id = my_club_id());

-- Pagamenti
CREATE POLICY pagamenti_club ON pagamenti FOR ALL USING (
  quota_id IN (SELECT id FROM quote_iscrizione WHERE club_id = my_club_id())
);

-- ============================================================
-- DATI INIZIALI
-- ============================================================

INSERT INTO clubs (id, nome, categoria, citta, regione, piano_abbonamento)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'CIS Demo Club',
  'eccellenza',
  'Bari',
  'Puglia',
  'elite'
) ON CONFLICT (id) DO NOTHING;

-- NOTA: dopo aver creato l'utente in Supabase Auth,
-- esegui separatamente la query di inserimento in utenti
-- con l'UUID reale ottenuto da Authentication > Users

