import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx

  const admin = createAdminClient()
  const { error } = await admin
    .from('inviti_club')
    .delete()
    .eq('id', params.id)
    .eq('club_id', clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
