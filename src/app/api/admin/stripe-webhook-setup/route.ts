// POST /api/admin/stripe-webhook-setup — route one-shot, da rimuovere a lavoro
// concluso (stesso pattern già usato in passato per il test end-to-end del
// webhook Stripe).
//
// Diagnosi: nessun pagamento arriva mai a /api/webhooks/stripe perché in
// Stripe (live) non esiste alcun endpoint webhook configurato verso questa
// route — il pannello "Consigli" della Dashboard Stripe lo conferma
// ("Prossimo passaggio: Crea l'integrazione"). Questa route:
// 1. Elimina eventuali endpoint esistenti che puntano già alla nostra URL
//    (per evitare doppioni/endpoint rotti con secret non più valido)
// 2. Ne crea uno nuovo con gli eventi che il codice sa già gestire
// 3. Cerca il cliente Stripe per email e la sua subscription attiva, per
//    poter riallineare manualmente il club che ha già pagato prima che
//    l'endpoint esistesse
import { NextRequest, NextResponse } from 'next/server'
import { stripeRequest } from '@/lib/stripe'

const WEBHOOK_URL = 'https://www.clubis.it/api/webhooks/stripe'
const EVENTS = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'account.updated',
  'customer.subscription.deleted',
]

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const email: string | undefined = body.email

  // 1) Rimuovi endpoint esistenti verso la nostra URL
  const existing = await stripeRequest<any>('GET', '/webhook_endpoints', { limit: 100 })
  const rotti = (existing.data ?? []).filter((e: any) => e.url === WEBHOOK_URL)
  for (const e of rotti) {
    await stripeRequest('DELETE', `/webhook_endpoints/${e.id}`)
  }

  // 2) Crea endpoint nuovo
  const created = await stripeRequest<any>('POST', '/webhook_endpoints', {
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: 'ClubIS — abbonamenti piattaforma + rette famiglia',
  })

  // 3) Cerca cliente + subscription (se email fornita)
  let customer: any = null
  let subscriptions: any = null
  if (email) {
    const customers = await stripeRequest<any>('GET', '/customers', { email, limit: 1 })
    customer = customers.data?.[0] ?? null
    if (customer) {
      subscriptions = await stripeRequest<any>('GET', '/subscriptions', { customer: customer.id, status: 'all', limit: 5 })
    }
  }

  return NextResponse.json({
    endpointsRimossi: rotti.map((e: any) => e.id),
    nuovoEndpoint: { id: created.id, url: created.url, status: created.status, secret: created.secret, enabled_events: created.enabled_events },
    customer: customer ? { id: customer.id, email: customer.email } : null,
    subscriptions: subscriptions?.data?.map((s: any) => ({
      id: s.id,
      status: s.status,
      current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : (s.items?.data?.[0]?.current_period_end ? new Date(s.items.data[0].current_period_end * 1000).toISOString() : null),
      price: s.items?.data?.[0]?.price?.id ?? null,
    })) ?? null,
  })
}
