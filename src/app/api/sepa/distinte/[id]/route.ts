import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const { stato } = await req.json()

  const STATI_VALIDI = ['generata', 'inviata_banca', 'eseguita']
  if (!STATI_VALIDI.includes(stato))
    return Response.json({ error: 'Stato non valido' }, { status: 400 })

  const { data, error } = await admin.from('distinte_sepa')
    .update({ stato }).eq('id', params.id).eq('club_id', clubId).select('id, stato').single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
