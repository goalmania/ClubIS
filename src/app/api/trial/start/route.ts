import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/trial/start
 *
 * Chiamato da dmfootballservices.com quando un utente avvia la prova gratuita.
 * Protetto da ADMIN_SECRET_KEY.
 *
 * Body:
 *   email            string  — email del presidente
 *   password         string  — password iniziale
 *   nome             string
 *   cognome          string
 *   club_nome        string
 *   club_categoria   string  — es. "eccellenza" (default)
 *   product          "clubis" | "dmscout" | "both"
 *   trial_days       number  — durata prova in giorni (default 14)
 *
 * Response 200: { ok: true, clubis_login_url, dmscout_login_url?, trial_ends_at, club_id }
 * Response 409: { error: "Trial già utilizzato per questa email" }
 * Response 4xx: errori di validazione / autenticazione
 */

/** Client admin per DMScout (Supabase progetto separato) */
function createDMScoutAdminClient() {
  const url = process.env.DMSCOUT_SUPABASE_URL
  const key = process.env.DMSCOUT_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  // ── Autenticazione ─────────────────────────────────────────
  const adminKey = process.env.ADMIN_SECRET_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'ADMIN_SECRET_KEY non configurata' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (token !== adminKey) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // ── Parsing body ───────────────────────────────────────────
  let body: {
    email: string
    password: string
    nome: string
    cognome: string
    club_nome: string
    club_categoria?: string
    product: 'clubis' | 'dmscout' | 'both'
    trial_days?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  const { email, password, nome, cognome, club_nome, club_categoria, product, trial_days } = body
  const emailNorm = email?.toLowerCase().trim()

  if (!emailNorm || !password || !nome || !cognome || !club_nome || !product) {
    return NextResponse.json(
      { error: 'Campi obbligatori: email, password, nome, cognome, club_nome, product' },
      { status: 400 }
    )
  }
  if (!['clubis', 'dmscout', 'both'].includes(product)) {
    return NextResponse.json(
      { error: 'product deve essere: clubis, dmscout o both' },
      { status: 400 }
    )
  }

  const db = createAdminClient()
  const giorni = typeof trial_days === 'number' && trial_days > 0 ? trial_days : 7
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + giorni)
  const trialEndsAtIso = trialEndsAt.toISOString()

  const includeClubIS  = product === 'clubis' || product === 'both'
  const includeDMScout = product === 'dmscout' || product === 'both'

  // ── 1. Verifica unicità trial per email ────────────────────
  const { data: existing } = await db
    .from('trial_registrations')
    .select('id')
    .eq('email', emailNorm)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Prova gratuita già utilizzata per questa email.' },
      { status: 409 }
    )
  }

  let clubId: string | null = null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clubis.app'
  const dmscoutUrl = process.env.NEXT_PUBLIC_DMSCOUT_URL ?? 'https://dmscout.app'

  // ══════════════════════════════════════════════════════════
  // BLOCCO CLUBIS
  // ══════════════════════════════════════════════════════════
  if (includeClubIS) {
    // Crea utente Auth ClubIS
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Esiste già un account ClubIS con questa email.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: `Errore creazione account ClubIS: ${authError.message}` }, { status: 500 })
    }

    // Crea club
    const clubPayload: Record<string, unknown> = {
      nome: club_nome,
      categoria: club_categoria ?? 'eccellenza',
      plan_status: 'trial',
      plan_tier: 'elite',
      trial_ends_at: trialEndsAtIso,
      onboarding_completed: false,
    }
    // Se include anche DMScout, attiva subito il campo dmscout sul club
    if (includeDMScout) {
      clubPayload.dmscout_abbonamento_attivo  = true
      clubPayload.dmscout_abbonamento_scadenza = trialEndsAt.toISOString().slice(0, 10)
    }

    const { data: club, error: clubError } = await db
      .from('clubs')
      .insert(clubPayload)
      .select('id')
      .single()

    if (clubError) {
      await db.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: `Errore creazione club: ${clubError.message}` }, { status: 500 })
    }

    clubId = club.id

    // Crea utente (presidente)
    const { error: utenteError } = await db.from('utenti').insert({
      id: authData.user.id,
      club_id: clubId,
      nome,
      cognome,
      email: emailNorm,
      ruolo: 'presidente',
      attivo: true,
      is_super_admin: false,
    })

    if (utenteError) {
      await db.from('clubs').delete().eq('id', clubId)
      await db.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: `Errore creazione profilo: ${utenteError.message}` }, { status: 500 })
    }
  }

  // ══════════════════════════════════════════════════════════
  // BLOCCO DMSCOUT
  // ══════════════════════════════════════════════════════════
  let dmscoutAccountCreated = false
  if (includeDMScout) {
    const dmDb = createDMScoutAdminClient()
    if (dmDb) {
      const { data: dmAuth, error: dmAuthError } = await dmDb.auth.admin.createUser({
        email: emailNorm,
        password,
        email_confirm: true,
        user_metadata: {
          org_type: 'club',
          org_name: club_nome,
          display_name: `${nome} ${cognome}`,
        },
      })

      if (!dmAuthError && dmAuth.user) {
        // Crea profilo DMScout con stato trial
        await dmDb.from('profiles').insert({
          user_id: dmAuth.user.id,
          org_type: 'club',
          org_name: club_nome,
          display_name: `${nome} ${cognome}`,
          plan_status: 'trial',
          trial_ends_at: trialEndsAtIso,
        }).select('id').maybeSingle()

        dmscoutAccountCreated = true
      } else if (!dmAuthError && !dmAuth?.user) {
        // account già esistente: aggiorna solo il piano
        const { data: existingUsers } = await dmDb.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u: { email?: string }) => u.email === emailNorm)
        if (existingUser) {
          await dmDb.from('profiles').update({
            plan_status: 'trial',
            trial_ends_at: trialEndsAtIso,
          }).eq('user_id', existingUser.id)
          dmscoutAccountCreated = true
        }
      }
      // Se la creazione DMScout fallisce non blocchiamo — è best-effort
    }

    // Se ClubIS non è incluso ma DMScout sì → aggiorna club se esiste,
    // altrimenti il campo dmscout lo gestiamo solo a livello DMScout.
    // (caso "solo DMScout": non creiamo club ClubIS)
  }

  // ── Registra il trial (anti-abuso) ────────────────────────
  await db.from('trial_registrations').insert({
    email: emailNorm,
    product,
    club_id: clubId,
  })

  return NextResponse.json({
    ok: true,
    clubis_login_url:  includeClubIS  ? `${siteUrl}/auth/login`  : null,
    dmscout_login_url: includeDMScout ? `${dmscoutUrl}/auth`      : null,
    dmscout_account_created: dmscoutAccountCreated,
    trial_ends_at: trialEndsAtIso,
    trial_days: giorni,
    club_id: clubId,
  })
}
