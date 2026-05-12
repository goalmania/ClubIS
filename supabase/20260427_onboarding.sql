-- Feature 1: Onboarding guidato primo accesso

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS onboarding_completato    BOOLEAN DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS onboarding_step_corrente INT     DEFAULT 0;

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  step          INT  NOT NULL,
  completato    BOOLEAN DEFAULT false,
  completato_at TIMESTAMPTZ,
  UNIQUE(club_id, step)
);
ALTER TABLE onboarding_steps DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS onboarding_steps_club ON onboarding_steps(club_id);
