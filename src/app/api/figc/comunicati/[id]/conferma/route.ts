import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente?.club_id) return NextResponse.json({ error: 'Club non trovato' }, { status: 403 })

  const body = await req.json() as {
    giocatore_id: string
    tipo_sanzione: string
    durata: string
    data_inizio: string
    comunicato_ref: string | null
  }

  if (!body.giocatore_id || !body.data_inizio) {
    return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 })
  }

  const clubId = utente.club_id

  // Calcola n° giornate dal campo durata (es. "2 giornate")
  const match = body.durata.match(/(\d+)/)
  const nGiornate = match ? parseInt(match[1], 10) : 1

  // Calcola data_fine: cerca le prossime N partite
  const { data: squadre } = await supabase
    .from('squadre').select('id').eq('club_id', clubId)
  const squadreIds = (squadre ?? []).map((s: any) => s.id)

  let dataFine: string | null = null
  if (squadreIds.length && nGiornate > 0) {
    const { data: partite } = await supabase
      .from('partite')
      .select('data_ora')
      .in('squadra_id', squadreIds)
      .gt('data_ora', `${body.data_inizio}T23:59:59`)
      .order('data_ora')
      .limit(nGiornate)

    if (partite && partite.length >= nGiornate) {
      dataFine = partite[nGiornate - 1].data_ora.split('T')[0]
    }
  }

  // Inserisce in tabella squalifiche (quella esistente, usata dall'allenatore)
  const { error: sqErr } = await supabase.from('squalifiche').insert({
    club_id: clubId,
    giocatore_id: body.giocatore_id,
    motivo: `${body.tipo_sanzione} — ${body.durata}`,
    partite_restanti: nGiornate,
    giornate_squalifica: nGiornate,
    giornate_rimanenti: nGiornate,
    data_inizio: body.data_inizio,
    data_fine: dataFine,
    comunicato_figc: body.comunicato_ref,
  })

  if (sqErr) return NextResponse.json({ error: sqErr.message }, { status: 500 })

  // Marca la squalifica_comunicato come confermata
  await supabase.from('squalifiche_comunicato')
    .update({ confermato: true, giocatore_id: body.giocatore_id })
    .eq('id', params.id)

  return NextResponse.json({ ok: true, data_fine: dataFine })
}
