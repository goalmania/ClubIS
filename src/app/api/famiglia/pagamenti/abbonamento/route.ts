// /api/famiglia/pagamenti/abbonamento — ClubIS Pay, addebito automatico
//
// POST: attiva l'addebito automatico mensile per un giocatore — crea una
// Stripe Checkout Session in mode: 'subscription' (Customer + Subscription
// sull'account piattaforma, transfer_data.destination verso il club,
// application_fee_percent 1,5% su ogni fattura futura). L'importo mensile è
// derivato dall'ultima quota_iscrizione del giocatore (stessa retta ogni
// mese, come da modello segretario).
//
// DELETE: annulla subito un abbonamento attivo (la famiglia può sempre
// tornare al pagamento manuale mese per mese, mai un obbligo).
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/impersonation'
import { stripeRequest, calcolaCheckoutClubISPay } from '@/lib/stripe'
import { NextRequest } from 'next/server'

async function giocatoreIsMio(admin: any, ctx: any, giocatoreId: string): Promise<boolean> {
  if (ctx.giocatoreId && ctx.giocatoreId === giocatoreId) return true
  const { data: fam } = await admin
    .from('famiglie')
    .select('id')
    .eq('auth_user_id', ctx.userId)
    .eq('giocatore_id', giocatoreId)
    .maybeSingle()
  return !!fam
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const giocatoreId = body.giocatoreId as string
  if (!giocatoreId) return Response.json({ error: 'giocatoreId mancante' }, { status: 400 })

  const admin = createAdminClient()

  if (!(await giocatoreIsMio(admin, ctx, giocatoreId))) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Blocca doppia attivazione
  const { data: esistente } = await admin
    .from('retta_abbonamenti')
    .select('id, stato')
    .eq('giocatore_id', giocatoreId)
    .in('stato', ['in_attesa', 'attivo', 'pausa'])
    .maybeSingle()
  if (esistente) {
    return Response.json({ error: 'Addebito automatico già presente per questo giocatore' }, { status: 400 })
  }

  // Deriva club e importo mensile dall'ultima quota di iscrizione del giocatore
  const { data: quota } = await admin
    .from('quote_iscrizione')
    .select('club_id, importo_totale, famiglia_id')
    .eq('giocatore_id', giocatoreId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!quota) {
    return Response.json({
      error: 'Nessuna quota configurata per questo giocatore — contatta la segreteria prima di attivare l\'addebito automatico.',
    }, { status: 422 })
  }

  const importo = Number(quota.importo_totale)
  if (!importo || importo <= 0) return Response.json({ error: 'Importo non valido' }, { status: 400 })

  const { data: club } = await admin
    .from('clubs')
    .select('nome, stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('id', quota.club_id)
    .maybeSingle()

  if (!club?.stripe_connect_account_id || !club?.stripe_connect_charges_enabled) {
    return Response.json({
      error: 'Il pagamento online non è ancora attivo per questo club.',
    }, { status: 422 })
  }

  // famiglia_id: prova dalla quota (se presente), altrimenti dalla tabella famiglie
  let famigliaId: string | null = (quota as any).famiglia_id ?? null
  if (!famigliaId) {
    const { data: fam } = await admin
      .from('famiglie')
      .select('id')
      .eq('auth_user_id', ctx.userId)
      .eq('giocatore_id', giocatoreId)
      .maybeSingle()
    famigliaId = fam?.id ?? null
  }

  const { data: abbonamento, error: errIns } = await admin
    .from('retta_abbonamenti')
    .insert({
      club_id: quota.club_id,
      giocatore_id: giocatoreId,
      famiglia_id: famigliaId,
      importo_centesimi: Math.round(importo * 100),
      stato: 'in_attesa',
    })
    .select('id')
    .single()

  if (errIns || !abbonamento) {
    return Response.json({ error: errIns?.message ?? 'Errore creazione abbonamento' }, { status: 500 })
  }

  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
  const { unitAmountCents } = calcolaCheckoutClubISPay(importo)

  try {
    const session = await stripeRequest<any>('POST', '/checkout/sessions', {
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: unitAmountCents,
          recurring: { interval: 'month' },
          product_data: {
            name: `Retta mensile — ${club.nome}`,
            description: 'Addebito automatico ClubIS Pay — include commissione 0,75%',
          },
        },
        quantity: 1,
      }],
      subscription_data: {
        transfer_data: { destination: club.stripe_connect_account_id },
        application_fee_percent: 1.5,
        metadata: { tipo: 'retta_abbonamento', abbonamento_id: abbonamento.id, giocatore_id: giocatoreId },
      },
      customer_email: user?.email ?? undefined,
      metadata: { tipo: 'retta_abbonamento', abbonamento_id: abbonamento.id },
      success_url: `${baseUrl}/dashboard/famiglia/pagamenti?abbonamento=ok`,
      cancel_url: `${baseUrl}/dashboard/famiglia/pagamenti`,
    })

    await admin.from('retta_abbonamenti')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', abbonamento.id)

    return Response.json({ url: session.url })
  } catch (e: any) {
    await admin.from('retta_abbonamenti').delete().eq('id', abbonamento.id)
    return Response.json({ error: e.message ?? 'Errore Stripe' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id mancante' }, { status: 400 })

  const admin = createAdminClient()

  const { data: abbonamento } = await admin
    .from('retta_abbonamenti')
    .select('id, giocatore_id, stripe_subscription_id, stato')
    .eq('id', id)
    .maybeSingle()

  if (!abbonamento) return Response.json({ error: 'Abbonamento non trovato' }, { status: 404 })
  if (!(await giocatoreIsMio(admin, ctx, abbonamento.giocatore_id))) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  if (abbonamento.stato === 'cancellato') {
    return Response.json({ error: 'Abbonamento già annullato' }, { status: 400 })
  }

  try {
    if (abbonamento.stripe_subscription_id) {
      await stripeRequest('DELETE', `/subscriptions/${abbonamento.stripe_subscription_id}`)
    }
    await admin.from('retta_abbonamenti').update({ stato: 'cancellato' }).eq('id', id)
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Errore Stripe' }, { status: 500 })
  }
}
