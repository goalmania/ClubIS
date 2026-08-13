import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clubCapFor } from '@/lib/plan-caps'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()

  // Verifica che l'utente sia super_admin
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!utente?.is_super_admin) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const body = await req.json()
  const {
    nome, nome_esteso, citta, provincia, regione,
    categoria, genere, piano_abbonamento, figc_codice,
    email_ufficiale, telefono, abbonamento_scadenza,
    presidente_email, presidente_password,
    presidente_nome, presidente_cognome,
    is_demo_account,
  } = body

  if (!nome || !citta || !presidente_email || !presidente_password || !presidente_nome || !presidente_cognome) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  // 1. Trova utente esistente o creane uno nuovo
  let authUserId: string

  const { data: listData } = await supabase.auth.admin.listUsers()
  const existing = listData?.users?.find(u => u.email === presidente_email)

  // piano_abbonamento (enum DB, dal form admin) usa 'base'/'pro'/'elite';
  // plan_tier (logica di abbonamento e cap club) usa 'starter'/'pro'/'elite'.
  // I due campi NON condividono lo stesso set di valori: vanno mappati.
  const pianoInput = piano_abbonamento || 'pro'
  const tier = pianoInput === 'base' ? 'starter' : pianoInput

  if (existing) {
    // Utente già esistente (es. multi-club) — verifica il cap club del piano
    // prima di aggiungere un altro club al suo account.
    const { count: clubAttuali } = await supabase
      .from('user_clubs')
      .select('club_id', { count: 'exact', head: true })
      .eq('user_id', existing.id)
      .eq('status', 'accepted')
      .in('role', ['presidente', 'segretario'])

    const cap = clubCapFor(tier)
    if ((clubAttuali ?? 0) + 1 > cap) {
      return NextResponse.json(
        {
          error: `Cap raggiunto: il piano "${tier}" consente al massimo ${cap === Infinity ? '∞' : cap} club per account. ` +
                 `Questo account ne ha già ${clubAttuali}. Passa a un piano superiore per aggiungerne altri.`,
        },
        { status: 409 }
      )
    }

    authUserId = existing.id
  } else {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: presidente_email,
      password: presidente_password,
      email_confirm: true,
    })
    if (authError) {
      return NextResponse.json({ error: `Errore creazione utente: ${authError.message}` }, { status: 500 })
    }
    authUserId = authData.user.id
  }

  // 2. Crea il club
  const { data: nuovoClub, error: clubError } = await supabase
    .from('clubs')
    .insert({
      nome,
      nome_esteso: nome_esteso || null,
      citta,
      provincia: provincia || null,
      regione: regione || null,
      categoria: categoria || 'eccellenza',
      genere: genere === 'femminile' ? 'femminile' : 'maschile',
      piano_abbonamento: pianoInput,
      plan_tier: tier,
      plan_status: 'active',
      onboarding_completed: true,
      figc_codice: figc_codice || null,
      email_ufficiale: email_ufficiale || null,
      telefono: telefono || null,
      abbonamento_scadenza: abbonamento_scadenza || null,
    })
    .select('id')
    .single()

  if (clubError) {
    return NextResponse.json({ error: `Errore creazione club: ${clubError.message}` }, { status: 500 })
  }

  // 3. Upsert record utente — aggiorna sempre club_id al nuovo club
  const { error: utenteError } = await supabase
    .from('utenti')
    .upsert({
      id:       authUserId,
      club_id:  nuovoClub.id,
      nome:     presidente_nome,
      cognome:  presidente_cognome,
      email:    presidente_email,
      ruolo:    'presidente',
      ...(is_demo_account ? { is_demo_account: true } : {}),
    }, { onConflict: 'id' })

  if (utenteError) {
    return NextResponse.json({ error: `Errore creazione profilo: ${utenteError.message}` }, { status: 500 })
  }

  // 4. Inserisci in user_clubs — necessario per il ClubSwitcher
  await supabase
    .from('user_clubs')
    .upsert({
      user_id:    authUserId,
      club_id:    nuovoClub.id,
      role:       'presidente',
      status:     'accepted',
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,club_id' })

  return NextResponse.json({ ok: true, club_id: nuovoClub.id })
}
