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

  const { data: squadreClub } = await admin
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
  const squadraIds = (squadreClub ?? []).map((s: any) => s.id)

  const FIELDS = `
    id, numero_maglia, tipo, squadra_id, stato,
    giocatori ( id, nome, cognome, data_nascita, ruolo_principale, piede, nazionalita_tipo, foto_url ),
    squadre ( nome, categoria_eta )
  `

  const baseQuery = admin
    .from('tesseramenti')
    .select(FIELDS)
    .eq('stato', 'attivo')

  const { data: tesseramenti } = squadraIds.length > 0
    ? await baseQuery.or(`club_id.eq.${clubId},squadra_id.in.(${squadraIds.join(',')})`)
    : await baseQuery.eq('club_id', clubId)

  return Response.json(tesseramenti ?? [])
}
