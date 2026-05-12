import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

const RUOLI_INVIO = ['segretario', 'ds', 'presidente']

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('comunicazioni_club')
    .select('*, inviata_da_utente:utenti!inviata_da(nome, cognome, ruolo)')
    .eq('club_id', ctx.clubId)
    .order('data_invio', { ascending: false })
    .limit(50)

  return Response.json({ comunicazioni: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  if (!RUOLI_INVIO.includes(ctx.ruolo) && !ctx.isSuperAdmin) {
    return Response.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.oggetto?.trim() || !body.testo?.trim()) {
    return Response.json({ error: 'Oggetto e testo sono obbligatori' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('comunicazioni_club')
    .insert({
      club_id: ctx.clubId,
      inviata_da: ctx.userId,
      oggetto: body.oggetto.trim(),
      testo: body.testo.trim(),
      destinatari_gruppo: body.destinatari_gruppo ?? 'tutti_tesserati',
      destinatari_custom: body.destinatari_custom ?? [],
      canale: body.canale ?? 'in_app',
      data_invio: new Date().toISOString(),
      letta_da: [],
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Notifica a tutti i membri del club tranne chi l'ha inviata
  try {
    const { data: destinatari } = await supabase
      .from('utenti')
      .select('id, ruolo')
      .eq('club_id', ctx.clubId)
      .eq('attivo', true)
      .neq('id', ctx.userId)

    if (destinatari && destinatari.length > 0) {
      await supabase.from('notifiche_sistema').insert(
        destinatari.map(u => ({
          destinatario_id:    u.id,
          club_id:            ctx.clubId,
          ruolo_destinatario: u.ruolo,
          tipo:               'alert_sistema',
          titolo:             `📢 ${body.oggetto.trim()}`,
          messaggio:          body.testo.trim().slice(0, 200) + (body.testo.trim().length > 200 ? '…' : ''),
          azione_url:         '/dashboard/segretario/comunicazioni',
          letta:              false,
        }))
      )
    }
  } catch (_) {
    // Non blocca la risposta
  }

  return Response.json({ comunicazione: data }, { status: 201 })
}
