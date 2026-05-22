import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()

  const body = await req.json() as {
    giocatore_id: string | null
    tipo_sanzione: string
    durata: string
    data_inizio: string
    comunicato_ref: string | null
  }

  const isAmmenda = body.tipo_sanzione === 'ammenda'

  if (!isAmmenda && (!body.giocatore_id || !body.data_inizio)) {
    return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 })
  }

  const clubId = session.clubId

  let dataFine: string | null = null

  if (!isAmmenda) {
    // Calcola n° giornate dal campo durata (es. "2 giornate", "1 gara")
    const matchN = body.durata.match(/(\d+)/)
    const nGiornate = matchN ? parseInt(matchN[1], 10) : 1

    // Calcola data_fine: cerca le prossime N partite del club
    const { data: squadre } = await supabase
      .from('squadre').select('id').eq('club_id', clubId)
    const squadreIds = (squadre ?? []).map((s: any) => s.id)

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

    // Inserisce in tabella squalifiche (usata dall'allenatore e dalla disponibilità)
    const { error: sqErr } = await supabase.from('squalifiche').insert({
      club_id:            clubId,
      giocatore_id:       body.giocatore_id,
      motivo:             `${body.tipo_sanzione} — ${body.durata}`,
      partite_restanti:   nGiornate,
      giornate_squalifica: nGiornate,
      giornate_rimanenti: nGiornate,
      data_inizio:        body.data_inizio,
      data_fine:          dataFine,
      comunicato_figc:    body.comunicato_ref,
    })

    if (sqErr) return NextResponse.json({ error: sqErr.message }, { status: 500 })
  }

  // Marca la squalifica_comunicato come confermata
  await supabase.from('squalifiche_comunicato')
    .update({ confermato: true, giocatore_id: body.giocatore_id ?? null })
    .eq('id', params.id)

  return NextResponse.json({ ok: true, data_fine: dataFine })
}
