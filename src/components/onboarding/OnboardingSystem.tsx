'use client'

import { OnboardingProvider } from '@/lib/onboarding/OnboardingContext'
import OnboardingTooltip from './OnboardingTooltip'

export default function OnboardingSystem({ role }: { role: string }) {
  return (
    <OnboardingProvider role={role}>
      <OnboardingTooltip />
    </OnboardingProvider>
  )
}
