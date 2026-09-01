import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { inserisciRegistroIva, stagioneDaData } from '@/lib/registro-iva'
import { getClubFromSession } from '@/lib/server-helpers'

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()
  const clubId = session.clubId

  // IDs già registrati nel registro IVA
  const { data: giàRegistrati } = await supabase
    .from('registro_iva')
    .select('riferimento_pagamento_id')
    .eq('club_id', clubId)
    .not('riferimento_pagamento_id', 'is', null)

  const registratiSet = new Set((giàRegistrati ?? []).map((r: any) => r.riferimento_pagamento_id))

  let created = 0

  // ── 1. Rate pagate da piani_pagamento ─────────────────────────────────────
  const { data: ratePagate } = await supabase
    .from('rate_pagamento')
    .select(`
      id, importo, data_pagamento,
      piano_id(
        descrizione,
        giocatori(nome, cognome)
      )
    `)
    .eq('club_id', clubId)
    .eq('stato', 'pagata')
    .not('data_pagamento', 'is', null)

  const rateMancanti = (ratePagate ?? []).filter((r: any) => !registratiSet.has(r.id))

  for (const rata of rateMancanti) {
    const piano = (rata as any).piano_id
    const giocatore = piano?.giocatori
    const data = rata.data_pagamento!
    const stagione = stagioneDaData(data)
    const controparte = giocatore
      ? `${giocatore.cognome ?? ''} ${giocatore.nome ?? ''}`.trim()
      : undefined

    const { error } = await inserisciRegistroIva(supabase as any, {
      club_id: clubId,
      data_operazione: data,
      tipo: 'entrata',
      natura: `Quota tesseramento sportivo ${stagione}`,
      controparte,
      importo: Number(rata.importo),
      riferimento_pagamento_id: rata.id,
    })

    if (!error) created++
  }

  // ── 2. Pagamenti diretti su quote_iscrizione (flusso senza piano a rate) ──
  const { data: pagamentiDiretti } = await supabase
    .from('pagamenti')
    .select(`
      id, importo, data_pagamento,
      quota_id(
        stagione,
        club_id,
        giocatori(nome, cognome)
      )
    `)
    .not('data_pagamento', 'is', null)

  // Filtriamo solo i pagamenti il cui quota appartiene a questo club
  const pagamentiDelClub = (pagamentiDiretti ?? []).filter((p: any) => {
    const quota = (p as any).quota_id
    return quota != null && quota.club_id === clubId
  })

  const pagamentiMancanti = pagamentiDelClub.filter((p: any) => !registratiSet.has(p.id))

  for (const pag of pagamentiMancanti) {
    const quota = (pag as any).quota_id
    const giocatore = quota?.giocatori
    const data = pag.data_pagamento!
    const stagione = quota?.stagione ?? stagioneDaData(data)
    const controparte = giocatore
      ? `${giocatore.cognome ?? ''} ${giocatore.nome ?? ''}`.trim()
      : undefined

    const { error } = await inserisciRegistroIva(supabase as any, {
      club_id: clubId,
      data_operazione: data,
      tipo: 'entrata',
      natura: `Quota tesseramento sportivo ${stagione}`,
      controparte,
      importo: Number(pag.importo),
      riferimento_pagamento_id: pag.id,
    })

    if (!error) created++
  }

  // ── 3. Entrate da prima_nota non ancora nel registro ────────────────────────
  const { data: entrataPN } = await supabase
    .from('prima_nota')
    .select('id, importo, data, descrizione, categoria, controparte, sorgente')
    .eq('club_id', clubId)
    .eq('tipo', 'entrata')
    .not('stornato', 'eq', true)
    .not('data', 'is', null)

  const entrateMancanti = (entrataPN ?? []).filter((e: any) => !registratiSet.has(e.id))

  for (const e of entrateMancanti) {
    const data = e.data as string
    const stagione = stagioneDaData(data)
    const natura = e.descrizione || e.categoria || `Entrata ${stagione}`

    const { error } = await inserisciRegistroIva(supabase as any, {
      club_id: clubId,
      data_operazione: data,
      tipo: 'entrata',
      natura,
      controparte: e.controparte ?? undefined,
      importo: Number(e.importo),
      riferimento_pagamento_id: e.id,
    })

    if (!error) created++
  }

  return NextResponse.json({ created })
}
