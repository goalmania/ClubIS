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

const NOOP_CTX: OnboardingContextType = {
  isActive: false,
  currentStep: null,
  currentStepIndex: 0,
  totalSteps: 0,
  phase: 'problem',
  goToGuide: () => {},
  nextStep: () => {},
  skipStep: () => {},
  skipAll: () => {},
  confirmSkipAll: false,
  setConfirmSkipAll: () => {},
}

const OnboardingContext = createContext<OnboardingContextType>(NOOP_CTX)

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

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('onboarding_completed, completed_steps')
      .eq('user_id', user.id)
      .eq('role', role)
      .maybeSingle()

    console.log('[OnboardingContext] checkStatus — user:', user.id, 'role:', role, 'data:', data, 'error:', error)

    // Se c'è un errore DB (tabella non esiste, permessi, ecc.) NON attivare il tutorial
    if (error) {
      console.warn('[OnboardingContext] Errore query onboarding_progress, tutorial disattivato:', error.message)
      return
    }

    if (!data) {
      // Nessun record: primo accesso — inserisco e attivo il tutorial
      console.log('[OnboardingContext] Primo accesso, inserisco record e attivo tutorial')
      const { error: insertError } = await supabase
        .from('onboarding_progress')
        .insert({ user_id: user.id, role })

      if (insertError) {
        console.warn('[OnboardingContext] Errore insert onboarding_progress, tutorial disattivato:', insertError.message)
        return
      }

      setIsActive(true)
      setStepIndex(0)
      setPhase('problem')
      return
    }

    if (data.onboarding_completed) {
      console.log('[OnboardingContext] onboarding_completed = true, tutorial disattivato')
      return
    }

    const done: string[] = data.completed_steps ?? []
    setCompletedSteps(done)
    const nextIdx = steps.findIndex((s) => !done.includes(s.id))
    console.log('[OnboardingContext] completed_steps:', done, 'nextIdx:', nextIdx)
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
  return useContext(OnboardingContext)
}
