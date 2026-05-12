'use client'
import type { Feature } from '@/lib/features'
import { canAccess, requiredPlan, PLAN_LABEL } from '@/lib/features'
import { useClubPlan } from '@/lib/club-context'
import LockedFeature from '@/components/LockedFeature'

interface FeatureGateProps {
  feature: Feature
  children: React.ReactNode
  fallback?: React.ReactNode
  featureLabel?: string
}

export default function FeatureGate({
  feature,
  children,
  fallback,
}: FeatureGateProps) {
  const plan = useClubPlan()

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
