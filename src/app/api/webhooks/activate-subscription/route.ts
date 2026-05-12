import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/webhooks/activate-subscription
 *
 * Chiamato da dmfootballservices.com quando un utente acquista o rinnova
 * un abbonamento ClubIS e/o DMScout.
 * Protetto da ADMIN_SECRET_KEY.
 *
 * Body:
 *   email              string   — email del presidente del club
 *   plan_tier          "starter" | "pro" | "elite"
 *   current_period_end string   — ISO date, scadenza abbonamento (opzionale)
 *   includes_dmscout   boolean  — true se il piano include anche DM Scout
 *
 * Response 200: { ok: true, club_id, plan_tier, plan_status, dmscout_activated }
 * Response 404: { error: "Nessun account trovato per questa email" }
 */

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
    plan_tier: string
    current_period_end?: string | null
    includes_dmscout?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  const { email, plan_tier, current_period_end, includes_dmscout } = body
  const emailNorm = email?.toLowerCase().trim()

  if (!emailNorm || !plan_tier) {
    return NextResponse.json({ error: 'Campi obbligatori: email, plan_tier' }, { status: 400 })
  }

  const VALID_TIERS = ['starter', 'pro', 'elite']
  if (!VALID_TIERS.includes(plan_tier)) {
    return NextResponse.json(
      { error: `plan_tier non valido. Valori: ${VALID_TIERS.join(', ')}` },
      { status: 400 }
    )
  }

  const db = createAdminClient()

  // ── Trova il club tramite email presidente ─────────────────
  const { data: utente } = await db
    .from('utenti')
    .select('club_id')
    .eq('email', emailNorm)
    .eq('ruolo', 'presidente')
    .maybeSingle()

  if (!utente?.club_id) {
    return NextResponse.json(
      { error: 'Nessun account presidente trovato per questa email.' },
      { status: 404 }
    )
  }

  // ── Attiva abbonamento ClubIS ──────────────────────────────
  const updatePayload: Record<string, unknown> = {
    plan_status: 'active',
    plan_tier,
    piano_abbonamento: plan_tier === 'starter' ? 'base' : plan_tier,
  }

  if (current_period_end) {
    updatePayload.current_period_end = current_period_end
    updatePayload.abbonamento_scadenza = current_period_end
  }

  // Attiva DMScout sul club ClubIS se incluso nel piano
  if (includes_dmscout) {
    updatePayload.dmscout_abbonamento_attivo  = true
    updatePayload.dmscout_abbonamento_scadenza = current_period_end
      ? current_period_end.slice(0, 10)
      : null
  }

  const { data: club, error } = await db
    .from('clubs')
    .update(updatePayload)
    .eq('id', utente.club_id)
    .select('id, nome, plan_tier, plan_status, current_period_end')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Assicura account DMScout (se non esiste già) ───────────
  let dmscoutActivated = false
  if (includes_dmscout) {
    const dmDb = createDMScoutAdminClient()
    if (dmDb) {
      // Verifica se l'utente esiste già in DMScout
      const { data: { users } } = await dmDb.auth.admin.listUsers()
      const dmscoutUserExists = users.some(u => u.email === emailNorm)

      if (!dmscoutUserExists) {
        // Crea account DMScout con password temporanea — l'utente la cambierà
        const tempPassword = `DM${Math.random().toString(36).slice(2, 10).toUpperCase()}!`
        const { data: dmAuth, error: dmErr } = await dmDb.auth.admin.createUser({
          email: emailNorm,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { org_type: 'club', org_name: club.nome },
        })
        if (!dmErr && dmAuth.user) {
          await dmDb.from('profiles').insert({
            user_id: dmAuth.user.id,
            org_type: 'club',
            org_name: club.nome,
            display_name: club.nome,
          })
          dmscoutActivated = true
        }
      } else {
        dmscoutActivated = true // già esistente
      }
    }
  }

  return NextResponse.json({
    ok: true,
    club_id: club.id,
    club_nome: club.nome,
    plan_tier: club.plan_tier,
    plan_status: club.plan_status,
    current_period_end: club.current_period_end,
    dmscout_activated: dmscoutActivated,
  })
}
