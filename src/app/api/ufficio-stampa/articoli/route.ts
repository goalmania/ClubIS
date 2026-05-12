import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Genera un template articolo a partire da una partita
export async function GET(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const url = new URL(req.url)
  const partitaId = url.searchParams.get('partita_id')
  if (!partitaId) return NextResponse.json({ error: 'partita_id obbligatorio' }, { status: 400 })

  const { data: partita, error: pErr } = await supabase
    .from('partite')
    .select('*, squadre(nome, club_id)')
    .eq('id', partitaId)
    .single()

  if (pErr || !partita) return NextResponse.json({ error: 'Partita non trovata' }, { status: 404 })

  // Recupera statistiche e convocazioni per la partita
  const [
    { data: statistiche },
    { data: convocazioni },
  ] = await Promise.all([
    supabase
      .from('statistiche_partita')
      .select('*, giocatori(nome, cognome)')
      .eq('partita_id', partitaId),
    supabase
      .from('convocazioni')
      .select('*, giocatori(nome, cognome)')
      .eq('partita_id', partitaId)
      .eq('stato_risposta', 'confermato'),
  ])

  const marcatori = (statistiche ?? [])
    .filter((s: any) => (s.gol ?? 0) > 0)
    .map((s: any) => `${s.giocatori?.cognome ?? '?'} (${s.gol} gol)`)

  const ammoniti = (statistiche ?? [])
    .filter((s: any) => (s.ammonizioni ?? 0) > 0)
    .map((s: any) => s.giocatori?.cognome ?? '?')

  const espulsi = (statistiche ?? [])
    .filter((s: any) => (s.espulsioni ?? 0) > 0)
    .map((s: any) => s.giocatori?.cognome ?? '?')

  const dataPartita = new Date(partita.data_ora).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const oraPartita = new Date(partita.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const isPostGara = partita.stato === 'giocata' && partita.gol_fatti !== null
  const squadraNome = (partita as any).squadre?.nome ?? 'La nostra squadra'

  const homeLabel = partita.casa_trasferta === 'casa' ? squadraNome : partita.avversario
  const awayLabel = partita.casa_trasferta === 'casa' ? partita.avversario : squadraNome
  const risultato = isPostGara
    ? `${partita.gol_fatti} - ${partita.gol_subiti}`
    : '— vs —'

  const template = `GARA: ${homeLabel} vs ${awayLabel}
DATA: ${dataPartita} | ORE: ${oraPartita}
COMPETIZIONE: ${partita.competizione ?? '—'}
CAMPO: ${partita.campo ?? '—'}
CASA/TRASFERTA: ${partita.casa_trasferta?.toUpperCase() ?? '—'}
${isPostGara ? `\nRISULTATO: ${risultato}` : ''}
${marcatori.length ? `MARCATORI: ${marcatori.join(', ')}` : ''}
${ammoniti.length ? `AMMONITI: ${ammoniti.join(', ')}` : ''}
${espulsi.length ? `ESPULSI: ${espulsi.join(', ')}` : ''}

NOTE ALLENATORE:
[inserire qui le dichiarazioni dell'allenatore]

---

[TITOLO ARTICOLO]

[CORPO ARTICOLO — descrizione della gara, analisi, commenti, atmosfera]

---
Generato da ClubIS — Ufficio Stampa
`.trim()

  return NextResponse.json({
    template,
    partita: {
      id: partita.id,
      home: homeLabel,
      away: awayLabel,
      data_ora: partita.data_ora,
      competizione: partita.competizione,
      campo: partita.campo,
      risultato: isPostGara ? risultato : null,
      stato: partita.stato,
    },
  })
}
