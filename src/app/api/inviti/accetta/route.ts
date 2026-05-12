import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/** Endpoint pubblico — accetta un invito e crea l'account utente */
export async function POST(req: Request) {
  const body = await req.json()
  const { token, nome, cognome, email, password } = body as {
    token: string
    nome: string
    cognome: string
    email: string
    password: string
  }

  if (!token || !nome || !cognome || !email || !password) {
    return NextResponse.json({ error: 'Tutti i campi sono obbligatori.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La password deve avere almeno 8 caratteri.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: invito } = await admin
    .from('inviti_club')
    .select('id, ruolo, usato, scadenza, club_id, giocatore_id')
    .eq('token', token)
    .maybeSingle()

  if (!invito) return NextResponse.json({ error: 'Invito non valido.' }, { status: 404 })
  if (invito.usato)  return NextResponse.json({ error: 'Invito già utilizzato.' }, { status: 410 })
  if (invito.scadenza && new Date(invito.scadenza) < new Date()) {
    return NextResponse.json({ error: 'Invito scaduto.' }, { status: 410 })
  }

  // Client admin per creare utente senza conferma email
  

  // 1. Crea l'utente auth (email confermata subito)
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr || !authData.user) {
    const msg = authErr?.message ?? 'Errore creazione account.'
    // Email già in uso → messaggio chiaro
    const friendly = msg.includes('already') || msg.includes('exists')
      ? 'Email già registrata. Prova ad accedere direttamente.'
      : msg
    return NextResponse.json({ error: friendly }, { status: 400 })
  }

  const userId = authData.user.id

  // 2. Crea record in tabella utenti
  const { error: utenteErr } = await admin.from('utenti').insert({
    id:       userId,
    nome,
    cognome,
    email,
    ruolo:    invito.ruolo,
    club_id:  invito.club_id,
  })

  if (utenteErr) {
    // Rollback: elimina utente auth appena creato
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: utenteErr.message }, { status: 500 })
  }

  // 3. Collega giocatore (se presente nell'invito)
  if (invito.giocatore_id) {
    if (invito.ruolo === 'famiglia') {
      // Aggiorna il record famiglie esistente (creato dalla segreteria) con l'auth_user_id
      // Se non esiste ancora un record, lo crea come fallback
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
            .update({ auth_user_id: userId, email, nome, cognome })
            .eq('id', existing.id)
        } else {
          await admin.from('famiglie').insert({
            nome,
            cognome,
            email,
            auth_user_id: userId,
            giocatore_id: invito.giocatore_id,
            club_id:      invito.club_id,
            relazione:    'genitore',
          })
        }
      } catch {}
    } else if (invito.ruolo === 'giocatore') {
      // Collega auth_user_id nella tabella giocatori
      try {
        await admin
          .from('giocatori')
          .update({ auth_user_id: userId })
          .eq('id', invito.giocatore_id)
      } catch {}
    }
  }

  // 4. Marca invito come usato
  await admin
    .from('inviti_club')
    .update({ usato: true })
    .eq('id', invito.id)

  return NextResponse.json({ ok: true })
}
