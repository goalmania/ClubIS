-- FIX 057 — clubs_update_no_plan_change WITH CHECK auto-referenziale
-- Il WITH CHECK originale usava una subquery `SELECT FROM clubs WHERE id = clubs.id`
-- che poteva fallire con "new row violates row-level security policy" perché
-- in certi path RLS la sub-SELECT non riusciva a risolvere il valore OLD.
-- Soluzione: funzione SECURITY DEFINER che bypassa RLS per la lettura dei valori
-- protetti, e un WITH CHECK più robusto.

CREATE OR REPLACE FUNCTION clubs_plan_fields_unchanged(
  p_club_id    UUID,
  p_new_tier   TEXT,
  p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(plan_tier, 'starter') = COALESCE(p_new_tier, 'starter')
     AND COALESCE(plan_status, 'inactive') = COALESCE(p_new_status, 'inactive')
  FROM clubs
  WHERE id = p_club_id
$$;

-- Ricrea la policy usando la funzione SECURITY DEFINER
DROP POLICY IF EXISTS "clubs_update_no_plan_change" ON clubs;
CREATE POLICY "clubs_update_no_plan_change"
  ON clubs
  FOR UPDATE
  USING (
    id IN (SELECT club_id FROM utenti WHERE id = auth.uid())
  )
  WITH CHECK (
    clubs_plan_fields_unchanged(id, plan_tier, plan_status)
  );
