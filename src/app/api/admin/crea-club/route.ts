import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    categoria, piano_abbonamento, figc_codice,
    email_ufficiale, telefono, abbonamento_scadenza,
    presidente_email, presidente_password,
    presidente_nome, presidente_cognome,
  } = body

  if (!nome || !citta || !presidente_email || !presidente_password || !presidente_nome || !presidente_cognome) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  // 1. Crea il club
  const { data: nuovoClub, error: clubError } = await supabase
    .from('clubs')
    .insert({
      nome,
      nome_esteso: nome_esteso || null,
      citta,
      provincia: provincia || null,
      regione: regione || null,
      categoria: categoria || 'eccellenza',
      piano_abbonamento: piano_abbonamento || 'base',
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

  // 2. Crea l'utente auth tramite admin API (service role necessario)
  // Nota: con anon key non possiamo creare utenti, usiamo signUp
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: presidente_email,
    password: presidente_password,
    email_confirm: true,
  })

  if (authError) {
    // Rollback: elimina il club appena creato
    await supabase.from('clubs').delete().eq('id', nuovoClub.id)
    return NextResponse.json({ error: `Errore creazione utente: ${authError.message}` }, { status: 500 })
  }

  // 3. Crea il record utente
  const { error: utenteError } = await supabase
    .from('utenti')
    .insert({
      id: authData.user.id,
      club_id: nuovoClub.id,
      nome: presidente_nome,
      cognome: presidente_cognome,
      email: presidente_email,
      ruolo: 'presidente',
    })

  if (utenteError) {
    return NextResponse.json({ error: `Errore creazione profilo: ${utenteError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, club_id: nuovoClub.id })
}
