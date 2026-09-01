import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getScadenzeTemplate } from '@/lib/scadenze-pro-seed'
import { isPro } from '@/lib/categorie-club'

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('categoria, promozione_serie_c_stagione').eq('id', session.clubId).single()
  if (!club || !isPro(club.categoria)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const body = await req.json()
  const stagione: string = body.stagione ?? '2026/27'

  // Ricava anno di inizio dalla stagione "YYYY/YY"
  const annoInizio = parseInt(stagione.split('/')[0], 10)
  if (isNaN(annoInizio)) return NextResponse.json({ error: 'Stagione non valida' }, { status: 400 })

  // Rimuove le scadenze già presenti per questa stagione (reset)
  await supabase
    .from('scadenze_federali_pro')
    .delete()
    .eq('club_id', session.clubId)
    .eq('stagione', stagione)

  const neopromossaDaSerieD = club.promozione_serie_c_stagione === stagione
  const templates = getScadenzeTemplate(annoInizio, club.categoria, neopromossaDaSerieD)
  if (templates.length === 0) {
    return NextResponse.json({ error: 'Template scadenze non disponibile per questa categoria club' }, { status: 400 })
  }
  const records = templates.map(t => ({
    club_id:              session.clubId,
    tipo:                 t.tipo,
    categoria_scadenza:   t.categoria_scadenza,
    descrizione:          t.descrizione,
    data_scadenza:        t.getDataScadenza(annoInizio),
    stato:                'da_completare',
    attestazione_caricata: false,
    importo_coinvolto:    t.importo_coinvolto ?? null,
    stagione,
  }))

  const { error } = await supabase.from('scadenze_federali_pro').insert(records)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserite: records.length })
}
