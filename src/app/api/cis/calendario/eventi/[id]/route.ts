import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateScheduledNotificationsForEvent } from '@/lib/notifications/NotificationService'

function parseMaybeArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const eventId = params.id

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()
  if (utenteError || !utente) return NextResponse.json({ error: 'Utente non valido' }, { status: 403 })

  const clubId = utente.club_id

  const { data: evento, error } = await supabase
    .from('eventi_calendario')
    .select(`
      id,
      tipologia,
      data,
      data_ora_inizio,
      data_ora_fine,
      luogo_testo,
      luogo_lat,
      luogo_lng,
      priorita,
      note,
      eventi_partecipanti(tipo_partecipante,squadra_id,staff_id,giocatore_id),
      eventi_allegati(id,file_name,mime_type,file_size,storage_path,created_at)
    `)
    .eq('id', eventId)
    .eq('club_id', clubId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!evento) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })

  const parts: any[] = (evento.eventi_partecipanti as any[]) ?? []

  return NextResponse.json({
    ok: true,
    evento: {
      ...evento,
      partecipanti: {
        squadre: parts.filter(p => p.tipo_partecipante === 'squadra').map(p => p.squadra_id),
        staff: parts.filter(p => p.tipo_partecipante === 'staff').map(p => p.staff_id),
        giocatori: parts.filter(p => p.tipo_partecipante === 'giocatore').map(p => p.giocatore_id),
      },
      allegati: evento.eventi_allegati ?? [],
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const eventId = params.id

  const body = await req.json().catch(() => null) as any
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Best-effort fetch per calcolare `data` quando arriva solo start/end
  const { data: existing } = await supabase.from('eventi_calendario').select('id').eq('id', eventId).single()
  if (!existing) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })

  const start = body.data_ora_inizio ?? body.start ?? null
  const end = body.data_ora_fine ?? body.end ?? null

  const updateFields: any = {}
  if (body.tipologia) updateFields.tipologia = body.tipologia
  if (body.priorita) updateFields.priorita = body.priorita
  if (body.luogo_testo) updateFields.luogo_testo = body.luogo_testo
  if (body.luogo_lat !== undefined) updateFields.luogo_lat = body.luogo_lat
  if (body.luogo_lng !== undefined) updateFields.luogo_lng = body.luogo_lng
  if (typeof body.note === 'string') updateFields.note = body.note

  if (start) updateFields.data_ora_inizio = start
  if (end) updateFields.data_ora_fine = end
  if (start) {
    updateFields.data = new Date(start).toISOString().split('T')[0]
  } else if (body.data) {
    updateFields.data = body.data
  }

  if (Object.keys(updateFields).length > 0) {
    const { error: updateError } = await supabase
      .from('eventi_calendario')
      .update(updateFields)
      .eq('id', eventId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Partecipanti (full replace)
  if (body.partecipanti) {
    const partecipanti = body.partecipanti
    const squadre = parseMaybeArray(partecipanti.squadre)
    const staff = parseMaybeArray(partecipanti.staff)
    const giocatori = parseMaybeArray(partecipanti.giocatori)

    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    const clubId = utente?.club_id

    const { error: delPartsError } = await supabase
      .from('eventi_partecipanti')
      .delete()
      .eq('evento_id', eventId)
    if (delPartsError) return NextResponse.json({ error: delPartsError.message }, { status: 500 })

    const rows: any[] = []
    for (const id of squadre) rows.push({ club_id: clubId, evento_id: eventId, tipo_partecipante: 'squadra', squadra_id: id })
    for (const id of staff) rows.push({ club_id: clubId, evento_id: eventId, tipo_partecipante: 'staff', staff_id: id })
    for (const id of giocatori) rows.push({ club_id: clubId, evento_id: eventId, tipo_partecipante: 'giocatore', giocatore_id: id })

    if (rows.length > 0) {
      const { error: insPartsError } = await supabase.from('eventi_partecipanti').insert(rows)
      if (insPartsError) return NextResponse.json({ error: insPartsError.message }, { status: 500 })
    }
  }

  // Allegati (replace metadata only)
  if (Array.isArray(body.allegati)) {
    const allegati = body.allegati
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    const clubId = utente?.club_id

    const { error: delAllegatiError } = await supabase
      .from('eventi_allegati')
      .delete()
      .eq('evento_id', eventId)
    if (delAllegatiError) return NextResponse.json({ error: delAllegatiError.message }, { status: 500 })

    const allegatiRows: any[] = allegati.map((f: any) => ({
      club_id: clubId,
      evento_id: eventId,
      file_name: f.file_name,
      mime_type: f.mime_type,
      file_size: f.file_size ?? null,
      storage_path: f.storage_path,
    }))

    if (allegatiRows.length > 0) {
      const { error: insAllegatiError } = await supabase.from('eventi_allegati').insert(allegatiRows)
      if (insAllegatiError) return NextResponse.json({ error: insAllegatiError.message }, { status: 500 })
    }
  }

  // Rigenera outbox notifiche CIS per questo evento
  try {
    await generateScheduledNotificationsForEvent(supabase as any, eventId)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore scheduling notifiche' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const eventId = params.id

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Invalidate outbox future legata all'evento
  await supabase.from('cis_notification_outbox').delete().eq('evento_id', eventId)

  const { error } = await supabase.from('eventi_calendario').delete().eq('id', eventId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

