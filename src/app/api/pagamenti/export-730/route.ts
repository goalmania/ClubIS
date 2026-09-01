import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getClubFromSession } from '@/lib/server-helpers'

export async function GET(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()
  const clubId = session.clubId

  const anno = parseInt(req.nextUrl.searchParams.get('anno') ?? String(new Date().getFullYear()), 10)

  // Dati club per CF
  const { data: club } = await supabase
    .from('clubs')
    .select('nome, codice_fiscale')
    .eq('id', clubId)
    .single()

  // Rate pagate nell'anno
  const { data: rate } = await supabase
    .from('rate_pagamento')
    .select(`
      importo, data_pagamento,
      piano_id(
        descrizione,
        famiglie(nome, cognome, codice_fiscale),
        giocatori(nome, cognome, codice_fiscale)
      )
    `)
    .eq('club_id', clubId)
    .eq('stato', 'pagata')
    .gte('data_pagamento', `${anno}-01-01`)
    .lte('data_pagamento', `${anno}-12-31`)
    .order('data_pagamento')

  // Header CSV
  const righe: string[] = [
    'Anno,CodiceFiscale_Genitore,Cognome_Genitore,Nome_Genitore,Cognome_Giocatore,Nome_Giocatore,CodiceFiscale_Giocatore,Importo_Detraibile,Causale,Codice_Fiscale_Club',
  ]

  // Aggrega per genitore (somma importi dello stesso CF)
  const mappa = new Map<string, {
    cf: string; cognome: string; nome: string
    cfGioc: string; cognomeGioc: string; nomeGioc: string
    causale: string; importo: number
  }>()

  for (const r of rate ?? []) {
    const p = (r as any).piano_id
    const fam = p?.famiglie
    const gioc = p?.giocatori
    if (!fam?.codice_fiscale) continue

    const key = fam.codice_fiscale
    if (!mappa.has(key)) {
      mappa.set(key, {
        cf: fam.codice_fiscale,
        cognome: fam.cognome ?? '',
        nome: fam.nome ?? '',
        cfGioc: gioc?.codice_fiscale ?? '',
        cognomeGioc: gioc?.cognome ?? '',
        nomeGioc: gioc?.nome ?? '',
        causale: p?.descrizione ?? 'Quota associativa',
        importo: 0,
      })
    }
    mappa.get(key)!.importo += Number(r.importo)
  }

  for (const v of mappa.values()) {
    righe.push([
      anno,
      v.cf,
      `"${v.cognome}"`,
      `"${v.nome}"`,
      `"${v.cognomeGioc}"`,
      `"${v.nomeGioc}"`,
      v.cfGioc,
      v.importo.toFixed(2).replace('.', ','),
      `"${v.causale}"`,
      club?.codice_fiscale ?? '',
    ].join(','))
  }

  const csv = righe.join('\r\n')
  const filename = `export_730_${club?.nome?.replace(/\s+/g, '_') ?? 'club'}_${anno}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
