import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const PIANI_VALIDI = ['starter', 'pro', 'elite'] as const
type Piano = typeof PIANI_VALIDI[number]

const PIANO_TIER: Record<Piano, string> = {
  starter: 'starter',
  pro: 'pro',
  elite: 'elite',
}

export async function POST(req: NextRequest) {
  let body: {
    nome: string
    cognome: string
    email: string
    password: string
    club_nome: string
    club_categoria?: string
    piano?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  const { nome, cognome, email, password, club_nome, club_categoria, piano } = body
  const emailNorm = email?.toLowerCase().trim()

  if (!emailNorm || !password || !nome || !cognome || !club_nome) {
    return NextResponse.json(
      { error: 'Campi obbligatori: nome, cognome, email, password, club_nome' },
      { status: 400 }
    )
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 })
  }

  const pianoScelto: Piano = PIANI_VALIDI.includes(piano as Piano) ? (piano as Piano) : 'pro'

  const db = createAdminClient()

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  // Verifica che email non sia già registrata al trial
  const { data: existing } = await db
    .from('trial_registrations')
    .select('id')
    .eq('email', emailNorm)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Esiste già un account con questa email. Accedi o usa il recupero password.' },
      { status: 409 }
    )
  }

  // Crea utente Auth
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: emailNorm,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json(
        { error: 'Esiste già un account con questa email. Accedi o usa il recupero password.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: `Errore creazione account: ${authError.message}` }, { status: 500 })
  }

  // Crea club con trial
  const { data: club, error: clubError } = await db
    .from('clubs')
    .insert({
      nome: club_nome,
      categoria: club_categoria ?? 'eccellenza',
      plan_status: 'trial',
      plan_tier: PIANO_TIER[pianoScelto],
      trial_ends_at: trialEndsAt.toISOString(),
      onboarding_completato: false,
      onboarding_completed: false,
    })
    .select('id')
    .single()

  if (clubError) {
    await db.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: `Errore creazione club: ${clubError.message}` }, { status: 500 })
  }

  // Crea profilo utente (presidente)
  const { error: utenteError } = await db.from('utenti').insert({
    id: authData.user.id,
    club_id: club.id,
    nome,
    cognome,
    email: emailNorm,
    ruolo: 'presidente',
    attivo: true,
    is_super_admin: false,
  })

  if (utenteError) {
    await db.from('clubs').delete().eq('id', club.id)
    await db.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: `Errore creazione profilo: ${utenteError.message}` }, { status: 500 })
  }

  // Registra per anti-abuso
  await db.from('trial_registrations').insert({
    email: emailNorm,
    product: 'clubis',
    club_id: club.id,
  })

  return NextResponse.json({ ok: true })
}
