import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // ── 1. Verifica autenticazione ────────────────────────────────────────────
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // ── 2. Verifica che il chiamante sia presidente ───────────────────────────
  const { data: caller } = await admin
    .from('utenti')
    .select('club_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!caller) {
    return NextResponse.json({ error: 'Profilo chiamante non trovato.' }, { status: 403 })
  }
  if (caller.ruolo !== 'presidente') {
    return NextResponse.json(
      { error: 'Accesso negato: solo il presidente può eliminare account.' },
      { status: 403 }
    )
  }

  // ── 3. Legge l'id dell'utente da eliminare ────────────────────────────────
  let utente_id: string
  try {
    const body = await req.json()
    utente_id = body.utente_id
  } catch {
    return NextResponse.json({ error: 'Body non valido.' }, { status: 400 })
  }
  if (!utente_id || typeof utente_id !== 'string') {
    return NextResponse.json({ error: 'utente_id mancante o non valido.' }, { status: 400 })
  }

  // ── 4. Verifica che non stia cercando di eliminare se stesso ─────────────
  if (utente_id === user.id) {
    return NextResponse.json(
      { error: 'Non puoi eliminare il tuo account da questa interfaccia.' },
      { status: 403 }
    )
  }

  // ── 5. Carica l'utente target e verifica club e ruolo ────────────────────
  const { data: target } = await admin
    .from('utenti')
    .select('club_id, ruolo, nome, cognome')
    .eq('id', utente_id)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Utente da eliminare non trovato.' }, { status: 404 })
  }
  if (target.club_id !== caller.club_id) {
    return NextResponse.json(
      { error: 'Utente non appartiene al tuo club.' },
      { status: 403 }
    )
  }
  if (target.ruolo === 'presidente') {
    return NextResponse.json(
      { error: 'Non è possibile eliminare un account presidente.' },
      { status: 403 }
    )
  }

  // ── 6. Nullifica FK senza ON DELETE SET NULL prima di cancellare ──────────
  // compensi.collaboratore_id, presenze.registrato_da, pagamenti.registrato_da
  // e prima_nota.registrato_da non hanno ON DELETE SET NULL nello schema,
  // quindi PostgreSQL blocca il DELETE su utenti finché non vengono azzerati.
  await Promise.all([
    admin.from('compensi').update({ collaboratore_id: null }).eq('collaboratore_id', utente_id),
    admin.from('presenze').update({ registrato_da: null }).eq('registrato_da', utente_id),
    admin.from('pagamenti').update({ registrato_da: null }).eq('registrato_da', utente_id),
    admin.from('prima_nota').update({ registrato_da: null }).eq('registrato_da', utente_id),
  ])

  // ── 7. Elimina prima il profilo da public.utenti, poi l'auth user ─────────
  const { error: profileErr } = await admin
    .from('utenti')
    .delete()
    .eq('id', utente_id)

  if (profileErr) {
    return NextResponse.json(
      { error: `Errore rimozione profilo: ${profileErr.message}` },
      { status: 500 }
    )
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(utente_id)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    nome: `${target.nome} ${target.cognome}`,
  })
}
