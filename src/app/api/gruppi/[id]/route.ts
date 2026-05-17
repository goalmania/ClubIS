// src/app/api/gruppi/[id]/route.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body     = await req.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('gruppi').update(body).eq('id', params.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createAdminClient()
  await supabase.from('gruppi_membri').delete().eq('gruppo_id', params.id)
  const { error } = await supabase.from('gruppi').delete().eq('id', params.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
