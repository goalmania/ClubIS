import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/stripe-cleanup
 *
 * Azione ONE-SHOT temporanea, protetta da ADMIN_SECRET_KEY: disattiva i 3
 * Product Stripe orfani "Starter"/"Pro"/"Elite" (senza prefisso ClubIS,
 * mai referenziati da nessuna env var del sito — verificato in stripe-audit)
 * insieme a tutti i loro Payment Link e Price attivi. Stripe non permette la
 * cancellazione definitiva di Product/Price con storico: si possono solo
 * disattivare (restano nella dashboard ma non sono più utilizzabili).
 *
 * Da rimuovere a lavoro finito.
 */
async function stripeGet(path: string) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY non configurata')
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe GET ${path}: ${data.error?.message ?? res.statusText}`)
  return data
}

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

const ORPHAN_PRODUCTS = ['prod_UVC6MtFcpBGtUR', 'prod_UVC6vCtCf5ergi', 'prod_UVC73T7DAto7JX']

export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!adminKey || token !== adminKey) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const deactivatedLinks: string[] = []
    const deactivatedPrices: string[] = []

    // 1. Trova e disattiva i Payment Link che puntano ai product orfani
    const links = await stripeGet('/v1/payment_links?limit=100&active=true&expand[]=data.line_items')
    for (const link of links.data) {
      const productId = link.line_items?.data?.[0]?.price?.product
      if (ORPHAN_PRODUCTS.includes(productId)) {
        await stripePost(`/v1/payment_links/${link.id}`, { active: 'false' })
        deactivatedLinks.push(link.id)
      }
    }

    // 2. Disattiva i Product stessi (prima delle Price: un product può essere
    // disattivato anche col suo default_price ancora attivo, mentre una Price
    // non può essere disattivata finché è il default_price del suo product)
    for (const productId of ORPHAN_PRODUCTS) {
      await stripePost(`/v1/products/${productId}`, { active: 'false' })
    }

    // 3. Disattiva le Price dei product orfani; se una Price è ancora il
    // default_price del product (Stripe non lo sblocca automaticamente
    // disattivando il product), la saltiamo — resta associata a un product
    // già disattivato e senza Payment Link attivi, quindi inutilizzabile.
    const skippedPrices: string[] = []
    for (const productId of ORPHAN_PRODUCTS) {
      const prices = await stripeGet(`/v1/prices?product=${productId}&limit=100&active=true`)
      for (const price of prices.data) {
        try {
          await stripePost(`/v1/prices/${price.id}`, { active: 'false' })
          deactivatedPrices.push(price.id)
        } catch (e: any) {
          skippedPrices.push(price.id)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      deactivated_products: ORPHAN_PRODUCTS,
      deactivated_prices: deactivatedPrices,
      skipped_prices_still_default: skippedPrices,
      deactivated_links: deactivatedLinks,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
