-- FEATURE 003 + 004: Budget Stagionale — tetto, entrate previste, uscite previste

-- ── 1. budget_stagionale — tetto massimo per stagione ────────────────────────
CREATE TABLE IF NOT EXISTS budget_stagionale (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  stagione_riferimento   TEXT NOT NULL,            -- es. '2025/26'
  budget_totale_stagione NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_mercato         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- per FEATURE 006
  note_budget            TEXT,
  created_by             UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, stagione_riferimento)
);

-- ── 2. entrate_previste ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entrate_previste (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id              UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  stagione_riferimento TEXT NOT NULL,
  descrizione          TEXT NOT NULL,
  importo_previsto     NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria            TEXT NOT NULL CHECK (categoria IN (
                         'quote_iscrizioni','sponsor','contributi_federali',
                         'botteghino','altro')),
  mese_riferimento     SMALLINT CHECK (mese_riferimento BETWEEN 1 AND 12),
  note                 TEXT,
  created_by           UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrate_previste_club_stagione
  ON entrate_previste (club_id, stagione_riferimento);

-- ── 3. uscite_previste ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uscite_previste (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id              UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  stagione_riferimento TEXT NOT NULL,
  descrizione          TEXT NOT NULL,
  importo_previsto     NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria            TEXT NOT NULL CHECK (categoria IN (
                         'stipendi','rimborsi','attrezzatura','trasferte',
                         'utenze_impianto','altro')),
  mese_riferimento     SMALLINT CHECK (mese_riferimento BETWEEN 1 AND 12),
  note                 TEXT,
  created_by           UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uscite_previste_club_stagione
  ON uscite_previste (club_id, stagione_riferimento);

-- ── 4. RLS — budget_stagionale ───────────────────────────────────────────────
ALTER TABLE budget_stagionale ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budget_stagionale_select ON budget_stagionale;
CREATE POLICY budget_stagionale_select ON budget_stagionale
  FOR SELECT
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

DROP POLICY IF EXISTS budget_stagionale_insert ON budget_stagionale;
CREATE POLICY budget_stagionale_insert ON budget_stagionale
  FOR INSERT
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM utenti WHERE id = auth.uid() AND ruolo IN ('presidente')
    )
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

DROP POLICY IF EXISTS budget_stagionale_update ON budget_stagionale;
CREATE POLICY budget_stagionale_update ON budget_stagionale
  FOR UPDATE
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM utenti WHERE id = auth.uid() AND ruolo IN ('presidente')
    )
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ── 5. RLS — entrate_previste ────────────────────────────────────────────────
ALTER TABLE entrate_previste ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entrate_previste_select ON entrate_previste;
CREATE POLICY entrate_previste_select ON entrate_previste
  FOR SELECT
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

DROP POLICY IF EXISTS entrate_previste_write ON entrate_previste;
CREATE POLICY entrate_previste_write ON entrate_previste
  FOR ALL
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM utenti WHERE id = auth.uid() AND ruolo = 'presidente'
    )
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ── 6. RLS — uscite_previste ─────────────────────────────────────────────────
ALTER TABLE uscite_previste ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uscite_previste_select ON uscite_previste;
CREATE POLICY uscite_previste_select ON uscite_previste
  FOR SELECT
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

DROP POLICY IF EXISTS uscite_previste_write ON uscite_previste;
CREATE POLICY uscite_previste_write ON uscite_previste
  FOR ALL
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM utenti WHERE id = auth.uid() AND ruolo = 'presidente'
    )
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );
