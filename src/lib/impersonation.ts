import { cookies } from 'next/headers'
import type { RuoloUtente } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const IMPERSONATION_COOKIE = 'cis-impersonate'

export type ImpersonationData = {
  clubId: string
  ruolo: RuoloUtente
  // giocatore_id opzionale per ruolo 'famiglia' (collegamento famiglia→giocatore)
  giocatoreId?: string
  // nome club per banner
  clubNome?: string
}

/**
 * Legge il cookie di impersonation server-side.
 * Ritorna null se assente o malformato.
 */
export function readImpersonation(): ImpersonationData | null {
  try {
    const raw = cookies().get(IMPERSONATION_COOKIE)?.value
    if (!raw) return null
    const decoded = JSON.parse(decodeURIComponent(raw))
    if (!decoded.clubId || !decoded.ruolo) return null
    return decoded as ImpersonationData
  } catch {
    return null
  }
}

export type UserContext = {
  userId: string
  clubId: string
  ruolo: RuoloUtente
  isSuperAdmin: boolean
  isImpersonating: boolean
  giocatoreId?: string
}

/**
 * Restituisce il contesto utente effettivo, risolvendo l'eventuale
 * impersonation attiva per un super admin. Le pagine del dashboard
 * dovrebbero usare questa funzione invece di query dirette alla
 * tabella `utenti` per ottenere club_id/ruolo.
 */
export async function getUserContext(): Promise<UserContext | null> {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: utente } = await db
    .from('utenti')
    .select('club_id, ruolo, is_super_admin, giocatore_figlio_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!utente) return null

  const impersonation = utente.is_super_admin ? readImpersonation() : null

  let clubId: string = impersonation?.clubId ?? utente.club_id
  let giocatoreId: string | undefined = impersonation?.giocatoreId ?? utente.giocatore_figlio_id ?? undefined

  // Se utente famiglia senza club_id o giocatore_figlio_id (registrato via link invito),
  // li ricaviamo dalla tabella famiglie → tesseramenti
  // NOTA: famiglie NON ha colonna club_id — serve passare per tesseramenti
  if (utente.ruolo === 'famiglia' && !impersonation && (!clubId || !giocatoreId)) {
    const { data: fam } = await db
      .from('famiglie')
      .select('giocatore_id')          // club_id non esiste in famiglie
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (fam?.giocatore_id) {
      if (!giocatoreId) giocatoreId = fam.giocatore_id

      // Cerca club_id dal tesseramento (attivo o più recente)
      if (!clubId) {
        const { data: tess } = await db
          .from('tesseramenti')
          .select('club_id')
          .eq('giocatore_id', fam.giocatore_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (tess?.club_id) clubId = tess.club_id
      }

      // Aggiorna utenti per evitare questo lookup ad ogni richiesta
      if (clubId || giocatoreId) {
        await db.from('utenti').update({
          ...(clubId      ? { club_id:             clubId }      : {}),
          ...(giocatoreId ? { giocatore_figlio_id: giocatoreId } : {}),
        }).eq('id', user.id)
      }
    }
  }

  return {
    userId: user.id,
    clubId,
    ruolo: (impersonation?.ruolo ?? utente.ruolo) as RuoloUtente,
    isSuperAdmin: !!utente.is_super_admin,
    isImpersonating: !!impersonation,
    giocatoreId,
  }
}
