import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()
  if (!utente) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { partita_id, giocatori, staff } = body

  if (!partita_id || !Array.isArray(giocatori)) {
    return NextResponse.json({ error: 'partita_id e giocatori sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('distinte_gara')
    .upsert(
      {
        club_id: utente.club_id,
        partita_id,
        giocatori_snapshot: giocatori,
        staff_snapshot: staff ?? {},
        generata_da: user.id,
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
