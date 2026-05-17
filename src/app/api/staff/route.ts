import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const ALL_STAFF_ROLES = ['presidente', 'ds', 'allenatore', 'segretario', 'team_manager', 'ufficio_stampa', 'medico']

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const url = new URL(req.url)
  const ruoliParam = url.searchParams.get('ruoli')
  const ruoli = ruoliParam ? ruoliParam.split(',').filter(r => ALL_STAFF_ROLES.includes(r)) : ALL_STAFF_ROLES

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('utenti')
    .select('id, nome, cognome, ruolo')
    .eq('club_id', clubId)
    .in('ruolo', ruoli)
    .eq('attivo', true)
    .order('cognome')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
