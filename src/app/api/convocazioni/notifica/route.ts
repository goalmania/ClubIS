import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.partita_id || !Array.isArray(body.giocatori_ids) || body.giocatori_ids.length === 0) {
    return Response.json({ error: 'partita_id e giocatori_ids sono obbligatori' }, { status: 400 })
  }

  const { partita_id, giocatori_ids, titolo, messaggio } = body as {
    partita_id: string
    giocatori_ids: string[]
    titolo?: string
    messaggio?: string
  }

  const supabase = createAdminClient()

  // Verifica ownership partita (attraverso squadra → club)
  const { data: partita } = await supabase
    .from('partite')
    .select('id, avversario, data_ora, squadre(club_id, nome)')
    .eq('id', partita_id)
    .single()

  if (!partita) return Response.json({ error: 'Partita non trovata' }, { status: 404 })

  const squadra = (Array.isArray(partita.squadre) ? partita.squadre[0] : partita.squadre) as { club_id: string; nome: string } | null
  if (!ctx.isSuperAdmin && squadra?.club_id !== ctx.clubId) {
    return Response.json({ error: 'Accesso negato' }, { status: 403 })
  }

  // Trova i family user_id associati ai giocatori convocati
  const { data: famiglie } = await supabase
    .from('famiglie')
    .select('auth_user_id, giocatore_id')
    .in('giocatore_id', giocatori_ids)
    .not('auth_user_id', 'is', null)

  if (!famiglie || famiglie.length === 0) {
    return Response.json({ notificati: 0, message: 'Nessuna famiglia registrata per questi giocatori' })
  }

  const dataStr = new Date(partita.data_ora).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const oraStr = new Date(partita.data_ora).toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit',
  })

  const titoloNotifica = titolo ?? `Convocazione — ${dataStr}`
  const messaggioNotifica =
    messaggio ??
    `Il tuo giocatore è stato convocato per la partita vs ${partita.avversario} del ${dataStr} ore ${oraStr}.`

  const notifiche = famiglie.map(f => ({
    destinatario_id:    f.auth_user_id as string,
    club_id:            ctx.clubId,
    ruolo_destinatario: 'famiglia',
    tipo:               'convocazione',
    riferimento_id:     partita_id,
    titolo:             titoloNotifica,
    messaggio:          messaggioNotifica,
    azione_url:         '/dashboard/famiglia',
    letta:              false,
  }))

  const { error } = await supabase.from('notifiche_sistema').insert(notifiche)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ notificati: notifiche.length })
}
