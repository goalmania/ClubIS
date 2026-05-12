import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { SCADENZE_DEFAULT } from '@/lib/scadenze-figc'
import { NextRequest } from 'next/server'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()

  // Aggiorna automaticamente quelle scadute
  const oggi = new Date().toISOString().split('T')[0]
  await supabase
    .from('scadenze_figc')
    .update({ stato: 'scaduta' })
    .eq('club_id', ctx.clubId)
    .eq('stato', 'da_fare')
    .lt('data_scadenza', oggi)

  const { data } = await supabase
    .from('scadenze_figc')
    .select('*')
    .eq('club_id', ctx.clubId)
    .order('data_scadenza')

  return Response.json({ scadenze: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const supabase = createAdminClient()

  // Seed scadenze default
  if (body.seed) {
    const { count } = await supabase
      .from('scadenze_figc')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', ctx.clubId)

    if ((count ?? 0) > 0) {
      return Response.json({ msg: 'Scadenze già presenti', count })
    }

    const records = SCADENZE_DEFAULT.map(s => ({
      club_id: ctx.clubId,
      stato: 'da_fare',
      ...s,
    }))

    const { data, error } = await supabase
      .from('scadenze_figc')
      .insert(records)
      .select()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ creati: data?.length ?? 0 })
  }

  // Singola scadenza
  const { data, error } = await supabase
    .from('scadenze_figc')
    .insert({
      club_id: ctx.clubId,
      titolo: body.titolo,
      data_scadenza: body.data_scadenza,
      tipo: body.tipo ?? 'altro',
      importo_previsto: body.importo_previsto ?? null,
      stato: 'da_fare',
      note: body.note ?? null,
      link_riferimento: body.link_riferimento ?? null,
      alert_giorni_prima: body.alert_giorni_prima ?? 30,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ scadenza: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const supabase = createAdminClient()

  // Build update payload — only include defined fields
  const updates: Record<string, unknown> = {}
  if (body.stato !== undefined)             updates.stato = body.stato
  if (body.titolo !== undefined)            updates.titolo = body.titolo
  if (body.data_scadenza !== undefined)     updates.data_scadenza = body.data_scadenza
  if (body.tipo !== undefined)              updates.tipo = body.tipo
  if ('importo_previsto' in body)           updates.importo_previsto = body.importo_previsto ?? null
  if ('note' in body)                       updates.note = body.note ?? null
  if ('link_riferimento' in body)           updates.link_riferimento = body.link_riferimento ?? null
  if (body.alert_giorni_prima !== undefined) updates.alert_giorni_prima = body.alert_giorni_prima

  const { data, error } = await supabase
    .from('scadenze_figc')
    .update(updates)
    .eq('id', body.id)
    .eq('club_id', ctx.clubId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ scadenza: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'ID mancante' }, { status: 400 })

  const supabase = createAdminClient()
  await supabase.from('scadenze_figc').delete().eq('id', id).eq('club_id', ctx.clubId)
  return Response.json({ ok: true })
}
