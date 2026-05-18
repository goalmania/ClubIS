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

  const { data: squadreFiltrate } = await admin
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
    .in('categoria_eta', ['prima_squadra', 'juniores'])
  const squadraIds = (squadreFiltrate ?? []).map((s: any) => s.id)

  if (squadraIds.length === 0) return Response.json([], { status: 200 })

  const FIELDS = `
    id, numero_maglia, tipo, squadra_id, stato,
    giocatori ( id, nome, cognome, data_nascita, ruolo_principale, piede, nazionalita_tipo, foto_url ),
    squadre ( nome, categoria_eta )
  `

  const { data: tesseramenti } = await admin
    .from('tesseramenti')
    .select(FIELDS)
    .in('squadra_id', squadraIds)
    .eq('stato', 'attivo')

  return Response.json(tesseramenti ?? [])
}
