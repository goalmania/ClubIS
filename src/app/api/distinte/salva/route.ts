import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId: user_id, clubId } = ctx

  const supabase = createAdminClient()

  const body = await req.json()
  const { partita_id, giocatori, staff } = body

  if (!partita_id || !Array.isArray(giocatori)) {
    return NextResponse.json({ error: 'partita_id e giocatori sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('distinte_gara')
    .upsert(
      {
        club_id: clubId,
        partita_id,
        giocatori_snapshot: giocatori,
        staff_snapshot: staff ?? {},
        generata_da: user_id,
        generata_at: new Date().toISOString(),
        versione: 1,
      },
      { onConflict: 'partita_id,versione' }
    )
    .select('id, versione')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
