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
