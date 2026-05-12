import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/expire-trials
 *
 * Eseguito ogni giorno da Vercel Cron (configurato in vercel.json).
 * Marca come 'expired' tutti i club con plan_status = 'trial' e trial_ends_at passato.
 * Il middleware già blocca l'accesso a runtime controllando trial_ends_at,
 * ma questo job aggiorna il DB per consistenza e per permettere query dirette.
 *
 * Protetto da Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date().toISOString()

  const { data: expired, error } = await db
    .from('clubs')
    .update({ plan_status: 'expired' })
    .eq('plan_status', 'trial')
    .lt('trial_ends_at', now)
    .select('id, nome, trial_ends_at')

  if (error) {
    console.error('[expire-trials] Errore aggiornamento:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = expired?.length ?? 0
  console.log(`[expire-trials] Trial scaduti marcati come expired: ${count}`)

  return NextResponse.json({
    ok: true,
    expired_count: count,
    clubs: expired?.map(c => ({ id: c.id, nome: c.nome, trial_ends_at: c.trial_ends_at })),
  })
}
