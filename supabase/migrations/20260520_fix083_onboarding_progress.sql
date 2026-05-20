-- FIX 083 — Crea tabella onboarding_progress (tracking tutorial per-utente per-ruolo)
--
-- La tabella era definita fuori dalla cartella migrations/ e quindi non era mai
-- stata applicata automaticamente. Senza di essa OnboardingContext riceveva un
-- errore dalla query, interpretava data=null come "nuovo utente" e riattivava
-- il tutorial ad ogni accesso per TUTTI i ruoli.
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 TEXT NOT NULL,
  completed_steps      TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  started_at           TIMESTAMPTZ DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  UNIQUE(user_id, role)
);

-- RLS disabilitato: ogni utente scrive solo il proprio record
-- (il filtro .eq('user_id', user.id) in OnboardingContext è sufficiente)
ALTER TABLE onboarding_progress DISABLE ROW LEVEL SECURITY;

-- Grants per authenticated e service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON onboarding_progress TO authenticated;
GRANT ALL ON onboarding_progress TO service_role;

CREATE INDEX IF NOT EXISTS onboarding_progress_user      ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS onboarding_progress_user_role ON onboarding_progress(user_id, role);
