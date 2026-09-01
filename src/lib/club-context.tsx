'use client'
import { createContext, useContext } from 'react'
import type { PlanTier, TipoProdotto } from '@/lib/features'

type ClubPlanContextValue = {
  planTier: PlanTier
  categoria: string
  genere: string
  clubId: string | null
  tipoProdotto: TipoProdotto
}

const ClubPlanContext = createContext<ClubPlanContextValue>({ planTier: 'starter', categoria: 'eccellenza', genere: 'maschile', clubId: null, tipoProdotto: 'club_agonistico' })

export function ClubPlanProvider({
  planTier,
  categoria = 'eccellenza',
  genere = 'maschile',
  clubId = null,
  tipoProdotto = 'club_agonistico',
  children,
}: {
  planTier: PlanTier
  categoria?: string
  genere?: string
  clubId?: string | null
  tipoProdotto?: TipoProdotto
  children: React.ReactNode
}) {
  return (
    <ClubPlanContext.Provider value={{ planTier, categoria, genere, clubId, tipoProdotto }}>
      {children}
    </ClubPlanContext.Provider>
  )
}

export function useClubPlan(): PlanTier {
  return useContext(ClubPlanContext).planTier
}

export function useTipoProdotto(): TipoProdotto {
  return useContext(ClubPlanContext).tipoProdotto
}

export function useClubCategoria(): string {
  return useContext(ClubPlanContext).categoria
}

export function useClubGenere(): string {
  return useContext(ClubPlanContext).genere
}

// Club effettivo della richiesta corrente: rispetta l'impersonation del
// super admin e la risoluzione per-dispositivo (vedi effectiveClubId in
// src/app/dashboard/layout.tsx). Da preferire a una query diretta su
// utenti.club_id nei componenti client, che ignorerebbe l'impersonation.
export function useClubId(): string | null {
  return useContext(ClubPlanContext).clubId
}
