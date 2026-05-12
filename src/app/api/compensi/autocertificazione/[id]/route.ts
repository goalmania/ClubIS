import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generaHTMLAutocertificazione } from '@/lib/compensi'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionClient = createClient()

  const supabase = createAdminClient()

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Query semplice senza join — evita errori PostgREST su FK ambigue o assenti
  const { data: compenso, error: compensoErr } = await supabase
    .from('compensi')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (compensoErr) {
    console.error('[autocertificazione] compensi query error:', compensoErr)
    return NextResponse.json({ error: compensoErr.message }, { status: 500 })
  }
  if (!compenso) return NextResponse.json({ error: 'Compenso non trovato' }, { status: 404 })

  // Recupera club
  const { data: club } = await supabase
    .from('clubs')
    .select('nome, codice_fiscale')
    .eq('id', compenso.club_id)
    .single()

  // Recupera collaboratore se interno
  let collaboratore: { nome: string; cognome: string; codice_fiscale: string; indirizzo?: string }
  if (compenso.collaboratore_id) {
    const { data: utente } = await supabase
      .from('utenti')
      .select('nome, cognome, codice_fiscale, indirizzo')
      .eq('id', compenso.collaboratore_id)
      .maybeSingle()
    collaboratore = {
      nome: utente?.nome ?? '',
      cognome: utente?.cognome ?? '',
      codice_fiscale: utente?.codice_fiscale ?? '',
      indirizzo: utente?.indirizzo ?? undefined,
    }
  } else {
    const parts = (compenso.nome_esterno ?? '').trim().split(' ')
    collaboratore = {
      cognome: parts[0] ?? '',
      nome: parts.slice(1).join(' '),
      codice_fiscale: compenso.cf_esterno ?? '',
    }
  }

  const html = generaHTMLAutocertificazione({
    collaboratore,
    club: { nome: club?.nome ?? '', codice_fiscale: club?.codice_fiscale },
    compenso: {
      importo_lordo:     Number(compenso.importo_lordo),
      importo_precedente: Number(compenso.importo_precedente),
      supera_soglia:     compenso.supera_soglia,
      importo_esente:    Number(compenso.importo_esente),
      importo_imponibile: Number(compenso.importo_imponibile),
      ritenuta:          Number(compenso.ritenuta),
      importo_netto:     Number(compenso.importo_netto),
      soglia_residua:    Math.max(0, 5000 - Number(compenso.importo_precedente)),
      descrizione:       compenso.descrizione,
      anno:              compenso.anno,
      data_pagamento:    compenso.data_pagamento,
    },
  })

  // Marca come generata (best-effort, non blocca la risposta)
  supabase.from('compensi').update({ autocertificazione_generata: true }).eq('id', id)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
