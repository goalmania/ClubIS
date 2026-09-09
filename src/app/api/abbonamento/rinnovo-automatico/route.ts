// /api/abbonamento/rinnovo-automatico — gestione self-service del rinnovo
// automatico dell'abbonamento ClubIS del club, da parte del titolare
// (presidente o segretario titolare).
//
// PATCH { azione: 'disattiva' | 'riattiva' }
//   Attiva/disattiva `cancel_at_period_end` sulla subscription Stripe del
//   club (che continua a funzionare fino a `current_period_end`). Richiede
//   che il club abbia già una subscription Stripe: se non ce l'ha (club
//   attivato a mano o dal webhook esterno di dmfootballservices.it) risponde
//   409 `no_stripe_subscription` e il client mostra il flusso POST qui sotto.
//
// POST { billing?: 'monthly' | 'annual' }
//   "Attiva rinnovo automatico" per un club attivo SENZA carta su Stripe:
//   crea una Stripe Checkout Session in mode:'subscription' sul piano
//   corrente del club. Se il club ha ancora periodo pagato residuo
//   (`current_period_end` nel futuro) imposta `trial_end` alla stessa data,
//   così il primo addebito reale cade a fine periodo e non c'è doppio
//   pagamento. L'attivazione a DB (stripe_customer_id / stripe_subscription_id
//   / plan_status) la fa già il webhook `checkout.session.completed`.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { stripeRequest, StripeError } from '@/lib/stripe'

const RUOLI_TITOLARE = ['presidente', 'segretario']

type PianoTier = 'starter' | 'pro' | 'elite' | 'scuola_calcio'

// Stessa mappa usata da /api/checkout/piano — tenere allineate.
const PRICE_ENV: Record<PianoTier, { monthly: string; annual: string }> = {
  starter:       { monthly: 'STRIPE_PRICE_STARTER_MONTHLY',       annual: 'STRIPE_PRICE_STARTER_ANNUAL' },
  pro:           { monthly: 'STRIPE_PRICE_PRO_MONTHLY',           annual: 'STRIPE_PRICE_PRO_ANNUAL' },
  elite:         { monthly: 'STRIPE_PRICE_ELITE_MONTHLY',         annual: 'STRIPE_PRICE_ELITE_ANNUAL' },
  scuola_calcio: { monthly: 'STRIPE_PRICE_SCUOLA_CALCIO_MONTHLY', annual: 'STRIPE_PRICE_SCUOLA_CALCIO_ANNUAL' },
}

// Stripe rifiuta un trial_end a meno di ~48h nel futuro: sotto questa soglia
// lo omettiamo e il primo addebito parte subito (accettabile: il residuo è
// ormai trascurabile).
const TRIAL_END_MIN_MS = 48 * 60 * 60 * 1000

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_TITOLARE.includes(ctx.ruolo) || !ctx.clubId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const azione = body.azione as 'disattiva' | 'riattiva'
  if (azione !== 'disattiva' && azione !== 'riattiva') {
    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: club } = await db
    .from('clubs')
    .select('id, stripe_subscription_id, plan_status, cancel_at_period_end')
    .eq('id', ctx.clubId)
    .maybeSingle()

  if (!club) return NextResponse.json({ error: 'Club non trovato' }, { status: 404 })
  if (!club.stripe_subscription_id) {
    return NextResponse.json({ error: 'no_stripe_subscription' }, { status: 409 })
  }

  const cancel = azione === 'disattiva'

  try {
    await stripeRequest('POST', `/subscriptions/${club.stripe_subscription_id}`, {
      cancel_at_period_end: cancel,
    })
  } catch (e) {
    // Subscription non più esistente / non modificabile su Stripe (già
    // terminata): il club deve rifare il checkout.
    if (e instanceof StripeError && (e.status === 404 || e.status === 400)) {
      return NextResponse.json({ error: 'no_stripe_subscription' }, { status: 409 })
    }
    console.error('[rinnovo-automatico PATCH] Errore Stripe:', (e as Error).message)
    return NextResponse.json({ error: 'Errore Stripe' }, { status: 502 })
  }

  await db
    .from('clubs')
    .update({ cancel_at_period_end: cancel })
    .eq('id', club.id)

  return NextResponse.json({ ok: true, cancel_at_period_end: cancel })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_TITOLARE.includes(ctx.ruolo) || !ctx.clubId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const billing: 'monthly' | 'annual' = body.billing === 'annual' ? 'annual' : 'monthly'

  const db = createAdminClient()
  const { data: club } = await db
    .from('clubs')
    .select('id, plan_tier, plan_status, tipo_prodotto, current_period_end, stripe_subscription_id')
    .eq('id', ctx.clubId)
    .maybeSingle()

  if (!club) return NextResponse.json({ error: 'Club non trovato' }, { status: 404 })
  if (club.stripe_subscription_id) {
    // Ha già una subscription: il rinnovo automatico si gestisce via PATCH.
    return NextResponse.json({ error: 'subscription_already_present' }, { status: 409 })
  }

  const tier: PianoTier =
    club.tipo_prodotto === 'scuola_calcio_standalone'
      ? 'scuola_calcio'
      : (['starter', 'pro', 'elite'].includes(club.plan_tier ?? '') ? club.plan_tier as PianoTier : 'starter')

  const priceId = process.env[PRICE_ENV[tier][billing]]
  if (!priceId) {
    return NextResponse.json({ error: 'Piano non configurato' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`

  // Anti doppio-addebito: se resta periodo già pagato, il primo addebito
  // reale parte alla sua scadenza.
  const subscriptionData: Record<string, unknown> = {
    metadata: { tipo: 'abbonamento_clubis', plan_tier: tier, billing },
  }
  const cpe = club.current_period_end ? new Date(club.current_period_end) : null
  if (
    club.plan_status === 'active' &&
    cpe &&
    cpe.getTime() > Date.now() + TRIAL_END_MIN_MS
  ) {
    subscriptionData.trial_end = Math.floor(cpe.getTime() / 1000)
  }

  try {
    const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      allow_promotion_codes: true,
      subscription_data: subscriptionData,
      metadata: { tipo: 'abbonamento_clubis', plan_tier: tier, billing },
      success_url: `${baseUrl}/dashboard/presidente/abbonamento?rinnovo=ok`,
      cancel_url: `${baseUrl}/dashboard/presidente/abbonamento`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[rinnovo-automatico POST] Errore Stripe:', (e as Error).message)
    return NextResponse.json({ error: 'Errore nella creazione del pagamento' }, { status: 500 })
  }
}
