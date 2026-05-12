import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getClubFromSession } from '@/lib/server-helpers'
import { canAccess } from '@/lib/features'
import {
  parseComunicatoFIGC,
  abbinaProvivedimenti,
  type ProvvedimentoFIGC,
  type AbbinamentoProvvedimento,
} from '@/lib/figc/parser-comunicati'

interface RequestBody {
  testo:             string
  comitato:          string
  numero_comunicato: string | null
  data_comunicato:   string
}

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canAccess('comunicati_figc_analisi', session.plan)) {
    return NextResponse.json({ error: 'Piano insufficiente. Aggiorna il tuo abbonamento.' }, { status: 403 })
  }

  const sessionClient = createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente?.club_id) return NextResponse.json({ error: 'Club non trovato' }, { status: 403 })

  const clubId = utente.club_id as string

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })
  }

  const { testo, comitato, numero_comunicato, data_comunicato } = body

  if (!testo || testo.trim().length < 20) {
    return NextResponse.json({ error: 'Testo comunicato troppo breve o assente' }, { status: 400 })
  }
  if (!data_comunicato) {
    return NextResponse.json({ error: 'Data comunicato mancante' }, { status: 400 })
  }

  // 1. Parsa il testo
  const provvedimenti: ProvvedimentoFIGC[] = parseComunicatoFIGC(testo)

  // 2. Carica la rosa del club per l'abbinamento
  const { data: tesserati } = await supabase
    .from('tesseramenti')
    .select('giocatori(id, nome, cognome)')
    .eq('club_id', clubId)
    .eq('stato', 'attivo')

  const rosa = (tesserati ?? [])
    .map((t: any) => t.giocatori)
    .filter(Boolean) as Array<{ id: string; nome: string; cognome: string }>

  // 3. Abbina i provvedimenti alla rosa
  const abbinamenti: AbbinamentoProvvedimento[] = abbinaProvivedimenti(provvedimenti, rosa)

  // 4. Salva il comunicato con testo grezzo e provvedimenti_json
  const { data: comunicato, error: commErr } = await supabase
    .from('comunicati_figc')
    .insert({
      club_id:            clubId,
      comitato_regionale: comitato || 'LND',
      numero_comunicato:  numero_comunicato || null,
      data_comunicato,
      testo_grezzo:       testo.slice(0, 100_000),
      provvedimenti_json: provvedimenti,
      processato:         false,
    })
    .select('id')
    .single()

  if (commErr || !comunicato) {
    return NextResponse.json(
      { error: commErr?.message ?? 'Errore salvataggio comunicato' },
      { status: 500 },
    )
  }

  // 5. Salva anche in squalifiche_comunicato per compatibilità con il Monitor Squalifiche
  const inserimentiSq = abbinamenti
    .filter(a => a.provvedimento.tipo === 'squalifica')
    .map(a => ({
      comunicato_id: comunicato.id,
      club_id:       clubId,
      cognome_raw:   a.provvedimento.cognome_raw,
      nome_raw:      a.provvedimento.nome_raw,
      societa_raw:   a.provvedimento.societa_raw,
      tipo_sanzione: a.provvedimento.tipo,
      durata:        a.provvedimento.durata,
      giocatore_id:  a.giocatore_id,
      match_score:   a.score,
      confermato:    false,
    }))

  if (inserimentiSq.length > 0) {
    await supabase.from('squalifiche_comunicato').insert(inserimentiSq)
  }

  return NextResponse.json({
    comunicato_id:  comunicato.id,
    trovati:        provvedimenti.length,
    abbinati:       abbinamenti.filter(a => a.giocatore_id !== null).length,
    non_abbinati:   abbinamenti.filter(a => a.giocatore_id === null).length,
    abbinamenti,    // restituisce l'array completo per la review lato client
  })
}
