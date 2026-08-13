import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/stripe-audit/reprice
 *
 * Azione ONE-SHOT temporanea, protetta da ADMIN_SECRET_KEY: allinea i piani
 * Stripe "ClubIS Starter" e "ClubIS Pro" ai nuovi prezzi Base/Multi-club
 * (50€/100€ mensili). Le Price Stripe sono immutabili nell'importo, quindi:
 * crea nuove Price + nuovi Payment Link sugli stessi Product esistenti,
 * aggiorna nome/descrizione dei 3 Product (incluso Elite/Multi-club Max,
 * che non cambia prezzo), disattiva i 4 vecchi Payment Link Starter/Pro.
 * Non tocca Elite (prezzo invariato: 179€) né i Product "Starter/Pro/Elite"
 * senza prefisso (orfani, non referenziati da nessuna env var del sito).
 *
 * Da rimuovere insieme a stripe-audit a lavoro finito.
 */
async function stripePost(path: string, body: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY non configurata')
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe POST ${path}: ${data.error?.message ?? res.statusText}`)
  return data
}

const AFTER_COMPLETION_URL = 'https://clubis.it/auth/login?abbonamento=attivato'

const PROD_STARTER = 'prod_UVCMiOG9xlh0FU'
const PROD_PRO = 'prod_UVCM1smlSldGZd'
const PROD_ELITE = 'prod_UVCM322ICEJg6t'

const OLD_LINKS_TO_DEACTIVATE = [
  'plink_1TWBxtQ18jHt4JHms3zlwx8Q', // Starter Mensile 59€
  'plink_1TWByVQ18jHt4JHmb9Vor1ES', // Starter Annuale 600€/anno
  'plink_1TWBxuQ18jHt4JHm6lU3PdBd', // Pro Mensile 99€
  'plink_1TWByVQ18jHt4JHm8MOx6ydH', // Pro Annuale 1008€/anno
]

export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!adminKey || token !== adminKey) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    // 1. Nuove Price
    const priceStarterMonthly = await stripePost('/v1/prices', {
      product: PROD_STARTER, currency: 'eur', unit_amount: '5000',
      'recurring[interval]': 'month', nickname: 'Base Mensile',
    })
    const priceStarterAnnual = await stripePost('/v1/prices', {
      product: PROD_STARTER, currency: 'eur', unit_amount: '50400',
      'recurring[interval]': 'year', nickname: 'Base Annuale (€42/mese)',
      'metadata[billing]': 'annual', 'metadata[tier]': 'starter',
    })
    const priceProMonthly = await stripePost('/v1/prices', {
      product: PROD_PRO, currency: 'eur', unit_amount: '10000',
      'recurring[interval]': 'month', nickname: 'Multi-club Mensile',
    })
    const priceProAnnual = await stripePost('/v1/prices', {
      product: PROD_PRO, currency: 'eur', unit_amount: '102000',
      'recurring[interval]': 'year', nickname: 'Multi-club Annuale (€85/mese)',
      'metadata[billing]': 'annual', 'metadata[tier]': 'pro',
    })

    // 2. Nuovi Payment Link (stessa after_completion/allow_promotion_codes degli esistenti)
    async function createLink(priceId: string) {
      return stripePost('/v1/payment_links', {
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': AFTER_COMPLETION_URL,
        allow_promotion_codes: 'true',
      })
    }
    const linkStarterMonthly = await createLink(priceStarterMonthly.id)
    const linkStarterAnnual = await createLink(priceStarterAnnual.id)
    const linkProMonthly = await createLink(priceProMonthly.id)
    const linkProAnnual = await createLink(priceProAnnual.id)

    // 3. Rinomina i 3 Product (Elite incluso, anche se il prezzo non cambia)
    await stripePost(`/v1/products/${PROD_STARTER}`, {
      name: 'ClubIS Base', description: 'Per una società',
    })
    await stripePost(`/v1/products/${PROD_PRO}`, {
      name: 'ClubIS Multi-club', description: 'Per chi gestisce più società (fino a 5 club)',
    })
    await stripePost(`/v1/products/${PROD_ELITE}`, {
      name: 'ClubIS Multi-club Max', description: 'Per chi gestisce più di 5 società',
    })

    // 4. Disattiva i 4 vecchi Payment Link Starter/Pro (non cancellabili, solo disattivabili)
    for (const id of OLD_LINKS_TO_DEACTIVATE) {
      await stripePost(`/v1/payment_links/${id}`, { active: 'false' })
    }

    return NextResponse.json({
      ok: true,
      new_links: {
        STARTER_MONTHLY: linkStarterMonthly.url,
        STARTER_ANNUAL: linkStarterAnnual.url,
        PRO_MONTHLY: linkProMonthly.url,
        PRO_ANNUAL: linkProAnnual.url,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
