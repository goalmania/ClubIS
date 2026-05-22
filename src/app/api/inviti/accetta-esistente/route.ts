import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_CLUB_COOKIE } from '@/lib/multi-club'

/**
 * Accetta un invito per un utente che ha già un account ClubIS.
 * Richiede sessione auth attiva.
 */
export async function POST(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Devi essere loggato per accettare l\'invito.' }, { status: 401 })

  const { token } = await req.json() as { token: string }
  if (!token) return NextResponse.json({ error: 'Token mancante.' }, { status: 400 })

  const admin = createAdminClient()

  // Valida l'invito
  const { data: invito } = await admin
    .from('inviti_club')
    .select('id, ruolo, usato, scadenza, club_id, giocatore_id')
    .eq('token', token)
    .maybeSingle()

  if (!invito)           return NextResponse.json({ error: 'Invito non valido.' }, { status: 404 })
  if (invito.usato)      return NextResponse.json({ error: 'Invito già utilizzato.' }, { status: 410 })
  if (invito.scadenza && new Date(invito.scadenza) < new Date()) {
    return NextResponse.json({ error: 'Invito scaduto.' }, { status: 410 })
  }

  const now = new Date().toISOString()

  // Upsert in user_clubs (potrebbe già esistere se era pending)
  const { error: ucErr } = await admin
    .from('user_clubs')
    .upsert({
      user_id:     user.id,
      club_id:     invito.club_id,
      role:        invito.ruolo,
      status:      'accepted',
      accepted_at: now,
    }, { onConflict: 'user_id,club_id' })

  if (ucErr) return NextResponse.json({ error: ucErr.message }, { status: 500 })

  // Collega giocatore se presente (es. invito famiglia)
  if (invito.giocatore_id) {
    if (invito.ruolo === 'famiglia') {
      try {
        const { data: existing } = await admin
          .from('famiglie')
          .select('id')
          .eq('giocatore_id', invito.giocatore_id)
          .is('auth_user_id', null)
          .maybeSingle()

        if (existing) {
          await admin
            .from('famiglie')
            .update({ auth_user_id: user.id })
            .eq('id', existing.id)
        }
      } catch {}
    } else if (invito.ruolo === 'giocatore') {
      try {
        await admin
          .from('giocatori')
          .update({ auth_user_id: user.id })
          .eq('id', invito.giocatore_id)
      } catch {}
    }
  }

  // Aggiorna utenti.club_id al nuovo club — tutte le pagine esistenti
  // leggono già da questo campo, quindi vedranno subito i dati corretti.
  await admin
    .from('utenti')
    .update({ club_id: invito.club_id })
    .eq('id', user.id)

  // Marca invito come usato
  await admin
    .from('inviti_club')
    .update({ usato: true, usato_da: user.id, usato_at: now })
    .eq('id', invito.id)

  const res = NextResponse.json({ ok: true, club_id: invito.club_id })
  res.cookies.set(ACTIVE_CLUB_COOKIE, invito.club_id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
