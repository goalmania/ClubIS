import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const db = createAdminClient()

  const { data, error } = await db
    .from('squalifiche')
    .select('id, giocatore_id, motivo, partite_restanti, giornate_squalifica, data_inizio, data_fine, comunicato_figc')
    .eq('club_id', ctx.clubId)
    .gt('partite_restanti', 0)
    .order('data_inizio', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Risolve i nomi dei giocatori separatamente per evitare problemi di FK/join
  const giocatoreIds = [...new Set((data ?? []).map((s: any) => s.giocatore_id).filter(Boolean))]
  let giocatoriMap: Record<string, { nome: string; cognome: string; numero_maglia: number | null }> = {}

  if (giocatoreIds.length > 0) {
    const { data: gData } = await db
      .from('giocatori')
      .select('id, nome, cognome')
      .in('id', giocatoreIds)

    // numero_maglia viene dai tesseramenti
    const { data: tessData } = await db
      .from('tesseramenti')
      .select('giocatore_id, numero_maglia')
      .eq('club_id', ctx.clubId)
      .eq('stato', 'attivo')
      .in('giocatore_id', giocatoreIds)

    const maglie: Record<string, number | null> = {}
    for (const t of tessData ?? []) maglie[t.giocatore_id] = t.numero_maglia ?? null

    for (const g of gData ?? []) {
      giocatoriMap[g.id] = { nome: g.nome, cognome: g.cognome, numero_maglia: maglie[g.id] ?? null }
    }
  }

  const result = (data ?? []).map((s: any) => ({
    ...s,
    giocatori: giocatoriMap[s.giocatore_id] ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { giocatore_id, motivo, giornate, data_inizio, data_fine, comunicato_figc } = body

  if (!giocatore_id || !data_inizio || !giornate) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data, error } = await db
    .from('squalifiche')
    .insert({
      club_id: ctx.clubId,
      giocatore_id,
      motivo: motivo || 'Squalifica manuale',
      partite_restanti: giornate,
      giornate_squalifica: giornate,
      data_inizio,
      data_fine: data_fine ?? null,
      comunicato_figc: comunicato_figc || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const db = createAdminClient()

  const { error } = await db
    .from('squalifiche')
    .update({ partite_restanti: 0 })
    .eq('id', id)
    .eq('club_id', ctx.clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
