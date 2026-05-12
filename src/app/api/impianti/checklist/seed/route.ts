import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { CHECKLIST_DEFAULT } from '@/lib/impianti'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Endpoint non disponibile' }, { status: 404 })
  }
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!['presidente', 'ds', 'segretario'].includes(ctx.ruolo) && !ctx.isSuperAdmin) {
    return Response.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const supabase = createAdminClient()

  const { count } = await supabase
    .from('checklist_template')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', ctx.clubId)

  if ((count ?? 0) > 0) {
    return Response.json({ msg: 'Template già presenti', count })
  }

  const records = CHECKLIST_DEFAULT.map(t => ({
    club_id: ctx.clubId,
    nome: t.nome,
    frequenza: t.frequenza,
    area: t.area,
    voci: t.voci,
    attivo: true,
  }))

  const { data, error } = await supabase
    .from('checklist_template')
    .insert(records)
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ creati: data?.length ?? 0 })
}
