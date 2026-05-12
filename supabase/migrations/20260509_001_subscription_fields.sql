-- ============================================================
-- FEATURE 001 — Campi abbonamento sulla tabella clubs
-- Aggiunge plan_tier, plan_status, stripe fields, onboarding fields
-- ============================================================

-- 1. Nuovi campi abbonamento
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS plan_tier         TEXT NOT NULL DEFAULT 'starter'
  CHECK (plan_tier IN ('starter', 'pro', 'elite'));

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS plan_status       TEXT NOT NULL DEFAULT 'inactive'
  CHECK (plan_status IN ('active', 'inactive', 'trial', 'expired'));

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS trial_ends_at     TIMESTAMPTZ;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- onboarding_completed (English alias, onboarding_completato già esiste)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN NOT NULL DEFAULT false;

-- onboarding_step (1-based, onboarding_step_corrente già esiste ma è 0-based)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS onboarding_step    INTEGER NOT NULL DEFAULT 1;

-- stripe_customer_id esiste già nello schema originale — nessuna azione


-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

-- Policy: il presidente del club può leggere i propri dati di abbonamento
-- (usa la funzione helper get_club_id() che già esiste o la query diretta)

DROP POLICY IF EXISTS "clubs_subscription_read_presidente" ON clubs;
CREATE POLICY "clubs_subscription_read_presidente"
  ON clubs
  FOR SELECT
  USING (
    id IN (
      SELECT club_id FROM utenti
       WHERE id = auth.uid()
         AND ruolo = 'presidente'
    )
    OR
    -- super admin può sempre leggere
    EXISTS (
      SELECT 1 FROM utenti
       WHERE id = auth.uid()
         AND is_super_admin = true
    )
  );

-- Policy UPDATE: utenti normali NON possono aggiornare plan_tier / plan_status
-- Questi campi sono gestiti solo dalla service_role (webhook Stripe / API admin).
-- Implementiamo tramite una policy che esclude esplicitamente tali colonne.
-- Supabase/Postgres non supporta column-level RLS nativo, quindi usiamo
-- una policy restrittiva per UPDATE che blocca se si tenta di cambiare
-- plan_tier o plan_status rispetto ai valori attuali.

DROP POLICY IF EXISTS "clubs_update_no_plan_change" ON clubs;
CREATE POLICY "clubs_update_no_plan_change"
  ON clubs
  FOR UPDATE
  USING (
    id IN (
      SELECT club_id FROM utenti WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    -- blocca se l'utente tenta di cambiare plan_tier o plan_status
    plan_tier   = (SELECT plan_tier   FROM clubs WHERE id = clubs.id)
    AND
    plan_status = (SELECT plan_status FROM clubs WHERE id = clubs.id)
  );

-- La service_role bypassa RLS per default → può aggiornare plan_tier/plan_status


-- ============================================================
-- 3. Indici per performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clubs_plan_status ON clubs(plan_status);
CREATE INDEX IF NOT EXISTS idx_clubs_plan_tier   ON clubs(plan_tier);
