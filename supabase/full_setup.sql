-- ============================================================
-- CIS — Club Information System
-- Schema PostgreSQL completo con Row Level Security
-- Idempotente: può essere eseguito più volte senza errori
-- ============================================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMERATORI (idempotenti con DO block)
-- ============================================================

DO $$ BEGIN CREATE TYPE categoria_club AS ENUM (
  'serie_a','serie_b','serie_c','serie_d',
  'eccellenza','promozione','prima_categoria',
  'seconda_categoria','terza_categoria','scuola_calcio'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE piano_abbonamento AS ENUM ('base','pro','elite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ruolo_utente AS ENUM (
  'presidente','ds','segretario','allenatore',
  'osservatore','medico','famiglia'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE categoria_eta AS ENUM (
  'u6','u8','u10','u12','u14','u15','u16','u17','u19',
  'juniores','primavera','prima_squadra','femminile'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ruolo_campo AS ENUM (
  'portiere','difensore_centrale','terzino',
  'centrocampista_difensivo','centrocampista','trequartista',
  'ala','seconda_punta','centravanti'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE piede AS ENUM ('destro','sinistro','ambidestro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE nazionalita_tipo AS ENUM ('italiano','ue','extracomunitario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_tesseramento AS ENUM (
  'definitivo','prestito','in_prova','svincolo','compartecipazione'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE stato_tesseramento AS ENUM ('attivo','sospeso','cessato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_certificato AS ENUM ('agonistico','non_agonistico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_contratto_staff AS ENUM (
  'cococo','autonomo','dipendente','volontario'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_sessione AS ENUM (
  'tecnico','tattico','fisico','partitella','recupero','video'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE stato_sessione AS ENUM ('programmato','effettuato','annullato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE motivo_assenza AS ENUM (
  'infortunio','malattia','lavoro','squalifica',
  'non_giustificata','personale'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE stato_presenza_rapida AS ENUM (
  'presente','assente','giustificato'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE materiale_richiesta_stato AS ENUM (
  'in_attesa','approvata','consegnata','rifiutata'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE materiale_urgenza AS ENUM (
  'bassa','media','alta'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_partita AS ENUM ('campionato','coppa','amichevole','playoff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE casa_trasferta AS ENUM ('casa','trasferta','neutro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE stato_partita AS ENUM (
  'programmata','giocata','rinviata','annullata','sospesa'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE stato_convocazione AS ENUM (
  'in_attesa','confermato','indisponibile'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE potenziale_giocatore AS ENUM (
  'basso','medio','alto','eccezionale'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE esito_scouting AS ENUM (
  'in_valutazione','ingaggiato','rifiutato','archiviato','lista_attesa'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE stato_quota AS ENUM (
  'non_pagato','parziale','pagato','rimborsato','esonerato'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE metodo_pagamento AS ENUM (
  'contanti','bonifico','stripe','paypal','assegno'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_movimento AS ENUM ('entrata','uscita');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE categoria_movimento AS ENUM (
  'quote_iscrizione','sponsorizzazioni','proventi_gare',
  'stipendi','compensi_staff','trasferte','materiale_sportivo',
  'affitto_strutture','utenze','federazione','altro'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_notifica AS ENUM (
  'scadenza_certificato','scadenza_contratto','quota_arretrata',
  'convocazione','messaggio','alert_sistema','abbonamento_cis'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_messaggio AS ENUM (
  'avviso','comunicazione','convocazione','alert_tecnico'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipologia_evento_calendario AS ENUM (
  'allenamento','partita','riunione','visita_medica','trasferta'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE priorita_evento_calendario AS ENUM (
  'bassa','media','alta','urgente'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_partecipante_evento_calendario AS ENUM (
  'squadra','staff','giocatore'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABELLE CORE
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
  is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
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

-- ============================================================
-- GIOCATORI E ANAGRAFICA
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_giocatori_nome ON giocatori USING GIN (
  to_tsvector('italian', nome || ' ' || cognome)
);
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
  UNIQUE(giocatore_id, club_id, stagione, stato)
    DEFERRABLE INITIALLY DEFERRED
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
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id      UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  data_inizio       DATE NOT NULL,
  data_scadenza     DATE NOT NULL,
  ingaggio_mensile  NUMERIC(10,2),
  bonus_clausole    JSONB DEFAULT '{}',
  opzione_rinnovo   BOOLEAN DEFAULT FALSE,
  clausola_rescissione NUMERIC(12,2),
  documento_url     TEXT,
  note_private      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utente_id             UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  club_id               UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo_contratto        tipo_contratto_staff NOT NULL DEFAULT 'cococo',
  codice_fiscale        VARCHAR(16) NOT NULL,
  iban                  VARCHAR(34),
  compenso_mensile      NUMERIC(8,2),
  totale_annuo_erogato  NUMERIC(10,2) DEFAULT 0,
  data_inizio           DATE NOT NULL,
  data_fine             DATE,
  attivo                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ATTIVITÀ TECNICA
-- ============================================================

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

-- ============================================================
-- SCOUTING
-- ============================================================

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

-- ============================================================
-- COMUNICAZIONE
-- ============================================================

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
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  mittente_id   UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  titolo        VARCHAR(200) NOT NULL,
  corpo         TEXT NOT NULL,
  tipo          tipo_messaggio NOT NULL DEFAULT 'comunicazione',
  destinatari   JSONB NOT NULL DEFAULT '[]',
  destinatari_ruolo JSONB,
  destinatari_utente_ids JSONB,
  thread_id     UUID,
  allegato_url  TEXT,
  inviato_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messaggi_thread_id ON messaggi(thread_id);

CREATE TABLE IF NOT EXISTS messaggi_letture (
  messaggio_id  UUID NOT NULL REFERENCES messaggi(id) ON DELETE CASCADE,
  utente_id     UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  letto_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (messaggio_id, utente_id)
);

-- ============================================================
-- STADIO
-- ============================================================

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

-- ============================================================
-- QUOTE E FINANZE
-- ============================================================

CREATE TABLE IF NOT EXISTS quote_iscrizione (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giocatore_id     UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  stagione         VARCHAR(10) NOT NULL DEFAULT '2024-25',
  importo_totale   NUMERIC(8,2) NOT NULL,
  importo_pagato   NUMERIC(8,2) NOT NULL DEFAULT 0,
  stato            stato_quota NOT NULL DEFAULT 'non_pagato',
  scadenza         DATE,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(giocatore_id, club_id, stagione)
);

CREATE INDEX IF NOT EXISTS idx_quote_club ON quote_iscrizione(club_id, stagione, stato);

CREATE TABLE IF NOT EXISTS pagamenti (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quota_id           UUID NOT NULL REFERENCES quote_iscrizione(id) ON DELETE CASCADE,
  importo            NUMERIC(8,2) NOT NULL,
  metodo             metodo_pagamento NOT NULL DEFAULT 'contanti',
  data_pagamento     DATE NOT NULL DEFAULT CURRENT_DATE,
  stripe_payment_id  VARCHAR(100),
  ricevuta_url       TEXT,
  registrato_da      UUID REFERENCES utenti(id),
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prima_nota (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo            tipo_movimento NOT NULL,
  categoria       categoria_movimento NOT NULL DEFAULT 'altro',
  importo         NUMERIC(10,2) NOT NULL,
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione     VARCHAR(255) NOT NULL,
  controparte     VARCHAR(150),
  documento_url   TEXT,
  registrato_da   UUID REFERENCES utenti(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prima_nota_club ON prima_nota(club_id, data);

-- ============================================================
-- CALENDARIO TEAM MANAGER (CRUD)
-- ============================================================

CREATE TABLE IF NOT EXISTS eventi_calendario (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipologia           tipologia_evento_calendario NOT NULL,
  data                DATE NOT NULL,
  data_ora_inizio     TIMESTAMPTZ NOT NULL,
  data_ora_fine       TIMESTAMPTZ NOT NULL,
  luogo_testo         TEXT NOT NULL,
  luogo_lat           DOUBLE PRECISION,
  luogo_lng           DOUBLE PRECISION,
  priorita            priorita_evento_calendario NOT NULL,
  note                TEXT,
  creato_da           UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (data_ora_fine > data_ora_inizio)
);

CREATE INDEX IF NOT EXISTS idx_eventi_calendario_club_data_ora ON eventi_calendario(club_id, data_ora_inizio DESC);

CREATE TABLE IF NOT EXISTS eventi_partecipanti (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  evento_id          UUID NOT NULL REFERENCES eventi_calendario(id) ON DELETE CASCADE,
  tipo_partecipante  tipo_partecipante_evento_calendario NOT NULL,
  squadra_id         UUID REFERENCES squadre(id) ON DELETE CASCADE,
  staff_id           UUID REFERENCES utenti(id) ON DELETE CASCADE,
  giocatore_id      UUID REFERENCES giocatori(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (tipo_partecipante = 'squadra' AND squadra_id IS NOT NULL AND staff_id IS NULL AND giocatore_id IS NULL) OR
    (tipo_partecipante = 'staff' AND staff_id IS NOT NULL AND squadra_id IS NULL AND giocatore_id IS NULL) OR
    (tipo_partecipante = 'giocatore' AND giocatore_id IS NOT NULL AND squadra_id IS NULL AND staff_id IS NULL)
  ),
  UNIQUE(evento_id, tipo_partecipante, squadra_id),
  UNIQUE(evento_id, tipo_partecipante, staff_id),
  UNIQUE(evento_id, tipo_partecipante, giocatore_id)
);

CREATE INDEX IF NOT EXISTS idx_eventi_partecipanti_evento ON eventi_partecipanti(evento_id);

CREATE TABLE IF NOT EXISTS eventi_allegati (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  evento_id      UUID NOT NULL REFERENCES eventi_calendario(id) ON DELETE CASCADE,
  file_name      TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  file_size      INTEGER,
  storage_path   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventi_allegati_evento ON eventi_allegati(evento_id, created_at DESC);

-- ============================================================
-- CIS NOTIFICATION SYSTEM (preferenze + outbox + push)
-- ============================================================

DO $$ BEGIN CREATE TYPE cis_contesto_ruolo_notifiche AS ENUM (
  'presidente','segretario','team_manager','allenatore','medico','giocatore','famiglia'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE cis_canale_notifica AS ENUM ('push','email','notifica_interna'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE cis_frequenza_notifiche AS ENUM ('immediata','giornaliera','disattivata'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE cis_outbox_stato AS ENUM ('queued','sent','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS cis_notification_preferences (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utente_id               UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  contesto_ruolo          cis_contesto_ruolo_notifiche NOT NULL,
  canale_push_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  canale_email_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  canale_interna_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  frequenza_interna       cis_frequenza_notifiche NOT NULL DEFAULT 'immediata',
  frequenza_email         cis_frequenza_notifiche NOT NULL DEFAULT 'immediata',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(utente_id, contesto_ruolo)
);

CREATE INDEX IF NOT EXISTS idx_cis_prefs_utente ON cis_notification_preferences(utente_id, contesto_ruolo);

CREATE TABLE IF NOT EXISTS cis_notification_outbox (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  utente_id        UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  evento_id        UUID REFERENCES eventi_calendario(id) ON DELETE CASCADE,
  contesto_ruolo   cis_contesto_ruolo_notifiche NOT NULL,
  canale           cis_canale_notifica NOT NULL,
  priorita         priorita_evento_calendario NOT NULL,
  anticipo_min    INTEGER,
  send_at         TIMESTAMPTZ NOT NULL,
  titolo          VARCHAR(200) NOT NULL,
  messaggio       TEXT NOT NULL,
  azione_url      TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::JSONB,
  stato           cis_outbox_stato NOT NULL DEFAULT 'queued',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cis_outbox_due ON cis_notification_outbox(utente_id, stato, send_at);
CREATE INDEX IF NOT EXISTS idx_cis_outbox_evento ON cis_notification_outbox(evento_id);

CREATE TABLE IF NOT EXISTS cis_push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utente_id   UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(utente_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_cis_push_subs_utente ON cis_push_subscriptions(utente_id);

-- ============================================================
-- NOTIFICHE SISTEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS notifiche_sistema (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  destinatario_id  UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  tipo             tipo_notifica NOT NULL,
  riferimento_id   UUID,
  titolo           VARCHAR(200) NOT NULL,
  messaggio        TEXT NOT NULL,
  letta            BOOLEAN NOT NULL DEFAULT FALSE,
  azione_url       TEXT,
  creata_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifiche_utente ON notifiche_sistema(destinatario_id, letta, creata_at DESC);

-- ============================================================
-- FUNZIONI E TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clubs_updated_at ON clubs;
CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS utenti_updated_at ON utenti;
CREATE TRIGGER utenti_updated_at BEFORE UPDATE ON utenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS giocatori_updated_at ON giocatori;
CREATE TRIGGER giocatori_updated_at BEFORE UPDATE ON giocatori
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION sync_importo_pagato()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quote_iscrizione
  SET importo_pagato = (
    SELECT COALESCE(SUM(importo), 0)
    FROM pagamenti WHERE quota_id = COALESCE(NEW.quota_id, OLD.quota_id)
  ),
  stato = CASE
    WHEN (SELECT COALESCE(SUM(importo),0) FROM pagamenti WHERE quota_id = COALESCE(NEW.quota_id, OLD.quota_id)) = 0 THEN 'non_pagato'
    WHEN (SELECT COALESCE(SUM(importo),0) FROM pagamenti WHERE quota_id = COALESCE(NEW.quota_id, OLD.quota_id)) >= importo_totale THEN 'pagato'
    ELSE 'parziale'
  END
  WHERE id = COALESCE(NEW.quota_id, OLD.quota_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_pagamenti ON pagamenti;
CREATE TRIGGER sync_pagamenti AFTER INSERT OR UPDATE OR DELETE ON pagamenti
  FOR EACH ROW EXECUTE FUNCTION sync_importo_pagato();

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
ALTER TABLE eventi_calendario ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventi_partecipanti ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventi_allegati ENABLE ROW LEVEL SECURITY;
ALTER TABLE cis_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cis_notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE cis_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_configurazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_settori ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_biglietteria_partita ENABLE ROW LEVEL SECURITY;

-- Ensure club_id exists on all tables that need it (handles partial/old schema runs)
ALTER TABLE utenti                  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE utenti                  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE squadre                 ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE tesseramenti            ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE certificati_medici      ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE contratti               ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE collaboratori_staff     ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE presenze                ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE valutazioni_tecniche    ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE materiale_sportivo      ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE messaggi                ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE quote_iscrizione        ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE prima_nota              ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE notifiche_sistema       ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE eventi_calendario       ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE eventi_partecipanti     ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE eventi_allegati         ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE cis_notification_outbox ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE stadio_configurazioni   ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE stadio_biglietteria_partita ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

-- Helper: club_id dell'utente autenticato
CREATE OR REPLACE FUNCTION my_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM utenti WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: ruolo dell'utente autenticato
CREATE OR REPLACE FUNCTION my_ruolo()
RETURNS ruolo_utente AS $$
  SELECT ruolo FROM utenti WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is_super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_super_admin FROM utenti WHERE id = auth.uid()), FALSE)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Politiche (DROP IF EXISTS + CREATE)
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON clubs;
  CREATE POLICY club_isolation ON clubs FOR ALL USING (id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON utenti;
  CREATE POLICY club_isolation ON utenti FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON squadre;
  CREATE POLICY club_isolation ON squadre FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON tesseramenti;
  CREATE POLICY club_isolation ON tesseramenti FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON certificati_medici;
  CREATE POLICY club_isolation ON certificati_medici FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON sessioni_allenamento;
  CREATE POLICY club_isolation ON sessioni_allenamento FOR ALL USING (
    squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id()) OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON presenze;
  CREATE POLICY club_isolation ON presenze FOR ALL USING (
    (
      sessione_id IN (
        SELECT sa.id FROM sessioni_allenamento sa
        JOIN squadre s ON sa.squadra_id = s.id
        WHERE s.club_id = my_club_id()
      )
    )
    OR club_id = my_club_id()
    OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON materiale_sportivo;
  CREATE POLICY club_isolation ON materiale_sportivo FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON partite;
  CREATE POLICY club_isolation ON partite FOR ALL USING (
    squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id()) OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON messaggi;
  CREATE POLICY club_isolation ON messaggi FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON stadio_configurazioni;
  CREATE POLICY club_isolation ON stadio_configurazioni FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON stadio_settori;
  CREATE POLICY club_isolation ON stadio_settori FOR ALL USING (
    configurazione_id IN (
      SELECT id FROM stadio_configurazioni WHERE club_id = my_club_id()
    ) OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON stadio_biglietteria_partita;
  CREATE POLICY club_isolation ON stadio_biglietteria_partita FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON quote_iscrizione;
  CREATE POLICY club_isolation ON quote_iscrizione FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON prima_nota;
  CREATE POLICY club_isolation ON prima_nota FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON notifiche_sistema;
  CREATE POLICY club_isolation ON notifiche_sistema FOR ALL USING (
    (club_id = my_club_id() AND destinatario_id = auth.uid()) OR is_super_admin()
  );
END $$;

-- CIS notification preferences: owner-only
DO $$ BEGIN
  DROP POLICY IF EXISTS cis_prefs_owner ON cis_notification_preferences;
  CREATE POLICY cis_prefs_owner ON cis_notification_preferences
  FOR ALL USING (utente_id = auth.uid() OR is_super_admin());
END $$;

-- CIS push subscriptions: owner-only
DO $$ BEGIN
  DROP POLICY IF EXISTS cis_push_owner ON cis_push_subscriptions;
  CREATE POLICY cis_push_owner ON cis_push_subscriptions
  FOR ALL USING (utente_id = auth.uid() OR is_super_admin());
END $$;

-- CIS outbox:
-- - Insert for any user in club
-- - Read/update/delete only for the owning user
DO $$ BEGIN
  DROP POLICY IF EXISTS cis_outbox_select_own ON cis_notification_outbox;
  CREATE POLICY cis_outbox_select_own ON cis_notification_outbox
  FOR SELECT USING (utente_id = auth.uid() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cis_outbox_insert_club ON cis_notification_outbox;
  CREATE POLICY cis_outbox_insert_club ON cis_notification_outbox
  FOR INSERT WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cis_outbox_update_own ON cis_notification_outbox;
  CREATE POLICY cis_outbox_update_club ON cis_notification_outbox
  FOR UPDATE USING (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cis_outbox_delete_own ON cis_notification_outbox;
  CREATE POLICY cis_outbox_delete_club ON cis_notification_outbox
  FOR DELETE USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON eventi_calendario;
  CREATE POLICY club_isolation ON eventi_calendario FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON eventi_partecipanti;
  CREATE POLICY club_isolation ON eventi_partecipanti FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON eventi_allegati;
  CREATE POLICY club_isolation ON eventi_allegati FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS contratti_restricted ON contratti;
  CREATE POLICY contratti_restricted ON contratti FOR ALL USING (
    (club_id = my_club_id() AND my_ruolo() IN ('ds','presidente')) OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS scouting_restricted ON report_scouting;
  CREATE POLICY scouting_restricted ON report_scouting FOR ALL USING (
    (club_richiedente_id = my_club_id() AND my_ruolo() IN ('osservatore','ds','presidente')) OR is_super_admin()
  );
END $$;

-- Politiche per tabelle senza club_id diretto
DO $$ BEGIN
  DROP POLICY IF EXISTS giocatori_access ON giocatori;
  CREATE POLICY giocatori_access ON giocatori FOR ALL USING (
    id IN (SELECT giocatore_id FROM tesseramenti WHERE club_id = my_club_id())
    OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS giocatori_insert ON giocatori;
  CREATE POLICY giocatori_insert ON giocatori FOR INSERT WITH CHECK (TRUE);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS convocazioni_access ON convocazioni;
  CREATE POLICY convocazioni_access ON convocazioni FOR ALL USING (
    partita_id IN (
      SELECT p.id FROM partite p
      JOIN squadre s ON p.squadra_id = s.id
      WHERE s.club_id = my_club_id()
    ) OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS statistiche_access ON statistiche_partita;
  CREATE POLICY statistiche_access ON statistiche_partita FOR ALL USING (
    partita_id IN (
      SELECT p.id FROM partite p
      JOIN squadre s ON p.squadra_id = s.id
      WHERE s.club_id = my_club_id()
    ) OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS valutazioni_access ON valutazioni_tecniche;
  CREATE POLICY valutazioni_access ON valutazioni_tecniche FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS famiglie_access ON famiglie;
  CREATE POLICY famiglie_access ON famiglie FOR ALL USING (
    giocatore_id IN (SELECT giocatore_id FROM tesseramenti WHERE club_id = my_club_id())
    OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS pagamenti_access ON pagamenti;
  CREATE POLICY pagamenti_access ON pagamenti FOR ALL USING (
    quota_id IN (SELECT id FROM quote_iscrizione WHERE club_id = my_club_id())
    OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS messaggi_letture_access ON messaggi_letture;
  CREATE POLICY messaggi_letture_access ON messaggi_letture FOR ALL USING (
    utente_id = auth.uid() OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS collaboratori_access ON collaboratori_staff;
  CREATE POLICY collaboratori_access ON collaboratori_staff FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;
-- Team Manager end-to-end alignment
-- Materiale, Distinta/Comunicazioni threads, Presenze rapide

-- 1) Tipi enum per richieste materiale
DO $$ BEGIN
  CREATE TYPE materiale_richiesta_stato AS ENUM ('in_attesa', 'approvata', 'consegnata', 'rifiutata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE materiale_urgenza AS ENUM ('bassa', 'media', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabella materiale_sportivo (se non presente)
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

ALTER TABLE materiale_sportivo ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON materiale_sportivo;
  CREATE POLICY club_isolation ON materiale_sportivo
  FOR ALL
  USING (club_id = my_club_id() OR is_super_admin());
END $$;

-- 3) Estensioni tabella messaggi per thread/destinatari multipli
ALTER TABLE messaggi
  ADD COLUMN IF NOT EXISTS thread_id UUID,
  ADD COLUMN IF NOT EXISTS destinatari_ruolo JSONB,
  ADD COLUMN IF NOT EXISTS destinatari_utente_ids JSONB;

CREATE INDEX IF NOT EXISTS idx_messaggi_thread_id ON messaggi(thread_id);

-- 4) Estensioni tabella presenze per form rapido team manager
-- Manteniamo compatibilita' con il flusso esistente e aggiungiamo i campi necessari
DO $$ BEGIN
  CREATE TYPE stato_presenza_rapida AS ENUM ('presente', 'assente', 'giustificato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE presenze
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES utenti(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS data DATE,
  ADD COLUMN IF NOT EXISTS stato stato_presenza_rapida;

-- Per supportare righe "rapide" senza sessione o senza giocatore
ALTER TABLE presenze ALTER COLUMN sessione_id DROP NOT NULL;
ALTER TABLE presenze ALTER COLUMN giocatore_id DROP NOT NULL;

-- Vincoli di coerenza: almeno un riferimento (giocatore o staff)
DO $$ BEGIN
  ALTER TABLE presenze
    ADD CONSTRAINT presenze_target_check
    CHECK (giocatore_id IS NOT NULL OR staff_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Se manca sessione_id, devono essere valorizzati campi rapidi minimi
DO $$ BEGIN
  ALTER TABLE presenze
    ADD CONSTRAINT presenze_rapide_check
    CHECK (
      sessione_id IS NOT NULL
      OR (club_id IS NOT NULL AND data IS NOT NULL AND stato IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unicita' su sessione/giocatore quando presenti (partial unique indexes)
DROP INDEX IF EXISTS presenze_sessione_id_giocatore_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_presenze_sessione_giocatore
  ON presenze(sessione_id, giocatore_id)
  WHERE sessione_id IS NOT NULL AND giocatore_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presenze_rapide_club_data ON presenze(club_id, data DESC);

-- RLS presenze aggiornata: righe sessione OR righe rapide club
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON presenze;
  CREATE POLICY club_isolation ON presenze
  FOR ALL
  USING (
    (
      sessione_id IN (
        SELECT sa.id
        FROM sessioni_allenamento sa
        JOIN squadre s ON sa.squadra_id = s.id
        WHERE s.club_id = my_club_id()
      )
    )
    OR club_id = my_club_id()
    OR is_super_admin()
  );
END $$;
-- Modulo Stadio
-- Accesso previsto per presidente, segretario, team_manager (controllato lato app).

CREATE TABLE IF NOT EXISTS stadio_configurazioni (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome           VARCHAR(180) NOT NULL,
  indirizzo      TEXT,
  capienza_totale INTEGER NOT NULL DEFAULT 0 CHECK (capienza_totale >= 0),
  updated_by     UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partita_id  UUID NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
  settore_id  UUID NOT NULL REFERENCES stadio_settori(id) ON DELETE CASCADE,
  prezzo      NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (prezzo >= 0),
  venduti     INTEGER NOT NULL DEFAULT 0 CHECK (venduti >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partita_id, settore_id)
);

CREATE INDEX IF NOT EXISTS idx_stadio_config_club ON stadio_configurazioni(club_id);
CREATE INDEX IF NOT EXISTS idx_stadio_settori_config_ordine ON stadio_settori(configurazione_id, ordine);
CREATE INDEX IF NOT EXISTS idx_stadio_biglietteria_club_partita ON stadio_biglietteria_partita(club_id, partita_id);

ALTER TABLE stadio_configurazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_settori ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_biglietteria_partita ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON stadio_configurazioni;
  CREATE POLICY club_isolation ON stadio_configurazioni
  FOR ALL
  USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON stadio_settori;
  CREATE POLICY club_isolation ON stadio_settori
  FOR ALL
  USING (
    configurazione_id IN (
      SELECT id FROM stadio_configurazioni WHERE club_id = my_club_id()
    )
    OR is_super_admin()
  );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON stadio_biglietteria_partita;
  CREATE POLICY club_isolation ON stadio_biglietteria_partita
  FOR ALL
  USING (club_id = my_club_id() OR is_super_admin());
END $$;
-- FIGC Module
-- 1. Track import source on partite
ALTER TABLE partite ADD COLUMN IF NOT EXISTS fonte TEXT;

-- 2. FIGC player card number on giocatori
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS codice_tessera_figc VARCHAR(20);

-- 3. Log of generated FIGC forms
CREATE TABLE IF NOT EXISTS figc_moduli_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo_modulo   VARCHAR(60) NOT NULL,   -- referto_infortuni | richiesta_svincolo | distinta_ufficiale
  giocatore_id  UUID REFERENCES giocatori(id) ON DELETE SET NULL,
  dati          JSONB NOT NULL DEFAULT '{}',
  creato_da     UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_figc_moduli_log_club
  ON figc_moduli_log(club_id, created_at DESC);

ALTER TABLE figc_moduli_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON figc_moduli_log;
  CREATE POLICY club_isolation ON figc_moduli_log
    FOR ALL USING (
      club_id = my_club_id()
      OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
    );
END $$;
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
