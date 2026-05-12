import { createClient } from '@/lib/supabase/server'
import type { PlanTier } from '@/lib/features'

export async function getUtenteCorrente() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: utente } = await supabase
    .from('utenti')
    .select('id, club_id, nome, cognome, ruolo, squadre_ids')
    .eq('id', user.id)
    .single()
  return utente
}

export async function getClub(clubId: string) {
  const supabase = createClient()
  const { data } = await supabase.from('clubs').select('*').eq('id', clubId).single()
  return data
}

/**
 * Restituisce { clubId, plan } per l'utente autenticato corrente.
 * Usato nelle API routes per il controllo del piano.
 */
export async function getClubFromSession(): Promise<{ clubId: string; plan: PlanTier } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: utente } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!utente?.club_id) return null

  const { data: club } = await supabase
    .from('clubs')
    .select('plan_tier')
    .eq('id', utente.club_id)
    .maybeSingle()

  return {
    clubId: utente.club_id,
    plan: (club?.plan_tier ?? 'starter') as PlanTier,
  }
}
