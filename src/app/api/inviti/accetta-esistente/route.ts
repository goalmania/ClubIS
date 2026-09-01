import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_CLUB_COOKIE, DEVICE_ID_COOKIE, readDeviceId } from '@/lib/multi-club'
import { randomUUID } from 'crypto'
import { collegaAllenatoreCategoria } from '@/lib/settore-giovanile'

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
    .select('id, ruolo, usato, scadenza, club_id, giocatore_id, categoria_federale')
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

  // Aggiorna utenti.club_id E utenti.ruolo al nuovo club/ruolo — tutte le
  // pagine esistenti leggono da questi campi (incluso il redirect di
  // /dashboard che sceglie la dashboard in base a utenti.ruolo), quindi
  // senza aggiornare anche il ruolo un utente esistente con un ruolo diverso
  // altrove finiva sempre sulla dashboard del suo VECCHIO ruolo.
  await admin
    .from('utenti')
    .update({ club_id: invito.club_id, ruolo: invito.ruolo })
    .eq('id', user.id)

  // Allenatore scuola calcio: collega automaticamente alla squadra della categoria
  if (invito.ruolo === 'allenatore' && invito.categoria_federale) {
    try {
      await collegaAllenatoreCategoria(admin, {
        clubId:            invito.club_id,
        allenatoreId:      user.id,
        categoriaFederale: invito.categoria_federale,
      })
    } catch {}
  }

  // Marca invito come usato
  await admin
    .from('inviti_club')
    .update({ usato: true, usato_da: user.id, usato_at: now })
    .eq('id', invito.id)

  const deviceId = readDeviceId() ?? randomUUID()
  await admin
    .from('user_device_clubs')
    .upsert({ user_id: user.id, device_id: deviceId, club_id: invito.club_id, updated_at: new Date().toISOString() },
             { onConflict: 'user_id,device_id' })

  const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 365 }
  const res = NextResponse.json({ ok: true, club_id: invito.club_id })
  res.cookies.set(ACTIVE_CLUB_COOKIE, invito.club_id, cookieOpts)
  res.cookies.set(DEVICE_ID_COOKIE, deviceId, cookieOpts)
  return res
}
