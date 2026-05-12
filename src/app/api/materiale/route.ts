// src/app/api/materiale/route.ts
// Gestione richieste materiale sportivo con notifiche automatiche
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')

  let query = supabase
    .from('materiale_sportivo')
    .select('id, tipo, descrizione, quantita, stato, urgenza, richiedente, data_richiesta, note, created_at')
    .eq('club_id', ctx.clubId)
    .order('data_richiesta', { ascending: false })

  if (stato && stato !== 'tutti') query = query.eq('stato', stato)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ richieste: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const body = await req.json()

  if (!body.tipo?.trim()) {
    return Response.json({ error: 'Tipo di materiale obbligatorio' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('materiale_sportivo')
    .insert({
      club_id:        ctx.clubId,
      tipo:           body.tipo.trim(),
      descrizione:    body.descrizione ?? body.tipo.trim(),
      quantita:       body.quantita ?? 1,
      urgenza:        body.urgenza ?? 'media',
      richiedente:    body.richiedente ?? null,
      stato:          'in_attesa',
      note:           body.note ?? null,
      data_richiesta: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !data) return Response.json({ error: error?.message ?? 'Errore' }, { status: 500 })

  // ── Notifiche a presidente e segretario ──────────────────────────────────
  const urgenzaEmoji = body.urgenza === 'alta' ? '🔴' : body.urgenza === 'media' ? '🟡' : '🟢'
  const titoloNotifica = `${urgenzaEmoji} Nuova richiesta materiale`
  const messaggioNotifica = `${body.richiedente ?? 'Team Manager'} ha richiesto: ${body.tipo.trim()}` +
    (body.quantita > 1 ? ` (x${body.quantita})` : '') +
    (body.note ? ` — ${body.note}` : '')

  const { data: destinatari } = await supabase
    .from('utenti')
    .select('id, ruolo')
    .eq('club_id', ctx.clubId)
    .in('ruolo', ['presidente', 'segretario', 'ds'])
    .eq('attivo', true)

  if (destinatari && destinatari.length > 0) {
    await supabase.from('notifiche_sistema').insert(
      destinatari.map((u: { id: string; ruolo: string }) => ({
        destinatario_id:    u.id,
        club_id:            ctx.clubId,
        ruolo_destinatario: u.ruolo,
        tipo:               'alert_sistema',
        titolo:             titoloNotifica,
        messaggio:          messaggioNotifica,
        azione_url:         '/dashboard/team-manager/materiale',
        letta:              false,
      }))
    )
  }

  return Response.json({ richiesta: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  const body = await req.json()
  const aggiornamenti: Record<string, unknown> = {}
  if (body.stato    !== undefined) aggiornamenti.stato    = body.stato
  if (body.note     !== undefined) aggiornamenti.note     = body.note
  if (body.urgenza  !== undefined) aggiornamenti.urgenza  = body.urgenza
  if (body.quantita !== undefined) aggiornamenti.quantita = body.quantita

  const { data, error } = await supabase
    .from('materiale_sportivo')
    .update(aggiornamenti)
    .eq('id', id)
    .eq('club_id', ctx.clubId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ richiesta: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  const { error } = await supabase
    .from('materiale_sportivo')
    .delete()
    .eq('id', id)
    .eq('club_id', ctx.clubId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
