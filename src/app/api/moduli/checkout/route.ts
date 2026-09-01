import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeRequest, calcolaCheckoutClubISPay } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/moduli/checkout — ClubIS Pay
 * Endpoint pubblico (nessuna autenticazione): crea la richiesta di iscrizione
 * in stato "in attesa di pagamento" e una Stripe Checkout Session sul conto
 * Connect del club (destination charge, commissione ClubIS Pay 1,5% divisa
 * a metà famiglia/club).
 * L'importo viene sempre letto dal modulo lato server, mai dal client.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { modulo_id, origin, ...dati } = body

  if (!modulo_id) return Response.json({ error: 'Modulo mancante' }, { status: 400 })
  if (!dati.nome?.trim() || !dati.cognome?.trim() || !dati.genitore_email?.trim()) {
    return Response.json({ error: 'Dati obbligatori mancanti' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: modulo } = await admin
    .from('moduli_iscrizione')
    .select('id, club_id, slug, attivo, importo_iscrizione, clubs(nome, stripe_connect_account_id, stripe_connect_charges_enabled)')
    .eq('id', modulo_id)
    .maybeSingle()

  if (!modulo || !modulo.attivo) return Response.json({ error: 'Modulo non trovato o chiuso' }, { status: 404 })

  const importo = Number(modulo.importo_iscrizione)
  if (!importo || importo <= 0) {
    return Response.json({ error: 'Questo modulo non richiede pagamento' }, { status: 400 })
  }

  const club = modulo.clubs as any
  if (!club?.stripe_connect_account_id || !club?.stripe_connect_charges_enabled) {
    return Response.json({
      error: 'La società non ha ancora completato l\'attivazione dei pagamenti online. Contatta la segreteria per completare l\'iscrizione.',
    }, { status: 422 })
  }

  const { data: richiesta, error: errR } = await admin.from('richieste_iscrizione').insert({
    modulo_id: modulo.id,
    club_id: modulo.club_id,
    nome: dati.nome.trim(),
    cognome: dati.cognome.trim(),
    data_nascita: dati.data_nascita || null,
    codice_fiscale: dati.codice_fiscale?.trim() || null,
    indirizzo: dati.indirizzo?.trim() || null,
    comune: dati.comune?.trim() || null,
    genitore_nome: dati.genitore_nome?.trim() || null,
    genitore_cognome: dati.genitore_cognome?.trim() || null,
    genitore_email: dati.genitore_email.trim(),
    genitore_telefono: dati.genitore_telefono?.trim() || null,
    genitore_cf: dati.genitore_cf?.trim() || null,
    relazione: dati.relazione ?? 'genitore',
    consenso_gdpr: !!dati.consenso_gdpr,
    consenso_foto: !!dati.consenso_foto,
    consenso_data: new Date().toISOString(),
    stato: 'in_attesa',
    pagamento_stato: 'in_attesa',
    pagamento_importo: importo,
  }).select('id').single()

  if (errR || !richiesta) return Response.json({ error: 'Errore durante la creazione della richiesta' }, { status: 500 })

  const base = origin || process.env.NEXT_PUBLIC_APP_URL || ''
  const { unitAmountCents, applicationFeeCents } = calcolaCheckoutClubISPay(importo)

  try {
    const session = await stripeRequest<any>('POST', '/checkout/sessions', {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: unitAmountCents,
          product_data: {
            name: `Iscrizione — ${club.nome}`,
            description: 'Include commissione ClubIS Pay (0,75%)',
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        transfer_data: { destination: club.stripe_connect_account_id },
        application_fee_amount: applicationFeeCents,
      },
      customer_email: dati.genitore_email.trim(),
      metadata: { tipo: 'iscrizione_pubblica', richiesta_id: richiesta.id },
      success_url: `${base}/iscriviti/${modulo.slug}/grazie?rid=${richiesta.id}`,
      cancel_url: `${base}/iscriviti/${modulo.slug}`,
    })

    await admin.from('richieste_iscrizione')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', richiesta.id)

    return Response.json({ url: session.url })
  } catch (e: any) {
    await admin.from('richieste_iscrizione').update({ pagamento_stato: 'fallito' }).eq('id', richiesta.id)
    return Response.json({ error: e.message ?? 'Errore Stripe' }, { status: 500 })
  }
}
