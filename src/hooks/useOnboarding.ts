'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const STEPS_ONBOARDING = [
  {
    step: 1,
    titolo: 'Benvenuto in ClubIS',
    descrizione: 'Inizia configurando le informazioni del tuo club',
    azione: 'Configura club →',
    href: '/dashboard/presidente/club',
    icona: '🏛',
    categoria: 'setup',
  },
  {
    step: 2,
    titolo: 'Aggiungi i tuoi giocatori',
    descrizione: 'Importa la rosa o aggiungi i giocatori manualmente',
    azione: 'Vai ai giocatori →',
    href: '/dashboard/segretario/giocatori',
    icona: '⚽',
    categoria: 'giocatori',
  },
  {
    step: 3,
    titolo: 'Crea i gruppi squadra',
    descrizione: 'Organizza i giocatori per squadra o categoria',
    azione: 'Gestisci gruppi →',
    href: '/dashboard/segretario/gruppi',
    icona: '👥',
    categoria: 'struttura',
  },
  {
    step: 4,
    titolo: 'Configura i pagamenti',
    descrizione: 'Imposta le quote di iscrizione e i piani di pagamento',
    azione: 'Imposta pagamenti →',
    href: '/dashboard/segretario/pagamenti',
    icona: '💰',
    categoria: 'pagamenti',
  },
  {
    step: 5,
    titolo: 'Invita il tuo staff',
    descrizione: 'Genera i link di invito per segretario, allenatore, DS e altri',
    azione: 'Genera link invito →',
    href: '/dashboard/presidente/inviti',
    icona: '✉',
    categoria: 'team',
  },
  {
    step: 6,
    titolo: 'Carica il comunicato FIGC',
    descrizione: 'Tieni traccia automatica di squalifiche e ammende',
    azione: 'Vai ai comunicati →',
    href: '/dashboard/segretario/figc/comunicati',
    icona: '📋',
    categoria: 'figc',
  },
  {
    step: 7,
    titolo: 'Genera il primo documento',
    descrizione: 'Prova la libreria documenti con ricevute e dichiarazioni',
    azione: 'Prova documenti →',
    href: '/dashboard/segretario/documenti',
    icona: '📄',
    categoria: 'documenti',
  },
] as const

export type OnboardingStep = (typeof STEPS_ONBOARDING)[number]

export function useOnboarding(clubId: string) {
  const [stepsCompletati,      setStepsCompletati]      = useState<number[]>([])
  const [onboardingCompletato, setOnboardingCompletato] = useState(false)
  const [loading,              setLoading]              = useState(true)

  useEffect(() => {
    if (!clubId) return
    let mounted = true

    async function load() {
      const supabase = createClient()

      const [{ data: club }, { data: steps }] = await Promise.all([
        supabase.from('clubs')
          .select('onboarding_completato')
          .eq('id', clubId)
          .single(),
        supabase.from('onboarding_steps')
          .select('step')
          .eq('club_id', clubId)
          .eq('completato', true),
      ])

      if (!mounted) return

      const completati = steps?.map((s: any) => s.step as number) ?? []
      const tuttiCompletati = completati.length >= STEPS_ONBOARDING.length
      const flagCompletato  = club?.onboarding_completato ?? false

      // Allinea il flag DB se tutti gli step risultano già completati
      if (tuttiCompletati && !flagCompletato) {
        supabase.from('clubs').update({ onboarding_completato: true }).eq('id', clubId)
      }

      setOnboardingCompletato(flagCompletato || tuttiCompletati)
      setStepsCompletati(completati)
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [clubId])

  const completaStep = async (step: number) => {
    const supabase = createClient()

    await supabase.from('onboarding_steps').upsert(
      {
        club_id:       clubId,
        step,
        completato:    true,
        completato_at: new Date().toISOString(),
      },
      { onConflict: 'club_id,step' },
    )

    const nuoviCompletati = [...stepsCompletati.filter(s => s !== step), step]
    setStepsCompletati(nuoviCompletati)

    // Se tutti gli step sono completati → segna onboarding come fatto
    if (nuoviCompletati.length >= STEPS_ONBOARDING.length) {
      await supabase.from('clubs')
        .update({ onboarding_completato: true })
        .eq('id', clubId)
      setOnboardingCompletato(true)
    }
  }

  return { stepsCompletati, onboardingCompletato, completaStep, loading }
}
