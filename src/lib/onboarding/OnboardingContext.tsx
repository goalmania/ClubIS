'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ONBOARDING_STEPS, OnboardingStep } from './steps'

export type OnboardingPhase = 'problem' | 'guide'

interface OnboardingContextType {
  isActive: boolean
  currentStep: OnboardingStep | null
  currentStepIndex: number
  totalSteps: number
  phase: OnboardingPhase
  goToGuide: () => void
  nextStep: () => void
  skipStep: () => void
  skipAll: () => void
  confirmSkipAll: boolean
  setConfirmSkipAll: (v: boolean) => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({
  children,
  role,
}: {
  children: React.ReactNode
  role: string
}) {
  const supabase = createClient()
  const pathname = usePathname()
  const router = useRouter()

  const steps = ONBOARDING_STEPS[role] ?? []

  const [isActive, setIsActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<OnboardingPhase>('problem')
  const [userId, setUserId] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [confirmSkipAll, setConfirmSkipAll] = useState(false)

  useEffect(() => {
    if (!steps.length) return
    checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  async function checkStatus() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('onboarding_progress')
      .select('onboarding_completed, completed_steps')
      .eq('user_id', user.id)
      .eq('role', role)
      .maybeSingle()

    if (!data) {
      await supabase
        .from('onboarding_progress')
        .insert({ user_id: user.id, role })
      setIsActive(true)
      setStepIndex(0)
      setPhase('problem')
      return
    }

    if (data.onboarding_completed) return

    const done: string[] = data.completed_steps ?? []
    setCompletedSteps(done)
    const nextIdx = steps.findIndex((s) => !done.includes(s.id))
    if (nextIdx === -1) {
      await markCompleted(user.id)
      return
    }
    setStepIndex(nextIdx)
    setPhase('problem')
    setIsActive(true)
  }

  async function markCompleted(uid: string) {
    await supabase
      .from('onboarding_progress')
      .update({
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('user_id', uid)
      .eq('role', role)
    setIsActive(false)
  }

  async function saveStepComplete(stepId: string, newCompleted: string[]) {
    if (!userId) return
    await supabase
      .from('onboarding_progress')
      .update({ completed_steps: newCompleted })
      .eq('user_id', userId)
      .eq('role', role)
  }

  // When phase becomes 'guide', if we're not on the right route navigate there
  const goToGuide = useCallback(() => {
    const step = steps[stepIndex]
    if (!step) return
    setPhase('guide')
    if (pathname !== step.route) {
      router.push(step.route)
    }
  }, [steps, stepIndex, pathname, router])

  const nextStep = useCallback(async () => {
    const step = steps[stepIndex]
    if (!step) return

    const newCompleted = completedSteps.includes(step.id)
      ? completedSteps
      : [...completedSteps, step.id]
    setCompletedSteps(newCompleted)
    await saveStepComplete(step.id, newCompleted)

    const nextIdx = stepIndex + 1
    if (nextIdx >= steps.length) {
      if (userId) await markCompleted(userId)
      return
    }
    setStepIndex(nextIdx)
    setPhase('problem')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, stepIndex, completedSteps, userId])

  const skipStep = nextStep

  const skipAll = useCallback(async () => {
    if (userId) await markCompleted(userId)
    setConfirmSkipAll(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (!steps.length) return null

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep: steps[stepIndex] ?? null,
        currentStepIndex: stepIndex,
        totalSteps: steps.length,
        phase,
        goToGuide,
        nextStep,
        skipStep,
        skipAll,
        confirmSkipAll,
        setConfirmSkipAll,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider')
  return ctx
}
