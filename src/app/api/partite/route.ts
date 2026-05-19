import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  const { data: squadre } = await admin
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
  const sqIds = (squadre ?? []).map((s: any) => s.id)

  let partiteRows: any[] = []
  if (sqIds.length > 0) {
    const { data } = await admin
      .from('partite')
      .select('id, competizione, avversario, data_ora, casa_trasferta, squadra_id')
      .in('squadra_id', sqIds)
      .order('data_ora', { ascending: true })
      .limit(60)
    partiteRows = (data ?? []).map((p: any) => ({ ...p, source: 'partite' }))
  }

  const { data: eventiData } = await admin
    .from('eventi_calendario')
    .select('id, data_ora_inizio, luogo_testo, note')
    .eq('club_id', clubId)
    .eq('tipologia', 'partita')
    .order('data_ora_inizio', { ascending: true })
    .limit(60)

  const calendarioRows = (eventiData ?? []).map((e: any) => ({
    id: e.id,
    competizione: 'Calendario',
    avversario: e.luogo_testo || e.note || 'Partita',
    data_ora: e.data_ora_inizio,
    casa_trasferta: 'casa',
    squadra_id: null,
    source: 'calendario',
  }))

  const tutte = [...partiteRows, ...calendarioRows].sort(
    (a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime(),
  )

  return Response.json(tutte)
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const body  = await req.json()

  const { data, error } = await admin
    .from('partite')
    .insert({
      club_id:       clubId,
      squadra_id:    body.squadra_id,
      avversario:    body.avversario?.trim(),
      data_ora:      body.data_ora,
      campo:         body.campo?.trim() || null,
      tipo:          body.tipo ?? 'campionato',
      competizione:  body.competizione?.trim() || null,
      giornata:      body.giornata ? parseInt(body.giornata) : null,
      casa_trasferta:body.casa_trasferta ?? 'casa',
      stato:         'programmata',
    })
    .select('id').single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const body  = await req.json()
  const { id, ...payload } = body

  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  const { error } = await admin
    .from('partite')
    .update(payload)
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
