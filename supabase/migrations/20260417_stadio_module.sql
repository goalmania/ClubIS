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
