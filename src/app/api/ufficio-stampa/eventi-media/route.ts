import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase.from('utenti').select('club_id, ruolo').eq('id', user.id).single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const url = new URL(req.url)
  const soloMiei = url.searchParams.get('soloMiei') === '1'

  let query = supabase
    .from('eventi_media')
    .select('*')
    .eq('club_id', utente.club_id)
    .order('data_ora', { ascending: true })

  // giocatore e allenatore vedono solo gli eventi che li coinvolgono
  if (soloMiei || utente.ruolo === 'giocatore' || utente.ruolo === 'allenatore') {
    query = query.contains('soggetti_coinvolti', [user.id])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase.from('utenti').select('club_id, ruolo').eq('id', user.id).single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  if (utente.ruolo !== 'ufficio_stampa' && !['presidente', 'ds', 'segretario'].includes(utente.ruolo)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const body = await req.json()
  const { tipo, data_ora, durata_minuti, luogo, emittente_testata, soggetti_coinvolti, stato, note } = body

  if (!tipo || !data_ora) return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })

  const { data, error } = await supabase.from('eventi_media').insert({
    club_id: utente.club_id,
    tipo,
    data_ora,
    durata_minuti: durata_minuti ?? 30,
    luogo,
    emittente_testata,
    soggetti_coinvolti: soggetti_coinvolti ?? [],
    stato: stato ?? 'da_confermare',
    note,
    creato_da: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica i soggetti coinvolti
  if (soggetti_coinvolti && soggetti_coinvolti.length > 0) {
    const tipoLabel: Record<string, string> = {
      intervista_tv: 'Intervista TV', conferenza_stampa: 'Conferenza stampa',
      intervista_radio: 'Intervista radio', podcast: 'Podcast',
      photoshoot: 'Photoshoot', altro: 'Evento media',
    }
    const dataFormattata = new Date(data_ora).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    try {
      // Filtra solo gli utenti (i giocatori non hanno record in utenti con notifiche)
      const { data: utentiCoinvolti } = await supabase
        .from('utenti')
        .select('id, ruolo')
        .in('id', soggetti_coinvolti)
        .eq('club_id', utente.club_id)

      if (utentiCoinvolti && utentiCoinvolti.length > 0) {
        await supabase.from('notifiche_sistema').insert(
          utentiCoinvolti.map((u: { id: string; ruolo?: string }) => ({
            club_id:            utente.club_id,
            destinatario_id:    u.id,
            ruolo_destinatario: u.ruolo ?? null,
            tipo:               'alert_sistema',
            titolo:             `📸 ${tipoLabel[tipo] ?? 'Evento media'} programmato`,
            messaggio:          `Sei stato coinvolto in un evento mediatico il ${dataFormattata}${luogo ? ` — ${luogo}` : ''}.`,
            letta:              false,
            azione_url:         '/dashboard/ufficio-stampa/calendario-media',
          }))
        )
      }
    } catch (_) {
      // Non bloccare la risposta se la notifica fallisce
    }
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase.from('utenti').select('club_id, ruolo').eq('id', user.id).single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const { data, error } = await supabase
    .from('eventi_media')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', utente.club_id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase.from('utenti').select('club_id, ruolo').eq('id', user.id).single()
  if (!utente || utente.ruolo !== 'ufficio_stampa') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const { error } = await supabase.from('eventi_media').delete().eq('id', id).eq('club_id', utente.club_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
