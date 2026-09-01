import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { stripeRequest, StripeError } from '@/lib/stripe'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['presidente', 'segretario', 'admin']

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const { data: club } = await supabase
    .from('clubs')
    .select('id, nome, stripe_connect_account_id')
    .eq('id', ctx.clubId)
    .maybeSingle()

  if (!club) return Response.json({ error: 'Club non trovato' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`

  try {
    let accountId = club.stripe_connect_account_id

    if (!accountId) {
      const account = await stripeRequest<{ id: string }>('POST', '/accounts', {
        type: 'express',
        country: 'IT',
        business_type: 'non_profit',
        capabilities: {
          card_payments: { requested: 'true' },
          transfers: { requested: 'true' },
        },
      })
      accountId = account.id
      await supabase.from('clubs').update({ stripe_connect_account_id: accountId }).eq('id', club.id)
    }

    const link = await stripeRequest<{ url: string }>('POST', '/account_links', {
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/presidente/pagamenti-online`,
      return_url: `${baseUrl}/dashboard/presidente/pagamenti-online?onboarding=completato`,
      type: 'account_onboarding',
    })

    return Response.json({ url: link.url })
  } catch (err) {
    if (err instanceof StripeError) {
      // Errore di configurazione della piattaforma (Connect non ancora attivato
      // sull'account Stripe di ClubIS) — non è qualcosa che il presidente può
      // risolvere, quindi non mostriamo il messaggio tecnico in inglese di Stripe.
      if (err.message.includes('signed up for Connect')) {
        return Response.json({
          error: 'Il servizio di pagamenti online non è ancora attivo su ClubIS. Contattaci per attivarlo.',
        }, { status: 503 })
      }
      return Response.json({ error: err.message }, { status: err.status === 401 ? 500 : 400 })
    }
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
