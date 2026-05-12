import { createClient } from '@/lib/supabase/server'
import { canAccess, requiredPlan, PLAN_LABEL, type Feature, type PlanTier } from '@/lib/features'
import LockedFeature from '@/components/LockedFeature'

async function getClubPlan(): Promise<PlanTier> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'starter'

    const { data: utente } = await supabase
      .from('utenti').select('club_id, is_super_admin').eq('id', user.id).maybeSingle()
    if (!utente?.club_id) return 'starter'

    if (utente.is_super_admin) return 'super_admin'

    const { data: club } = await supabase
      .from('clubs').select('plan_tier').eq('id', utente.club_id).maybeSingle()

    return (club?.plan_tier ?? 'starter') as PlanTier
  } catch {
    return 'starter'
  }
}

interface ServerFeatureGateProps {
  feature: Feature
  children: React.ReactNode
  featureLabel?: string
  fallback?: React.ReactNode
}

/**
 * Server-component equivalente di FeatureGate.
 * Usa per proteggere interi server components (pagine dashboard async).
 * Se il piano non è sufficiente mostra UpgradeBanner (o fallback personalizzato).
 */
export default async function ServerFeatureGate({
  feature,
  children,
  featureLabel,
  fallback,
}: ServerFeatureGateProps) {
  const plan = await getClubPlan()

  if (canAccess(feature, plan)) {
    return <>{children}</>
  }

  if (fallback !== undefined) {
    return <>{fallback}</>
  }

  const req = requiredPlan(feature)
  return (
    <LockedFeature requiredPlan={PLAN_LABEL[req]}>
      {children}
    </LockedFeature>
  )
}
