import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { stagioneCorrente } from '@/lib/helpers'
import { getClubFromSession } from '@/lib/server-helpers'

function periodoFromStagione(stagione: string): { da: string; a: string } {
  const anno = parseInt(stagione.split('-')[0], 10)
  return {
    da: `${anno}-09-01`,
    a: `${anno + 1}-05-31`,
  }
}

function buildNumeroQuietanza(anno: number, seq: number): string {
  return `Q${anno}/${String(seq).padStart(3, '0')}`
}

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()
  const clubId = session.clubId
  const body = await req.json().catch(() => ({}))
  const { bulk, giocatore_id } = body as { bulk?: boolean; giocatore_id?: string }

  const STAGIONE = stagioneCorrente()
  const { da: periodo_da, a: periodo_a } = periodoFromStagione(STAGIONE)
  const annoBase = parseInt(STAGIONE.split('-')[0], 10)

  // Load existing quietanze to skip duplicates and for numbering
  const { data: esistenti } = await supabase
    .from('quietanze')
    .select('id, giocatore_id')
    .eq('club_id', clubId)
    .eq('stagione', STAGIONE)

  const esistentiSet = new Set((esistenti ?? []).map((q: any) => q.giocatore_id))
  let prossimo = (esistenti?.length ?? 0) + 1

  // Load quote_iscrizione to get importo (optional, falls back to 0)
  const { data: quoteData } = await supabase
    .from('quote_iscrizione')
    .select('giocatore_id, importo_totale')
    .eq('club_id', clubId)
    .eq('stagione', STAGIONE)

  const quoteLookup = new Map((quoteData ?? []).map((q: any) => [q.giocatore_id, Number(q.importo_totale)]))

  // Load active players from tesseramenti (prima squadra only)
  let tessQuery = supabase
    .from('tesseramenti')
    .select('giocatore_id, squadre(categoria_eta), giocatori(data_nascita)')
    .eq('club_id', clubId)
    .eq('stato', 'attivo')

  if (!bulk && giocatore_id) {
    tessQuery = tessQuery.eq('giocatore_id', giocatore_id)
  }

  const { data: tesseramenti, error: tessError } = await tessQuery
  if (tessError) return NextResponse.json({ error: tessError.message }, { status: 500 })

  const PRIMA_SQUADRA = ['prima_squadra', 'femminile']
  const isPrimaSquadra = (t: any) => {
    const catEta = (t.squadre as any)?.categoria_eta
    if (PRIMA_SQUADRA.includes(catEta)) return true
    if (!catEta) {
      const dob = (t.giocatori as any)?.data_nascita
      if (dob) {
        const eta = new Date().getFullYear() - new Date(dob).getFullYear()
        return eta >= 20
      }
    }
    return false
  }

  const nuovi = (tesseramenti ?? []).filter((t: any) => isPrimaSquadra(t) && !esistentiSet.has(t.giocatore_id))

  if (nuovi.length === 0) {
    return NextResponse.json({ created: 0, message: 'Nessuna nuova quietanza da generare' })
  }

  const inserimenti = nuovi.map((t: any) => ({
    club_id: clubId,
    giocatore_id: t.giocatore_id,
    stagione: STAGIONE,
    tipo: 'quota_tesseramento',
    importo_totale: quoteLookup.get(t.giocatore_id) ?? 0,
    periodo_da,
    periodo_a,
    numero_quietanza: buildNumeroQuietanza(annoBase, prossimo++),
  }))

  const { error: insertError } = await supabase.from('quietanze').insert(inserimenti)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ created: inserimenti.length })
}
