// POST /api/admin/stripe-scuola-calcio-setup — route one-shot, da rimuovere a
// lavoro concluso. Crea il Product + le due Price (mensile/stagionale) per
// il piano unico Scuola Calcio su Stripe live, così /api/checkout/piano può
// riferirle tramite env var, come già avviene per starter/pro/elite.
import { NextRequest, NextResponse } from 'next/server'
import { stripeRequest } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const product = await stripeRequest<any>('POST', '/products', {
    name: 'ClubIS — Scuola Calcio',
    description: 'Piano unico per scuole calcio e settori giovanili standalone',
  })

  const monthly = await stripeRequest<any>('POST', '/prices', {
    product: product.id,
    currency: 'eur',
    unit_amount: 3000,
    recurring: { interval: 'month' },
    nickname: 'Scuola Calcio — mensile',
  })

  const annual = await stripeRequest<any>('POST', '/prices', {
    product: product.id,
    currency: 'eur',
    unit_amount: 30000,
    recurring: { interval: 'year' },
    nickname: 'Scuola Calcio — stagionale',
  })

  return NextResponse.json({
    productId: product.id,
    monthlyPriceId: monthly.id,
    annualPriceId: annual.id,
  })
}
