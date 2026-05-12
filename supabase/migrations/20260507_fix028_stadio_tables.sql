-- FIX 028 — Tabelle stadio mancanti
--
-- stadio_configurazioni, stadio_settori e stadio_biglietteria_partita erano
-- definite in full_setup.sql ma non nelle migrations → non presenti nel DB.
-- PostgREST restituiva "could not find the table public.stadio_configurazione".

-- ── stadio_configurazioni ─────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_stadio_config_club
  ON stadio_configurazioni(club_id);

-- ── stadio_settori ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stadio_settori (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  configurazione_id UUID NOT NULL REFERENCES stadio_configurazioni(id) ON DELETE CASCADE,
  nome              VARCHAR(120) NOT NULL,
  capienza          INTEGER NOT NULL CHECK (capienza >= 0),
  colore            VARCHAR(16) NOT NULL DEFAULT '#64748b',
  ordine            INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stadio_settori_config_ordine
  ON stadio_settori(configurazione_id, ordine);

-- ── stadio_biglietteria_partita ───────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_stadio_biglietteria_club_partita
  ON stadio_biglietteria_partita(club_id, partita_id);

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE stadio_configurazioni       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_settori              ENABLE ROW LEVEL SECURITY;
ALTER TABLE stadio_biglietteria_partita ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON stadio_configurazioni;
  CREATE POLICY club_isolation ON stadio_configurazioni
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());

  DROP POLICY IF EXISTS club_isolation ON stadio_settori;
  CREATE POLICY club_isolation ON stadio_settori
    FOR ALL TO authenticated
    USING (
      configurazione_id IN (
        SELECT id FROM stadio_configurazioni WHERE club_id = my_club_id()
      ) OR is_super_admin()
    )
    WITH CHECK (
      configurazione_id IN (
        SELECT id FROM stadio_configurazioni WHERE club_id = my_club_id()
      ) OR is_super_admin()
    );

  DROP POLICY IF EXISTS club_isolation ON stadio_biglietteria_partita;
  CREATE POLICY club_isolation ON stadio_biglietteria_partita
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

-- ── GRANT ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON stadio_configurazioni       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stadio_settori              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stadio_biglietteria_partita TO authenticated;

NOTIFY pgrst, 'reload schema';
