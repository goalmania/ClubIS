-- ============================================================
-- MIGRATION 004 — Tabella trial_registrations
-- Traccia chi ha già usato la prova gratuita per email.
-- Una sola prova per email, per sempre.
-- ============================================================

CREATE TABLE IF NOT EXISTS trial_registrations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  product     TEXT        NOT NULL CHECK (product IN ('clubis', 'dmscout', 'both')),
  club_id     UUID        REFERENCES clubs(id) ON DELETE SET NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_registrations_email ON trial_registrations(email);

-- Solo la service_role può leggere/scrivere questa tabella
ALTER TABLE trial_registrations ENABLE ROW LEVEL SECURITY;

-- Nessun utente autenticato può accedere: solo il backend (service_role bypassa RLS)
CREATE POLICY "trial_reg_deny_all" ON trial_registrations
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

-- Grant alla service_role (necessario esplicitamente in alcuni setup)
GRANT ALL ON trial_registrations TO service_role;
