import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateScheduledNotificationsForEvent } from '@/lib/notifications/NotificationService'

const TIPOL_LABEL: Record<string, string> = {
  allenamento: 'Allenamento',
  partita: 'Partita',
  riunione: 'Riunione',
  visita_medica: 'Visita medica',
  trasferta: 'Trasferta',
}

function parseCsv(value: string | null | undefined) {
  if (!value) return []
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()

  const start = req.nextUrl.searchParams.get('start')
  const end = req.nextUrl.searchParams.get('end')
  if (!start || !end) {
    return NextResponse.json({ error: 'Missing start/end' }, { status: 400 })
  }

  // Filtri opzionali
  const tipologie = parseCsv(req.nextUrl.searchParams.get('tipologie'))
  const squadre = parseCsv(req.nextUrl.searchParams.get('squadre'))
  const staff = parseCsv(req.nextUrl.searchParams.get('staff'))
  const giocatori = parseCsv(req.nextUrl.searchParams.get('giocatori'))

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (utenteError || !utente) return NextResponse.json({ error: 'Utente non valido' }, { status: 403 })

  const clubId = utente.club_id

  const { data: eventi, error } = await supabase
    .from('eventi_calendario')
    .select(`
      id,
      tipologia,
      data,
      data_ora_inizio,
      data_ora_fine,
      luogo_testo,
      priorita,
      note,
      eventi_partecipanti(tipo_partecipante, squadra_id, staff_id, giocatore_id)
    `)
    .eq('club_id', clubId)
    // Overlap: [inizio, fine] interseca il range [start, end]
    .lt('data_ora_inizio', end)
    .gt('data_ora_fine', start)
    .order('data_ora_inizio', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const selectedSquadre = new Set(squadre)
  const selectedStaff = new Set(staff)
  const selectedGiocatori = new Set(giocatori)
  const filterByParticipants =
    selectedSquadre.size > 0 || selectedStaff.size > 0 || selectedGiocatori.size > 0
  const filterByTipologie = tipologie.length > 0

  const events = (eventi ?? []).filter(e => {
    const okTipologia = !filterByTipologie || (tipologie.includes(e.tipologia as any))
    if (!okTipologia) return false

    if (!filterByParticipants) return true

    const parts: any[] = (e.eventi_partecipanti as any[]) ?? []
    return parts.some(p => {
      if (p.tipo_partecipante === 'squadra' && p.squadra_id && selectedSquadre.has(p.squadra_id)) return true
      if (p.tipo_partecipante === 'staff' && p.staff_id && selectedStaff.has(p.staff_id)) return true
      if (p.tipo_partecipante === 'giocatore' && p.giocatore_id && selectedGiocatori.has(p.giocatore_id)) return true
      return false
    })
  }).map(e => {
    const parts: any[] = (e.eventi_partecipanti as any[]) ?? []
    const squadreIds = parts.filter(p => p.tipo_partecipante === 'squadra').map(p => p.squadra_id).filter(Boolean)
    const staffIds = parts.filter(p => p.tipo_partecipante === 'staff').map(p => p.staff_id).filter(Boolean)
    const giocatoriIds = parts.filter(p => p.tipo_partecipante === 'giocatore').map(p => p.giocatore_id).filter(Boolean)

    const luogo = e.luogo_testo ? String(e.luogo_testo) : ''
    const title = `${TIPOL_LABEL[String(e.tipologia)] ?? String(e.tipologia)}${luogo ? ` · ${luogo}` : ''}`

    return {
      id: e.id,
      title,
      start: e.data_ora_inizio,
      end: e.data_ora_fine,
      allDay: false,
      extendedProps: {
        tipologia: e.tipologia,
        priorita: e.priorita,
        note: e.note,
        data: e.data,
        luogo_testo: e.luogo_testo,
        partecipanti: {
          squadre: squadreIds,
          staff: staffIds,
          giocatori: giocatoriIds,
        },
      },
    }
  })

  return NextResponse.json({ events })
}

export async function POST(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    tipologia,
    data,
    data_ora_inizio,
    data_ora_fine,
    luogo_testo,
    luogo_lat,
    luogo_lng,
    priorita,
    note,
    partecipanti,
    allegati,
  } = body as any

  // Validazione base
  if (!tipologia || !data || !data_ora_inizio || !data_ora_fine || !luogo_testo || !priorita || typeof note !== 'string') {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }
  if (!partecipanti) return NextResponse.json({ error: 'Partecipanti mancanti' }, { status: 400 })

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (utenteError || !utente) return NextResponse.json({ error: 'Utente non valido' }, { status: 403 })
  const clubId = utente.club_id

  const { data: eventoIns, error: eventoError } = await supabase
    .from('eventi_calendario')
    .insert({
      club_id: clubId,
      tipologia,
      data,
      data_ora_inizio,
      data_ora_fine,
      luogo_testo,
      luogo_lat: luogo_lat ?? null,
      luogo_lng: luogo_lng ?? null,
      priorita,
      note,
      creato_da: user.id,
    })
    .select('id')
    .single()

  if (eventoError || !eventoIns) return NextResponse.json({ error: eventoError?.message ?? 'Insert failed' }, { status: 500 })

  const eventoId = eventoIns.id
  const partecipantiSquadre: string[] = partecipanti.squadre ?? []
  const partecipantiStaff: string[] = partecipanti.staff ?? []
  const partecipantiGiocatori: string[] = partecipanti.giocatori ?? []

  const rows: any[] = []
  for (const id of partecipantiSquadre) {
    if (id) rows.push({ club_id: clubId, evento_id: eventoId, tipo_partecipante: 'squadra', squadra_id: id })
  }
  for (const id of partecipantiStaff) {
    if (id) rows.push({ club_id: clubId, evento_id: eventoId, tipo_partecipante: 'staff', staff_id: id })
  }
  for (const id of partecipantiGiocatori) {
    if (id) rows.push({ club_id: clubId, evento_id: eventoId, tipo_partecipante: 'giocatore', giocatore_id: id })
  }

  if (rows.length === 0) return NextResponse.json({ error: 'Seleziona almeno un partecipante' }, { status: 400 })

  const { error: partsError } = await supabase.from('eventi_partecipanti').insert(rows)
  if (partsError) {
    // Rollback best-effort
    await supabase.from('eventi_calendario').delete().eq('id', eventoId)
    return NextResponse.json({ error: partsError.message }, { status: 500 })
  }

  const allegatiRows: any[] = Array.isArray(allegati)
    ? allegati.map((f: any) => ({
      club_id: clubId,
      evento_id: eventoId,
      file_name: f.file_name,
      mime_type: f.mime_type,
      file_size: f.file_size ?? null,
      storage_path: f.storage_path,
    }))
    : []

  if (allegatiRows.length > 0) {
    const { error: allegatiError } = await supabase.from('eventi_allegati').insert(allegatiRows)
    if (allegatiError) {
      // Rollback best-effort
      await supabase.from('eventi_calendario').delete().eq('id', eventoId)
      return NextResponse.json({ error: allegatiError.message }, { status: 500 })
    }
  }

  // Rigenera outbox notifiche CIS per questo evento
  try {
    await generateScheduledNotificationsForEvent(supabase as any, eventoId)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore scheduling notifiche' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: eventoId })
}

