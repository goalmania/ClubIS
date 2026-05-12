import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function POST(
  req: Request,
  { params }: { params: { documentoId: string } }
) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: stato } = await supabase
    .from('documenti_stato_utente')
    .select('is_preferito')
    .eq('utente_id', ctx.userId)
    .eq('documento_id', params.documentoId)
    .maybeSingle()

  const nuovoStato = !(stato?.is_preferito ?? false)

  await supabase.from('documenti_stato_utente').upsert({
    utente_id:    ctx.userId,
    club_id:      ctx.clubId,
    documento_id: params.documentoId,
    is_preferito: nuovoStato,
  }, { onConflict: 'utente_id,documento_id' })

  return Response.json({ is_preferito: nuovoStato })
}
