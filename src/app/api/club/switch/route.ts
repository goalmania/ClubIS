import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_CLUB_COOKIE } from '@/lib/multi-club'

export async function POST(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { club_id } = await req.json() as { club_id: string }
  if (!club_id) return NextResponse.json({ error: 'club_id mancante' }, { status: 400 })

  // Verifica che l'utente abbia accesso al club richiesto
  const db = createAdminClient()
  const { data } = await db
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('club_id', club_id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'Accesso al club non autorizzato' }, { status: 403 })
  }

  // Aggiorna utenti.club_id al club selezionato — tutte le pagine esistenti
  // già leggono il club_id da questa riga, quindi non serve toccarle.
  await db
    .from('utenti')
    .update({ club_id })
    .eq('id', user.id)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACTIVE_CLUB_COOKIE, club_id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
