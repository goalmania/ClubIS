import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/giocatori/tutti
 * Restituisce id, nome, cognome, numero_maglia di tutti i giocatori con
 * tesseramento attivo nel club, indipendentemente dal metodo di inserimento
 * (manuale o importato) e dall'assegnazione squadra.
 * Filtra per club_id sul tesseramento invece che per squadra_id, in modo da
 * includere anche i giocatori importati che hanno squadra_id = NULL.
 */
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  console.log('CALENDARIO giocatori club_id usato:', clubId)
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  // Tutti i tesseramenti attivi del club — include giocatori con squadra_id NULL (importati)
  const { data: tess, error: tessErr } = await admin
    .from('tesseramenti')
    .select('giocatore_id, numero_maglia')
    .eq('club_id', clubId)
    .eq('stato', 'attivo')

  console.log('CALENDARIO tesseramenti trovati:', tess?.length ?? 0, tessErr)

  const rawIds = (tess ?? []).map((t: any) => t.giocatore_id).filter(Boolean)
  const ids = Array.from(new Set(rawIds))
  if (ids.length === 0) return Response.json([], { status: 200 })

  // Mappa giocatore_id → numero_maglia (primo tesseramento trovato)
  const magliaByCid = new Map<string, number | null>()
  for (const t of tess ?? []) {
    if (t.giocatore_id && !magliaByCid.has(t.giocatore_id)) {
      magliaByCid.set(t.giocatore_id, t.numero_maglia ?? null)
    }
  }

  const { data: giocatori, error } = await admin
    .from('giocatori')
    .select('id, nome, cognome')
    .in('id', ids)
    .order('cognome')

  console.log('CALENDARIO giocatori risultato query:', giocatori?.length ?? 0, error)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const result = (giocatori ?? []).map((g: any) => ({
    ...g,
    numero_maglia: magliaByCid.get(g.id) ?? null,
  }))

  return Response.json(result)
}
