import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/giocatori/tutti
 * Restituisce id, nome, cognome di tutti i giocatori con tesseramento attivo nel club.
 * Usa adminClient e interroga per squadra_id (non club_id) per includere i giocatori
 * importati il cui record tesseramento ha club_id = NULL.
 */
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  // Prendi tutti gli id squadra attive del club
  const { data: squadre } = await admin
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
    .eq('attiva', true)

  const squadraIds = (squadre ?? []).map((s: any) => s.id)
  if (squadraIds.length === 0) return Response.json([], { status: 200 })

  // Tesseramenti attivi per quelle squadre (cattura anche record con club_id NULL)
  const { data: tess } = await admin
    .from('tesseramenti')
    .select('giocatore_id')
    .in('squadra_id', squadraIds)
    .eq('stato', 'attivo')

  const ids = Array.from(new Set((tess ?? []).map((t: any) => t.giocatore_id).filter(Boolean)))
  if (ids.length === 0) return Response.json([], { status: 200 })

  const { data: giocatori, error } = await admin
    .from('giocatori')
    .select('id, nome, cognome')
    .in('id', ids)
    .order('cognome')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(giocatori ?? [])
}
