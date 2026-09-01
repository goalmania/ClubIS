import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

// PATCH /api/tesseramenti/[id]
// Aggiorna squadra_id (e opzionalmente numero_maglia) di un tesseramento.
// Sicurezza: verifica che il tesseramento appartenga al club dell'utente.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  const body = await req.json()

  const admin = createAdminClient()

  // Verifica che il tesseramento appartenga al club
  const { data: tess } = await admin
    .from('tesseramenti')
    .select('id')
    .eq('id', params.id)
    .eq('club_id', clubId)
    .maybeSingle()

  if (!tess) return Response.json({ error: 'Tesseramento non trovato' }, { status: 404 })

  const STATI_VALIDI = ['attivo', 'sospeso', 'cessato']

  const aggiornamenti: Record<string, unknown> = {}
  if ('squadra_id' in body) aggiornamenti.squadra_id = body.squadra_id ?? null
  if ('numero_maglia' in body) aggiornamenti.numero_maglia = body.numero_maglia ?? null
  if ('stato' in body) {
    if (!STATI_VALIDI.includes(body.stato)) {
      return Response.json({ error: `Stato non valido. Valori ammessi: ${STATI_VALIDI.join(', ')}` }, { status: 400 })
    }
    aggiornamenti.stato = body.stato
  }

  const { error } = await admin
    .from('tesseramenti')
    .update(aggiornamenti)
    .eq('id', params.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
