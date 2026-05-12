import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getClubFromSession } from '@/lib/server-helpers'
import { canAccess } from '@/lib/features'

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canAccess('scouting_report', session.plan)) {
    return NextResponse.json({ error: 'Piano insufficiente. Aggiorna il tuo abbonamento.' }, { status: 403 })
  }

  const { id, esito } = await req.json()
  if (!id || !esito) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('report_scouting').update({ esito }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
