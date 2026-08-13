import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/stripe-audit
 *
 * Route diagnostica TEMPORANEA, sola lettura: elenca prodotti, prezzi e
 * payment link attivi su Stripe per verificare lo stato reale prima di
 * qualunque modifica. Protetta da ADMIN_SECRET_KEY. Da rimuovere a lavoro
 * finito — non è pensata per restare in produzione.
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
    const [products, prices, paymentLinks] = await Promise.all([
      stripeGet('/v1/products?limit=30&active=true'),
      stripeGet('/v1/prices?limit=30&active=true'),
      stripeGet('/v1/payment_links?limit=30&active=true&expand[]=data.line_items'),
    ])

    return NextResponse.json({
      products: products.data.map((p: any) => ({
        id: p.id, name: p.name, description: p.description, active: p.active,
      })),
      prices: prices.data.map((p: any) => ({
        id: p.id, product: p.product, unit_amount: p.unit_amount, currency: p.currency,
        recurring: p.recurring, nickname: p.nickname, active: p.active,
      })),
      payment_links: paymentLinks.data.map((l: any) => ({
        id: l.id, url: l.url, active: l.active,
        line_items: l.line_items?.data?.map((li: any) => ({ price: li.price, quantity: li.quantity })),
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
