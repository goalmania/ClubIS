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

  // Trova rate pagate senza registrazione IVA corrispondente
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

  if (!ratePagate?.length) return NextResponse.json({ created: 0 })

  // IDs già registrati
  const { data: giàRegistrati } = await supabase
    .from('registro_iva')
    .select('riferimento_pagamento_id')
    .eq('club_id', clubId)
    .not('riferimento_pagamento_id', 'is', null)

  const registratiSet = new Set((giàRegistrati ?? []).map((r: any) => r.riferimento_pagamento_id))

  const mancanti = ratePagate.filter((r: any) => !registratiSet.has(r.id))

  let created = 0
  for (const rata of mancanti) {
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

  return NextResponse.json({ created })
}
