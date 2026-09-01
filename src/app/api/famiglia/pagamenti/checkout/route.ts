// POST /api/famiglia/pagamenti/checkout — ClubIS Pay
//
// Crea una vera sessione di pagamento Stripe (Connect, destination charge,
// commissione ClubIS Pay 1,5% divisa a metà famiglia/club) per:
//   - una quota di iscrizione stagionale (quote_iscrizione — il sistema
//     principale, usato da tutti i club per la retta/iscrizione)
//   - una quota mensile scuola calcio (quote_giovanili — tabella più recente,
//     usata dalla sezione "settore giovanile")
//   - una rata di un piano di pagamento (rate_pagamento)
// quando il club ha già attivato i pagamenti online. Stesso schema già usato
// per le iscrizioni pubbliche in src/app/api/moduli/checkout/route.ts.
//
// Se il club non ha Stripe Connect attivo, il frontend non chiama questa
// rotta e ricade sul flusso esistente "dichiara pagamento manuale" — nessuna
// regressione per i club che non hanno ancora collegato i pagamenti online.
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/impersonation'
import { stripeRequest, calcolaCheckoutClubISPay } from '@/lib/stripe'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const tipo = body.tipo as 'iscrizione' | 'quota' | 'rata'
  const id = body.id as string | undefined
  // Checkout cumulativo (solo per tipo 'iscrizione'): più quote_iscrizione
  // (es. più figli) pagate in un'unica Checkout Session con un solo
  // application_fee_amount sommato. `id` singolo resta supportato.
  const ids: string[] = Array.isArray(body.ids) && body.ids.length > 0
    ? body.ids
    : (id ? [id] : [])
  if (!tipo || ids.length === 0) return Response.json({ error: 'Parametri mancanti' }, { status: 400 })
  if (tipo !== 'iscrizione' && tipo !== 'quota' && tipo !== 'rata') {
    return Response.json({ error: 'Tipo non valido' }, { status: 400 })
  }
  if (tipo !== 'iscrizione' && ids.length > 1) {
    return Response.json({ error: 'Il checkout cumulativo è supportato solo per la quota di iscrizione' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verifica di proprietà "è mio figlio?" — usa ctx.giocatoreId (già valido
  // sia per account famiglia reali sia per l'anteprima "Visualizza come" del
  // super admin) con fallback sulla tabella famiglie per i casi in cui
  // giocatoreId non sia stato risolto.
  async function giocatoreIsMio(giocatoreId: string): Promise<boolean> {
    if (ctx!.giocatoreId && ctx!.giocatoreId === giocatoreId) return true
    const { data: fam } = await admin
      .from('famiglie')
      .select('id')
      .eq('auth_user_id', ctx!.userId)
      .eq('giocatore_id', giocatoreId)
      .maybeSingle()
    return !!fam
  }

  let clubId: string
  let voci: { importo: number; descrizione: string }[]
  let metadata: Record<string, string>

  if (tipo === 'iscrizione') {
    const { data: quote } = await admin
      .from('quote_iscrizione')
      .select('id, club_id, giocatore_id, importo_totale, importo_pagato, stato, stagione, mese, giocatore:giocatori!giocatore_id(nome, cognome)')
      .in('id', ids)

    if (!quote || quote.length !== ids.length) {
      return Response.json({ error: 'Quota non trovata' }, { status: 404 })
    }
    for (const q of quote) {
      if (!(await giocatoreIsMio(q.giocatore_id))) {
        return Response.json({ error: 'Non autorizzato' }, { status: 403 })
      }
      if (q.stato === 'pagato' || q.stato === 'esonerato') {
        return Response.json({ error: 'Una delle quote selezionate è già saldata' }, { status: 400 })
      }
    }
    const clubIds = Array.from(new Set(quote.map(q => q.club_id)))
    if (clubIds.length > 1) {
      return Response.json({ error: 'Le quote selezionate appartengono a club diversi' }, { status: 400 })
    }

    clubId = clubIds[0]
    voci = quote.map(q => {
      const g = q.giocatore as any
      const base = q.mese
        ? `Quota — ${new Date(2000, q.mese - 1, 1).toLocaleDateString('it-IT', { month: 'long' })}`
        : `Quota iscrizione — stagione ${q.stagione}`
      return {
        importo: Number(q.importo_totale) - Number(q.importo_pagato),
        descrizione: g ? `${base} (${g.nome} ${g.cognome})` : base,
      }
    })
    metadata = {
      tipo: 'quota_iscrizione',
      quota_ids: quote.map(q => q.id).join(','),
      importi: voci.map(v => v.importo.toFixed(2)).join(','),
    }
  } else if (tipo === 'quota') {
    const { data: quota } = await admin
      .from('quote_giovanili')
      .select('id, club_id, giocatore_id, importo_mensile, mese_competenza, stato')
      .eq('id', ids[0])
      .maybeSingle()

    if (!quota) return Response.json({ error: 'Quota non trovata' }, { status: 404 })
    if (!(await giocatoreIsMio(quota.giocatore_id))) {
      return Response.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    if (quota.stato === 'pagata' || quota.stato === 'esonerata') {
      return Response.json({ error: 'Quota già saldata' }, { status: 400 })
    }
    if (quota.stato === 'dichiarata') {
      return Response.json({ error: 'Pagamento già dichiarato, in attesa di conferma' }, { status: 400 })
    }

    clubId = quota.club_id
    const meseLabel = new Date(quota.mese_competenza).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    voci = [{ importo: Number(quota.importo_mensile), descrizione: `Quota mensile — ${meseLabel}` }]
    metadata = { tipo: 'quota_giovanile', quota_id: quota.id }
  } else {
    const { data: rata } = await admin
      .from('rate_pagamento')
      .select('id, club_id, piano_id, famiglia_id, numero_rata, importo, stato')
      .eq('id', ids[0])
      .maybeSingle()

    if (!rata) return Response.json({ error: 'Rata non trovata' }, { status: 404 })

    const { data: piano } = await admin
      .from('piani_pagamento')
      .select('descrizione, giocatore_id')
      .eq('id', rata.piano_id)
      .maybeSingle()

    const ownsViaFamiglia = await admin
      .from('famiglie')
      .select('id')
      .eq('auth_user_id', ctx.userId)
      .eq('id', rata.famiglia_id)
      .maybeSingle()
    const autorizzato = !!ownsViaFamiglia.data
      || (!!piano?.giocatore_id && ctx.giocatoreId === piano.giocatore_id)
    if (!autorizzato) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    if (rata.stato === 'pagata') return Response.json({ error: 'Rata già pagata' }, { status: 400 })
    if (rata.stato === 'dichiarato') {
      return Response.json({ error: 'Pagamento già dichiarato, in attesa di conferma' }, { status: 400 })
    }

    clubId = rata.club_id
    voci = [{ importo: Number(rata.importo), descrizione: `${piano?.descrizione ?? 'Piano di pagamento'} — Rata ${rata.numero_rata}` }]
    metadata = { tipo: 'rata_pagamento', rata_id: rata.id }
  }

  const { data: club } = await admin
    .from('clubs')
    .select('nome, stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('id', clubId)
    .maybeSingle()

  if (!club?.stripe_connect_account_id || !club?.stripe_connect_charges_enabled) {
    return Response.json({
      error: 'Il pagamento online non è ancora attivo per questo club. Usa uno degli altri metodi.',
    }, { status: 422 })
  }

  if (voci.some(v => !v.importo || v.importo <= 0)) {
    return Response.json({ error: 'Importo non valido' }, { status: 400 })
  }

  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
  const righe = voci.map(v => ({ ...v, ...calcolaCheckoutClubISPay(v.importo) }))
  const applicationFeeCents = righe.reduce((s, r) => s + r.applicationFeeCents, 0)

  try {
    const session = await stripeRequest<any>('POST', '/checkout/sessions', {
      mode: 'payment',
      line_items: righe.map(r => ({
        price_data: {
          currency: 'eur',
          unit_amount: r.unitAmountCents,
          product_data: {
            name: `${r.descrizione} — ${club.nome}`,
            description: 'Include commissione ClubIS Pay (0,75%)',
          },
        },
        quantity: 1,
      })),
      payment_intent_data: {
        transfer_data: { destination: club.stripe_connect_account_id },
        application_fee_amount: applicationFeeCents,
      },
      customer_email: user?.email ?? undefined,
      metadata,
      success_url: `${baseUrl}/dashboard/famiglia/pagamenti?pagamento=ok`,
      cancel_url: `${baseUrl}/dashboard/famiglia/pagamenti`,
    })

    return Response.json({ url: session.url })
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Errore Stripe' }, { status: 500 })
  }
}
