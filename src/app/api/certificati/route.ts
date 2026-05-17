import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { clubId } = ctx

  const [{ data: certificati, error: e1 }, { data: giocatori, error: e2 }] = await Promise.all([
    supabase
      .from('certificati_medici')
      .select('*, giocatori(id, nome, cognome)')
      .eq('club_id', clubId)
      .order('data_scadenza'),
    supabase
      .from('giocatori')
      .select('id, nome, cognome')
      .eq('club_id', clubId)
      .eq('attivo', true)
      .order('cognome'),
  ])

  if (e1) return Response.json({ error: e1.message }, { status: 500 })
  if (e2) return Response.json({ error: e2.message }, { status: 500 })

  return Response.json({ certificati: certificati ?? [], giocatori: giocatori ?? [] })
}

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { giocatore_id, tipo, data_rilascio, data_scadenza, medico, struttura, note, documento_url } = body

  if (!giocatore_id || !data_rilascio || !data_scadenza) {
    return Response.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { clubId } = ctx

  const { error } = await supabase.from('certificati_medici').insert({
    giocatore_id,
    club_id: clubId,
    tipo: tipo ?? 'agonistico',
    data_rilascio,
    data_scadenza,
    medico:       medico       || null,
    struttura:    struttura    || null,
    note:         note         || null,
    documento_url: documento_url || null,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
