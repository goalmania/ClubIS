import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()
  const { data } = await admin.from('distinte_sepa')
    .select('id, message_id, data_generazione, data_esecuzione, numero_transazioni, importo_totale, stato, rimborsi_ids')
    .eq('club_id', clubId)
    .order('data_generazione', { ascending: false })
    .limit(50)

  return Response.json(data ?? [])
}
