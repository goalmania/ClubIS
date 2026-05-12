import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('manutenzioni')
    .select('*, inserita_da_utente:utenti!inserita_da(nome, cognome)')
    .eq('club_id', ctx.clubId)
    .order('data_intervento', { ascending: false })

  return Response.json({ manutenzioni: data ?? [] })
}

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('manutenzioni')
    .insert({
      club_id: ctx.clubId,
      inserita_da: ctx.userId,
      area: body.area,
      tipo_intervento: body.tipo_intervento,
      fornitore: body.fornitore ?? null,
      costo_preventivo: body.costo_preventivo ?? null,
      costo_consuntivo: body.costo_consuntivo ?? null,
      data_intervento: body.data_intervento,
      data_prossima_scad: body.data_prossima_scad ?? null,
      note: body.note ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ manutenzione: data }, { status: 201 })
}
