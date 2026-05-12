'use client'
import OnboardingBanner from './OnboardingBanner'

interface OnboardingWrapperProps {
  clubId: string
  ruolo:  string
  mostra: boolean
}

export default function OnboardingWrapper({ clubId, ruolo, mostra }: OnboardingWrapperProps) {
  if (!mostra || ruolo !== 'presidente') return null
  return <OnboardingBanner clubId={clubId} />
}
