-- FIX 015 — Calendario Team Manager: tabelle mancanti
--
-- eventi_calendario, eventi_partecipanti ed eventi_allegati erano definite
-- solo in schema.sql / full_setup.sql, mai migrate nel DB di produzione.
-- Questo file le crea in modo idempotente con RLS e GRANT corretti.

-- ── ENUM types ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE tipologia_evento_calendario AS ENUM (
    'allenamento','partita','riunione','visita_medica','trasferta'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priorita_evento_calendario AS ENUM (
    'bassa','media','alta','urgente'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_partecipante_evento_calendario AS ENUM (
    'squadra','staff','giocatore'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabelle ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eventi_calendario (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipologia       tipologia_evento_calendario NOT NULL,
  data            DATE NOT NULL,
  data_ora_inizio TIMESTAMPTZ NOT NULL,
  data_ora_fine   TIMESTAMPTZ NOT NULL,
  luogo_testo     TEXT NOT NULL,
  luogo_lat       DOUBLE PRECISION,
  luogo_lng       DOUBLE PRECISION,
  priorita        priorita_evento_calendario NOT NULL,
  note            TEXT,
  creato_da       UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (data_ora_fine > data_ora_inizio)
);

CREATE INDEX IF NOT EXISTS idx_eventi_calendario_club_data_ora
  ON eventi_calendario(club_id, data_ora_inizio DESC);

CREATE TABLE IF NOT EXISTS eventi_partecipanti (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  evento_id         UUID NOT NULL REFERENCES eventi_calendario(id) ON DELETE CASCADE,
  tipo_partecipante tipo_partecipante_evento_calendario NOT NULL,
  squadra_id        UUID REFERENCES squadre(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES utenti(id) ON DELETE CASCADE,
  giocatore_id      UUID REFERENCES giocatori(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (tipo_partecipante = 'squadra'   AND squadra_id   IS NOT NULL AND staff_id IS NULL     AND giocatore_id IS NULL) OR
    (tipo_partecipante = 'staff'     AND staff_id     IS NOT NULL AND squadra_id IS NULL   AND giocatore_id IS NULL) OR
    (tipo_partecipante = 'giocatore' AND giocatore_id IS NOT NULL AND squadra_id IS NULL   AND staff_id IS NULL)
  ),
  UNIQUE(evento_id, tipo_partecipante, squadra_id),
  UNIQUE(evento_id, tipo_partecipante, staff_id),
  UNIQUE(evento_id, tipo_partecipante, giocatore_id)
);

CREATE INDEX IF NOT EXISTS idx_eventi_partecipanti_evento
  ON eventi_partecipanti(evento_id);

CREATE TABLE IF NOT EXISTS eventi_allegati (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  evento_id    UUID NOT NULL REFERENCES eventi_calendario(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  file_size    INTEGER,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventi_allegati_evento
  ON eventi_allegati(evento_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE eventi_calendario   ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventi_partecipanti ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventi_allegati     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON eventi_calendario;
  CREATE POLICY club_isolation ON eventi_calendario
    FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON eventi_partecipanti;
  CREATE POLICY club_isolation ON eventi_partecipanti
    FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON eventi_allegati;
  CREATE POLICY club_isolation ON eventi_allegati
    FOR ALL USING (club_id = my_club_id() OR is_super_admin());
END $$;

-- ── GRANT ─────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON eventi_calendario   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON eventi_partecipanti TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON eventi_allegati     TO authenticated;
