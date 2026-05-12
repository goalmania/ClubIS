import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/set-plan
 *
 * Imposta manualmente il piano di un club.
 * Protetto da ADMIN_SECRET_KEY — solo Paolo lo chiama via Postman / script.
 *
 * Body: { club_id, plan_tier, plan_status, current_period_end? }
 * Header: Authorization: Bearer <ADMIN_SECRET_KEY>
 */
export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'ADMIN_SECRET_KEY non configurata' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  if (token !== adminKey) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  let body: {
    club_id: string
    plan_tier: string
    plan_status: string
    current_period_end?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  const { club_id, plan_tier, plan_status, current_period_end } = body

  if (!club_id || !plan_tier || !plan_status) {
    return NextResponse.json({ error: 'Campi obbligatori: club_id, plan_tier, plan_status' }, { status: 400 })
  }

  const VALID_TIERS   = ['starter', 'pro', 'elite']
  const VALID_STATUSES = ['active', 'inactive', 'trial', 'expired']

  if (!VALID_TIERS.includes(plan_tier)) {
    return NextResponse.json({ error: `plan_tier non valido. Valori: ${VALID_TIERS.join(', ')}` }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(plan_status)) {
    return NextResponse.json({ error: `plan_status non valido. Valori: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const db = createAdminClient()

  const updatePayload: Record<string, unknown> = {
    plan_tier,
    plan_status,
    // aggiorna anche il campo legacy per compatibilità con le query esistenti
    piano_abbonamento: plan_tier === 'starter' ? 'base' : plan_tier === 'pro' ? 'pro' : 'elite',
  }

  if (current_period_end !== undefined) {
    updatePayload.current_period_end = current_period_end
  }

  const { data, error } = await db
    .from('clubs')
    .update(updatePayload)
    .eq('id', club_id)
    .select('id, nome, plan_tier, plan_status, current_period_end, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    club: data,
    message: `Piano aggiornato: ${plan_tier} / ${plan_status}`,
  })
}
