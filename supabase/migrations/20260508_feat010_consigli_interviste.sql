-- FEATURE 010: Nuova tabella consigli_interviste
-- Sostituisce domande_interviste con struttura completa:
--   destinatario_ruolo usa i valori di ruolo_utente (presidente, ds, team_manager, allenatore, giocatore)
--   destinatario_specifico_id: consiglio rivolto a persona specifica (opzionale)
--   priorita: 1=Alta, 2=Media, 3=Bassa
--   attivo: soft-delete flag

CREATE TABLE IF NOT EXISTS consigli_interviste (
  id                        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id                   UUID         NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  creato_da                 UUID         REFERENCES utenti(id) ON DELETE SET NULL,
  destinatario_ruolo        TEXT         NOT NULL
    CHECK (destinatario_ruolo IN ('presidente','ds','team_manager','allenatore','giocatore')),
  destinatario_specifico_id UUID         REFERENCES utenti(id) ON DELETE SET NULL,
  domanda                   TEXT         NOT NULL,
  consiglio_risposta        TEXT         NOT NULL,
  contesto                  TEXT         NOT NULL DEFAULT 'generale'
    CHECK (contesto IN ('pre_partita','post_partita','conferenza_stampa','mercato','generale','crisi_risultati','infortunio')),
  priorita                  INTEGER      NOT NULL DEFAULT 2 CHECK (priorita BETWEEN 1 AND 3),
  attivo                    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_club       ON consigli_interviste(club_id);
CREATE INDEX IF NOT EXISTS idx_ci_dest_ruolo ON consigli_interviste(club_id, destinatario_ruolo);
CREATE INDEX IF NOT EXISTS idx_ci_attivo     ON consigli_interviste(club_id, attivo);

-- Trigger updated_at (idempotente: usa CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ci_updated_at ON consigli_interviste;
CREATE TRIGGER trg_ci_updated_at
  BEFORE UPDATE ON consigli_interviste
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE consigli_interviste ENABLE ROW LEVEL SECURITY;

-- ufficio_stampa: CRUD completo sul proprio club
DROP POLICY IF EXISTS ci_stampa_all ON consigli_interviste;
CREATE POLICY ci_stampa_all ON consigli_interviste
  FOR ALL
  USING     (club_id = my_club_id() AND (my_ruolo()::text = 'ufficio_stampa' OR is_super_admin()))
  WITH CHECK(club_id = my_club_id() AND (my_ruolo()::text = 'ufficio_stampa' OR is_super_admin()));

-- destinatari: SELECT solo sui propri consigli attivi nel proprio club
DROP POLICY IF EXISTS ci_destinatario_select ON consigli_interviste;
CREATE POLICY ci_destinatario_select ON consigli_interviste
  FOR SELECT
  USING (
    club_id = my_club_id()
    AND attivo = TRUE
    AND destinatario_ruolo = my_ruolo()::text
    AND my_ruolo()::text IN ('presidente','ds','team_manager','allenatore','giocatore')
  );
