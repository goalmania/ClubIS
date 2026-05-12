'use client'
import { createContext, useContext } from 'react'
import type { PlanTier } from '@/lib/features'

type ClubPlanContextValue = {
  planTier: PlanTier
}

const ClubPlanContext = createContext<ClubPlanContextValue>({ planTier: 'starter' })

export function ClubPlanProvider({
  planTier,
  children,
}: {
  planTier: PlanTier
  children: React.ReactNode
}) {
  return (
    <ClubPlanContext.Provider value={{ planTier }}>
      {children}
    </ClubPlanContext.Provider>
  )
}

export function useClubPlan(): PlanTier {
  return useContext(ClubPlanContext).planTier
}
