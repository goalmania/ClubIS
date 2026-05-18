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

  const FIELDS = 'numero_maglia, squadra_id, squadre(categoria_eta), giocatori(id, nome, cognome, ruolo_principale, data_nascita, nazionalita_paese, codice_tessera_figc)'

  if (sqIds.length > 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select(FIELDS)
      .in('squadra_id', sqIds)
      .eq('stato', 'attivo')
    rows = data
  }

  // Fallback: tutti i tesserati attivi del club
  if (!rows || rows.length === 0) {
    const { data } = await admin
      .from('tesseramenti')
      .select(FIELDS)
      .eq('club_id', clubId)
      .eq('stato', 'attivo')
    rows = data
  }

  // Deduplica per giocatore_id (tieni prima_squadra se duplicato)
  const seen = new Map<string, any>()
  for (const t of rows ?? []) {
    const g = (t as any).giocatori
    if (!g?.id) continue
    const cat = (t as any).squadre?.categoria_eta ?? null
    if (!seen.has(g.id)) {
      seen.set(g.id, { ...g, numero_maglia: (t as any).numero_maglia ?? null, categoria_eta: cat })
    }
  }
  const giocatori = Array.from(seen.values())
  giocatori.sort((a, b) => (a.cognome ?? '').localeCompare(b.cognome ?? '', 'it'))

  return Response.json(giocatori)
}
