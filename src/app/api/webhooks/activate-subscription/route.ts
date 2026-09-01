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

  // ── Trova l'utente tramite email ─────────────────────────────
  // Non filtriamo più per ruolo='presidente': il ruolo principale mostrato
  // in dashboard (utenti.ruolo) è indipendente da chi gestisce/paga
  // l'abbonamento — un account può avere ruolo "segretario" come vista
  // primaria pur essendo il titolare dell'abbonamento (vedi user_clubs
  // sotto, che è la vera fonte di verità sui club posseduti).
  const { data: utente } = await db
    .from('utenti')
    .select('id, club_id')
    .eq('email', emailNorm)
    .maybeSingle()

  if (!utente) {
    return NextResponse.json(
      { error: 'Nessun account trovato per questa email.' },
      { status: 404 }
    )
  }

  // ── Trova TUTTI i club dell'account (abbonamento per-account, non per-club) ──
  // utenti.club_id è solo il puntatore al club "attivo" sul dispositivo corrente
  // (vedi src/lib/multi-club.ts) — un account multi-club deve sbloccare ogni
  // suo club con un solo pagamento. Consideriamo "titolare" un membership con
  // ruolo presidente O segretario (i due ruoli usati in questo progetto come
  // vista primaria di chi possiede/gestisce l'account) — non un ruolo
  // qualsiasi, per non sbloccare per errore un club dove questa email è
  // solo staff invitato (es. allenatore, medico) di un titolare diverso.
  const RUOLI_TITOLARE = ['presidente', 'segretario']
  const { data: membership } = await db
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', utente.id)
    .eq('status', 'accepted')
    .in('role', RUOLI_TITOLARE)

  const clubIds = Array.from(new Set([
    ...(membership?.map(m => m.club_id) ?? []),
    ...(utente.club_id ? [utente.club_id] : []),
  ]))

  if (clubIds.length === 0) {
    return NextResponse.json(
      { error: 'Nessun club associato a questo account.' },
      { status: 404 }
    )
  }

  // ── Attiva abbonamento ClubIS su tutti i club dell'account ──
  const updatePayload: Record<string, unknown> = {
    plan_status: 'active',
    plan_tier,
    piano_abbonamento: plan_tier === 'starter' ? 'base' : plan_tier,
  }

  if (current_period_end) {
    updatePayload.current_period_end = current_period_end
    updatePayload.abbonamento_scadenza = current_period_end
  }

  // Attiva DMScout su tutti i club ClubIS dell'account se incluso nel piano
  if (includes_dmscout) {
    updatePayload.dmscout_abbonamento_attivo  = true
    updatePayload.dmscout_abbonamento_scadenza = current_period_end
      ? current_period_end.slice(0, 10)
      : null
  }

  const { data: clubsUpdated, error } = await db
    .from('clubs')
    .update(updatePayload)
    .in('id', clubIds)
    .select('id, nome, plan_tier, plan_status, current_period_end')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!clubsUpdated || clubsUpdated.length === 0) {
    return NextResponse.json({ error: 'Nessun club aggiornato.' }, { status: 404 })
  }

  const club = clubsUpdated[0]

  // ── Assicura account DMScout (se non esiste già) ───────────
  let dmscoutActivated = false
  if (includes_dmscout) {
    const dmDb = createDMScoutAdminClient()
    if (dmDb) {
      // Verifica se l'utente esiste già in DMScout
      const { data: { users } } = await dmDb.auth.admin.listUsers()
      const dmscoutUserExists = users.some(u => u.email === emailNorm)

      const profileUpdate = {
        plan_status: 'active',
        ...(current_period_end ? { current_period_end } : {}),
      }

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
            ...profileUpdate,
          })
          dmscoutActivated = true
        }
      } else {
        // Account già esistente: aggiorna piano
        const dmUser = users.find((u: { email?: string }) => u.email === emailNorm)
        if (dmUser) {
          await dmDb.from('profiles').update(profileUpdate).eq('user_id', dmUser.id)
        }
        dmscoutActivated = true
      }
    }
  }

  return NextResponse.json({
    ok: true,
    // Campi storici (compatibilità con chiamanti esistenti): riferiti al primo club.
    club_id: club.id,
    club_nome: club.nome,
    plan_tier: club.plan_tier,
    plan_status: club.plan_status,
    current_period_end: club.current_period_end,
    dmscout_activated: dmscoutActivated,
    // Abbonamento per-account: elenco di TUTTI i club sbloccati da questo pagamento.
    clubs_activated: clubsUpdated.map(c => ({ club_id: c.id, club_nome: c.nome })),
  })
}
