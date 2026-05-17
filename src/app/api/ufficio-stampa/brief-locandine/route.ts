import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('brief_locandine')
    .select('*')
    .eq('club_id', ctx.clubId)
    .order('data_evento', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const RUOLI_BRIEF = ['ufficio_stampa', 'segretario', 'team_manager', 'presidente', 'ds']
  if (!RUOLI_BRIEF.includes(ctx.ruolo)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const body = await req.json()
  const {
    partita_id, evento_media_id, data_evento, titolo_evento,
    campo_impianto, ora_inizio, competizione,
    logo_home_url, logo_away_url, colori_preferiti, note_grafiche, stato,
  } = body

  if (!data_evento || !titolo_evento) {
    return NextResponse.json({ error: 'data_evento e titolo_evento sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase.from('brief_locandine').insert({
    club_id: ctx.clubId,
    partita_id: partita_id ?? null,
    evento_media_id: evento_media_id ?? null,
    data_evento,
    titolo_evento,
    campo_impianto,
    ora_inizio,
    competizione,
    logo_home_url,
    logo_away_url,
    colori_preferiti,
    note_grafiche,
    stato: stato ?? 'bozza',
    creato_da: ctx.userId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const { data, error } = await supabase
    .from('brief_locandine')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', ctx.clubId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (ctx.ruolo !== 'ufficio_stampa') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const { error } = await supabase.from('brief_locandine').delete().eq('id', id).eq('club_id', ctx.clubId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
