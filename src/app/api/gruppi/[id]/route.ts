// src/app/api/gruppi/[id]/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx

  const body     = await req.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('gruppi').update(body).eq('id', params.id).eq('club_id', clubId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx

  const supabase = createAdminClient()
  // Verify gruppo belongs to this club before deleting members
  const { data: gruppo } = await supabase.from('gruppi').select('id').eq('id', params.id).eq('club_id', clubId).single()
  if (!gruppo) return Response.json({ error: 'Non trovato' }, { status: 404 })

  await supabase.from('gruppi_membri').delete().eq('gruppo_id', params.id)
  const { error } = await supabase.from('gruppi').delete().eq('id', params.id).eq('club_id', clubId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
