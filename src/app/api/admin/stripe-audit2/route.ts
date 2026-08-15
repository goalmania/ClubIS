import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/stripe-audit2
 *
 * Diagnostica TEMPORANEA sola lettura, protetta da ADMIN_SECRET_KEY:
 * verifica se esiste un Webhook Endpoint Stripe configurato verso questo
 * dominio e quali eventi ascolta — senza questo, un pagamento reale non
 * attiva mai nulla lato ClubIS. Da rimuovere a lavoro finito.
 */
async function stripeGet(path: string) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY non configurata')
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe ${path}: ${data.error?.message ?? res.statusText}`)
  return data
}

export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!adminKey || token !== adminKey) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const endpoints = await stripeGet('/v1/webhook_endpoints?limit=20')
    return NextResponse.json({
      endpoints: endpoints.data.map((e: any) => ({
        id: e.id, url: e.url, status: e.status, enabled_events: e.enabled_events,
      })),
      webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
