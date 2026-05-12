import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 })
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: invito, error } = await admin
    .from('inviti_club')
    .select('id, ruolo, usato, scadenza, club_id, giocatore_id')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })
  }
  if (!invito) {
    return NextResponse.json({ error: 'Invito non trovato nel database' }, { status: 404 })
  }

  if (invito.usato) {
    return NextResponse.json({ error: 'Questo link è già stato utilizzato.' }, { status: 410 })
  }
  if (invito.scadenza && new Date(invito.scadenza) < new Date()) {
    return NextResponse.json({ error: 'Questo link di invito è scaduto.' }, { status: 410 })
  }

  const { data: club } = await admin
    .from('clubs')
    .select('nome, citta, logo_url')
    .eq('id', invito.club_id)
    .maybeSingle()

  let giocatoreNome: string | null = null
  if (invito.giocatore_id) {
    const { data: gioc } = await admin
      .from('giocatori')
      .select('nome, cognome')
      .eq('id', invito.giocatore_id)
      .maybeSingle()
    if (gioc) giocatoreNome = `${(gioc as any).nome} ${(gioc as any).cognome}`
  }

  return NextResponse.json({
    ruolo:          invito.ruolo,
    club_nome:      (club as any)?.nome     ?? '',
    club_citta:     (club as any)?.citta    ?? '',
    club_logo_url:  (club as any)?.logo_url ?? null,
    giocatore_nome: giocatoreNome,
    giocatore_id:   invito.giocatore_id ?? null,
  })
}
