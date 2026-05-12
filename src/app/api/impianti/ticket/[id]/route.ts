import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const supabase = createAdminClient()

  const aggiornamenti: Record<string, any> = { updated_at: new Date().toISOString() }

  if (body.stato) aggiornamenti.stato = body.stato
  if (body.assegnato_a) aggiornamenti.assegnato_a = body.assegnato_a
  if (body.note_risoluzione) aggiornamenti.note_risoluzione = body.note_risoluzione
  if (body.stato === 'risolto') {
    aggiornamenti.data_risoluzione = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('ticket_impianto')
    .update(aggiornamenti)
    .eq('id', params.id)
    .eq('club_id', ctx.clubId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ticket: data })
}
