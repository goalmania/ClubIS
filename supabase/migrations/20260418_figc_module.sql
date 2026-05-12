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
