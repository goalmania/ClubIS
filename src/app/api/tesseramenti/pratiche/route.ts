import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'
import { stagioneCorrente } from '@/lib/helpers'

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statoPratica = searchParams.get('stato_pratica')
  const stagione = searchParams.get('stagione') ?? stagioneCorrente()

  const supabase = createAdminClient()

  let query = supabase
    .from('tesseramenti')
    .select(`
      id, tipo_pratica, stato_pratica, motivo_blocco,
      documenti_mancanti, note_figc, stagione, data_inizio,
      giocatori(id, nome, cognome, ruolo_principale, codice_fiscale)
    `)
    .eq('club_id', ctx.clubId)
    .eq('stagione', stagione)
    .order('created_at', { ascending: false })

  if (statoPratica) query = query.eq('stato_pratica', statoPratica)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ pratiche: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  if (!body.id) return Response.json({ error: 'ID mancante' }, { status: 400 })

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('tesseramenti')
    .update({
      stato_pratica: body.stato_pratica,
      motivo_blocco: body.motivo_blocco ?? null,
      documenti_mancanti: body.documenti_mancanti ?? [],
      note_figc: body.note_figc ?? null,
    })
    .eq('id', body.id)
    .eq('club_id', ctx.clubId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ pratica: data })
}
