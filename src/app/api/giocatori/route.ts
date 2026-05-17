import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/giocatori
 * Restituisce i giocatori della prima squadra del club.
 * Fallback: se nessun giocatore nella prima squadra, restituisce tutti i tesserati attivi del club.
 */
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  // Prima squadra del club
  const { data: sqPS } = await admin
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
    .eq('categoria_eta', 'prima_squadra')
    .eq('attiva', true)
  const sqIds = (sqPS ?? []).map(s => s.id)

  let rows: any[] | null = null

  if (sqIds.length > 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select('giocatori(id, nome, cognome, ruolo_principale)')
      .in('squadra_id', sqIds)
      .eq('stato', 'attivo')
    rows = data
  }

  // Fallback: tutti i tesserati attivi del club
  if (!rows || rows.length === 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select('giocatori(id, nome, cognome, ruolo_principale)')
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    rows = data
  }

  // Deduplica per giocatore_id
  const seen = new Set<string>()
  const giocatori: any[] = []
  for (const t of rows ?? []) {
    const g = (t as any).giocatori
    if (g?.id && !seen.has(g.id)) {
      seen.add(g.id)
      giocatori.push(g)
    }
  }
  giocatori.sort((a, b) => (a.cognome ?? '').localeCompare(b.cognome ?? '', 'it'))

  return Response.json(giocatori)
}
