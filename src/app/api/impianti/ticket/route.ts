import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function GET(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const area = searchParams.get('area')
  const stato = searchParams.get('stato')

  const supabase = createAdminClient()

  let query = supabase
    .from('ticket_impianto')
    .select(`
      *,
      segnalato_da_utente:utenti!segnalato_da(nome, cognome, ruolo),
      assegnato_a_utente:utenti!assegnato_a(nome, cognome)
    `)
    .eq('club_id', ctx.clubId)
    .order('data_apertura', { ascending: false })

  if (area) query = query.eq('area', area)
  if (stato) query = query.eq('stato', stato)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ticket: data })
}

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { area, descrizione_problema, urgenza } = body

  if (!area || !descrizione_problema) {
    return Response.json({ error: 'Area e descrizione obbligatorie' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ticket_impianto')
    .insert({
      club_id: ctx.clubId,
      area,
      descrizione_problema: descrizione_problema.trim(),
      urgenza: urgenza ?? 'media',
      stato: 'aperto',
      segnalato_da: ctx.userId,
      data_apertura: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (urgenza === 'alta' || urgenza === 'bloccante') {
    const { data: destinatari } = await supabase
      .from('utenti')
      .select('id, ruolo')
      .eq('club_id', ctx.clubId)
      .in('ruolo', ['segretario', 'custode', 'presidente'])
      .eq('attivo', true)

    if (destinatari && destinatari.length > 0) {
      await supabase.from('notifiche_sistema').insert(
        destinatari.map((u: { id: string; ruolo: string }) => ({
          club_id:            ctx.clubId,
          destinatario_id:    u.id,
          ruolo_destinatario: u.ruolo,
          tipo:               'alert_sistema',
          titolo:             `🔴 Problema impianto ${urgenza === 'bloccante' ? 'BLOCCANTE' : 'urgente'}`,
          messaggio:          `${area}: ${descrizione_problema.slice(0, 100)}`,
          azione_url:         '/dashboard/custode/impianti',
          letta:              false,
        }))
      )
    }
  }

  return Response.json({ ticket: data }, { status: 201 })
}
