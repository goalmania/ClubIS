-- Per-user, per-role interactive onboarding tracking

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL,
  completed_steps     TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  UNIQUE(user_id, role)
);

ALTER TABLE onboarding_progress DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS onboarding_progress_user_role ON onboarding_progress(user_id, role);
