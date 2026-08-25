// POST /api/checkout/piano
//
// Crea una Stripe Checkout Session diretta per l'attivazione/rinnovo di un
// piano ClubIS (starter/pro/elite, mensile/annuale). A differenza dei
// Payment Link statici (NEXT_PUBLIC_STRIPE_LINK_*), qui la sessione viene
// creata via API con il solo price ID: nessun subscription_data.trial_period
// viene impostato, quindi non può MAI far ripartire una prova gratuita —
// anche se un Payment Link nella Dashboard Stripe ha la prova abilitata.
// Uso previsto: pulsanti "Scegli piano" sulla pagina /abbonamento-scaduto,
// sia per chi ha esaurito la prova sia per chi deve rinnovare un abbonamento
// scaduto.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeRequest } from '@/lib/stripe'

type PianoTier = 'starter' | 'pro' | 'elite' | 'scuola_calcio'

const PRICE_ENV: Record<PianoTier, { monthly: string; annual: string }> = {
  starter:       { monthly: 'STRIPE_PRICE_STARTER_MONTHLY',      annual: 'STRIPE_PRICE_STARTER_ANNUAL' },
  pro:           { monthly: 'STRIPE_PRICE_PRO_MONTHLY',          annual: 'STRIPE_PRICE_PRO_ANNUAL' },
  elite:         { monthly: 'STRIPE_PRICE_ELITE_MONTHLY',        annual: 'STRIPE_PRICE_ELITE_ANNUAL' },
  scuola_calcio: { monthly: 'STRIPE_PRICE_SCUOLA_CALCIO_MONTHLY', annual: 'STRIPE_PRICE_SCUOLA_CALCIO_ANNUAL' },
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const tier = body.tier as PianoTier
  const billing = body.billing as 'monthly' | 'annual'

  if (!PRICE_ENV[tier] || (billing !== 'monthly' && billing !== 'annual')) {
    return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
  }

  const priceId = process.env[PRICE_ENV[tier][billing]]
  if (!priceId) {
    return NextResponse.json({ error: 'Piano non configurato' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`

  try {
    const session = await stripeRequest<any>('POST', '/checkout/sessions', {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      allow_promotion_codes: true,
      metadata: { tipo: 'abbonamento_clubis', plan_tier: tier, billing },
      success_url: `${baseUrl}/dashboard?abbonamento=ok`,
      cancel_url: `${baseUrl}/abbonamento-scaduto`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[checkout/piano] Errore Stripe:', e.message)
    return NextResponse.json({ error: 'Errore nella creazione del pagamento' }, { status: 500 })
  }
}
