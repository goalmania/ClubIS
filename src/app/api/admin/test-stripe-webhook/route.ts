import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/test-stripe-webhook
 *
 * Test end-to-end TEMPORANEO, protetto da ADMIN_SECRET_KEY: crea un account
 * sintetico con 3 club (titolare segretario) e simula un vero evento Stripe
 * checkout.session.completed — firmato con lo STESSO STRIPE_WEBHOOK_SECRET
 * di produzione e inviato via HTTP reale a /api/webhooks/stripe, esattamente
 * come farebbe Stripe — per verificare che l'attivazione multi-club funzioni
 * sul codice reale, non su una simulazione della sola logica DB.
 * Nessun pagamento reale: l'evento è fabbricato, non nasce da un vero
 * checkout. Ripulisce da solo i dati creati. Da rimuovere a lavoro finito.
 */
async function stripeGet(path: string) {
  const key = process.env.STRIPE_SECRET_KEY
  const res = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${key}` } })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe GET ${path}: ${data.error?.message ?? res.statusText}`)
  return data
}

async function stripePost(path: string, body: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe POST ${path}: ${data.error?.message ?? res.statusText}`)
  return data
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!adminKey || token !== adminKey) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET non configurata' }, { status: 500 })
  }

  const db = createAdminClient()
  const testEmail = `qa-test-webhook-e2e-${Date.now()}@clubis-internal-test.local`
  const clubIds: string[] = []
  let realSessionId: string | null = null

  try {
    // 1. Account sintetico con 3 club, titolare segretario (multi-club reale)
    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email: testEmail, email_confirm: true,
    })
    if (authErr || !authUser.user) throw new Error('Errore creazione utente test: ' + authErr?.message)
    const userId = authUser.user.id

    for (let i = 1; i <= 3; i++) {
      const { data: c, error: cErr } = await db.from('clubs').insert({
        nome: `QA-E2E-Club-${i}`, citta: 'Test', categoria: 'promozione',
        plan_tier: 'pro', piano_abbonamento: 'pro', plan_status: 'trial',
        trial_ends_at: new Date(Date.now() - 86400000).toISOString(), onboarding_completed: true,
      }).select('id').single()
      if (cErr || !c) throw new Error('Errore creazione club test: ' + cErr?.message)
      clubIds.push(c.id)
      await db.from('user_clubs').insert({
        user_id: userId, club_id: c.id, role: 'segretario', status: 'accepted', accepted_at: new Date().toISOString(),
      })
    }

    // 2. Sessione Checkout REALE (creata, non pagata — nessun addebito,
    // nessuna carta) sul prezzo reale ClubIS Multi-club mensile, per avere
    // un session.id vero da cui il webhook possa recuperare i line_items.
    const prices = await stripeGet('/v1/prices?product=prod_UVCM1smlSldGZd&active=true&limit=10')
    const proMonthlyPrice = prices.data.find((p: any) => p.recurring?.interval === 'month')
    if (!proMonthlyPrice) throw new Error('Price mensile Multi-club non trovato')

    const realSession = await stripePost('/v1/checkout/sessions', {
      mode: 'subscription',
      'line_items[0][price]': proMonthlyPrice.id,
      'line_items[0][quantity]': '1',
      success_url: 'https://clubis.it/auth/login?abbonamento=attivato',
      customer_email: testEmail,
    })
    realSessionId = realSession.id
    const debugExpanded = await stripeGet(`/v1/checkout/sessions/${realSession.id}?expand[]=line_items`)

    // 3. Evento checkout.session.completed REALISTICO — SENZA line_items
    // espansi nel payload (Stripe non li manda di default: il nostro codice
    // li richiedeva senza chiederli esplicitamente, bug corretto in questo
    // giro). Usa il vero session.id appena creato.
    const fakeCustomerId = `cus_test_e2e_${Date.now()}`
    const event = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: realSession.id,
          object: 'checkout.session',
          customer: fakeCustomerId,
          customer_details: { email: testEmail },
          customer_email: testEmail,
          subscription: `sub_test_e2e_${Date.now()}`,
          // line_items volutamente assente — replica il payload reale non espanso
        },
      },
    }
    const payload = JSON.stringify(event)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = await hmacSha256Hex(webhookSecret, `${timestamp}.${payload}`)
    const stripeSignatureHeader = `t=${timestamp},v1=${signature}`

    // 3. Invio HTTP reale al nostro endpoint di produzione, come farebbe Stripe
    const origin = req.nextUrl.origin
    const webhookRes = await fetch(`${origin}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': stripeSignatureHeader },
      body: payload,
    })
    const webhookBody = await webhookRes.json().catch(() => null)

    // 4. Verifica risultato sui 3 club
    const { data: clubsAfter } = await db
      .from('clubs')
      .select('nome, plan_tier, plan_status, stripe_customer_id')
      .in('id', clubIds)

    return NextResponse.json({
      webhook_http_status: webhookRes.status,
      webhook_response_body: webhookBody,
      clubs_after: clubsAfter,
      expectation: 'plan_status deve essere active su tutti e 3 i club (plan_tier dipende da come il webhook gestisce priceId assente)',
      debug_line_items: debugExpanded.line_items,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    // Cleanup sempre, anche in caso di errore a metà
    const { data: listData } = await db.auth.admin.listUsers()
    const u = listData?.users?.find(u => u.email === testEmail)
    if (u) {
      await db.from('user_clubs').delete().eq('user_id', u.id)
      await db.from('utenti').delete().eq('id', u.id)
      await db.auth.admin.deleteUser(u.id)
    }
    if (clubIds.length) await db.from('clubs').delete().in('id', clubIds)
    if (realSessionId) {
      await stripePost(`/v1/checkout/sessions/${realSessionId}/expire`, {}).catch(() => {})
    }
  }
}
