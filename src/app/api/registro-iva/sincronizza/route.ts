import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { inserisciRegistroIva, stagioneDaData } from '@/lib/registro-iva'

export async function POST(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente?.club_id) return NextResponse.json({ error: 'Club non trovato' }, { status: 403 })

  const clubId = utente.club_id

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
        giocatori(nome, cognome)
      )
    `)
    .not('data_pagamento', 'is', null)

  // Filtriamo i pagamenti il cui quota_id appartiene a questo club
  // (pagamenti non ha club_id diretto, filtriamo via quota_id)
  const pagamentiDelClub = (pagamentiDiretti ?? []).filter((p: any) => {
    const quota = (p as any).quota_id
    // quota è null se la FK non si risolve o quota non è di questo club
    return quota != null
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

  return NextResponse.json({ created })
}
