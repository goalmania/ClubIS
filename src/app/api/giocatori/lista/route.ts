import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/giocatori/lista
 * Restituisce tutti i tesseramenti attivi del club con dati giocatore e squadra.
 * Usa admin client + fallback squadra_id per leggere anche record con club_id NULL.
 */
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  const FIELDS = `
    id, numero_maglia, tipo, squadra_id, stato,
    giocatori ( id, nome, cognome, data_nascita, ruolo_principale, piede, nazionalita_tipo, foto_url ),
    squadre ( nome, categoria_eta )
  `

  // Recupera tutti i tesseramenti attivi del club, inclusi quelli senza squadra assegnata
  // (i giocatori importati da CSV hanno squadra_id = null finché non vengono assegnati)
  const { data: tesseramenti } = await admin
    .from('tesseramenti')
    .select(FIELDS)
    .eq('club_id', clubId)
    .eq('stato', 'attivo')

  return Response.json(tesseramenti ?? [])
}
