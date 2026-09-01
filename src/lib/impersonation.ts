import { cookies } from 'next/headers'
import type { RuoloUtente } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveDeviceClub } from '@/lib/multi-club'

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

/**
 * Come readImpersonation(), ma verificato per userId. Il cookie è condiviso
 * per browser, non per utente: se sullo stesso browser un altro utente aveva
 * lasciato un'impersonation attiva (es. un super_admin), un nuovo login NON
 * deve ereditarla automaticamente.
 * - super_admin: fiducia totale (comportamento invariato, può impersonare
 *   qualsiasi club per design).
 * - account demo: il cookie viene onorato SOLO se il club appartiene
 *   davvero a questo utente (user_clubs.status='accepted'), altrimenti
 *   viene ignorato.
 */
export async function readVerifiedImpersonation(
  userId: string,
  isSuperAdmin: boolean,
  isDemoAccount: boolean,
): Promise<ImpersonationData | null> {
  if (!isSuperAdmin && !isDemoAccount) return null

  const impersonation = readImpersonation()
  if (!impersonation) return null
  if (isSuperAdmin) return impersonation

  const db = createAdminClient()
  const { data: membership } = await db
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('club_id', impersonation.clubId)
    .eq('status', 'accepted')
    .maybeSingle()

  return membership ? impersonation : null
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
    .select('club_id, ruolo, is_super_admin, is_demo_account, giocatore_figlio_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!utente) return null

  const impersonation = await readVerifiedImpersonation(user.id, !!utente.is_super_admin, !!utente.is_demo_account)

  // Per i super admin usa impersonation, altrimenti risolve il club per questo dispositivo.
  // resolveDeviceClub legge user_device_clubs (keyed by device cookie) e valida l'accesso;
  // se mancante o non autorizzato, fallback su utenti.club_id.
  let clubId: string = impersonation?.clubId
    ?? (utente.ruolo !== 'famiglia'
        ? await resolveDeviceClub(user.id, utente.club_id)
        : utente.club_id)

  // Mantieni utenti.club_id allineato al club del dispositivo corrente.
  // La funzione RLS my_club_id() legge utenti.club_id: se diverge dal club
  // risolto per questo dispositivo, le query client-side vengono bloccate.
  if (!impersonation && utente.ruolo !== 'famiglia' && clubId !== utente.club_id) {
    await db.from('utenti').update({ club_id: clubId }).eq('id', user.id)
  }

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
