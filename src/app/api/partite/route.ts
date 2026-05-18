import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  const { data: squadre } = await admin
    .from('squadre')
    .select('id')
    .eq('club_id', clubId)
  const sqIds = (squadre ?? []).map((s: any) => s.id)

  let partiteRows: any[] = []
  if (sqIds.length > 0) {
    const { data } = await admin
      .from('partite')
      .select('id, competizione, avversario, data_ora, casa_trasferta, squadra_id')
      .in('squadra_id', sqIds)
      .order('data_ora', { ascending: true })
      .limit(60)
    partiteRows = (data ?? []).map((p: any) => ({ ...p, source: 'partite' }))
  }

  const { data: eventiData } = await admin
    .from('eventi_calendario')
    .select('id, data_ora_inizio, luogo_testo, note')
    .eq('club_id', clubId)
    .eq('tipologia', 'partita')
    .order('data_ora_inizio', { ascending: true })
    .limit(60)

  const calendarioRows = (eventiData ?? []).map((e: any) => ({
    id: e.id,
    competizione: 'Calendario',
    avversario: e.luogo_testo || e.note || 'Partita',
    data_ora: e.data_ora_inizio,
    casa_trasferta: 'casa',
    squadra_id: null,
    source: 'calendario',
  }))

  const tutte = [...partiteRows, ...calendarioRows].sort(
    (a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime(),
  )

  return Response.json(tutte)
}
