import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { canAccess } from '@/lib/features'

const STATI_VALIDI = ['in_osservazione', 'interessante', 'da_contattare', 'archiviato']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canAccess('scouting_report', session.plan)) {
    return NextResponse.json({ error: 'Piano insufficiente. Aggiorna il tuo abbonamento.' }, { status: 403 })
  }

  const sessionClient = createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const { stato_pipeline } = body

  if (!stato_pipeline || !STATI_VALIDI.includes(stato_pipeline)) {
    return NextResponse.json({ error: 'stato_pipeline non valido' }, { status: 400 })
  }

  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 403 })

  const { error } = await supabase
    .from('report_scouting')
    .update({ stato_pipeline })
    .eq('id', params.id)
    .eq('club_richiedente_id', utente.club_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
