import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importoNettoClub } from '@/lib/stripe'
import type { PlanTier } from '@/lib/features'

// Stripe SDK non è installato — usiamo la verifica manuale della firma HMAC
// compatibile con la libreria stripe/stripe-node senza doverla installare.
// Se in futuro si aggiunge `stripe` come dipendenza, sostituire con
// `stripe.webhooks.constructEvent()`.
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',')
  const tPart = parts.find(p => p.startsWith('t='))
  const v1Part = parts.find(p => p.startsWith('v1='))
  if (!tPart || !v1Part) return false

  const timestamp = tPart.slice(2)
  const expectedSig = v1Part.slice(3)
  const signedPayload = `${timestamp}.${payload}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Timing-safe comparison non è disponibile nel Web Crypto API,
  // ma per webhook server-side è accettabile.
  return computed === expectedSig
}

const RUOLI_TITOLARE = ['presidente', 'segretario']

// stripe_customer_id è UNIQUE su clubs (un solo club può "ancorare" un
// customer Stripe) — l'abbonamento è per-account, quindi per gli eventi di
// rinnovo/cancellazione ricaviamo il club "ancora" da stripe_customer_id e
// da lì risaliamo a TUTTI i club di cui il suo titolare (presidente o
// segretario) è owner, per applicare l'update a tutto l'account.
async function titolareClubIdsForStripeCustomer(
  db: ReturnType<typeof createAdminClient>,
  stripeCustomerId: string
): Promise<string[]> {
  const { data: anchorClub } = await db
    .from('clubs')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (!anchorClub) return []

  const { data: titolari } = await db
    .from('user_clubs')
    .select('user_id')
    .eq('club_id', anchorClub.id)
    .eq('status', 'accepted')
    .in('role', RUOLI_TITOLARE)

  const userIds = Array.from(new Set((titolari ?? []).map(t => t.user_id)))
  if (userIds.length === 0) return [anchorClub.id]

  const { data: membership } = await db
    .from('user_clubs')
    .select('club_id')
    .in('user_id', userIds)
    .eq('status', 'accepted')
    .in('role', RUOLI_TITOLARE)

  return Array.from(new Set([anchorClub.id, ...(membership ?? []).map(m => m.club_id)]))
}

// Stripe NON include i line_items nell'evento checkout.session.completed di
// default (vanno richiesti esplicitamente): senza questa chiamata priceId
// risulta sempre null e planTierFromStripePrice ripiega su 'starter' per
// qualunque piano — bug reale trovato testando il webhook con un evento
// realistico non espanso.
async function fetchSessionPriceId(sessionId: string): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items`,
    { headers: { Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) {
    console.error('[Stripe] Impossibile recuperare line_items per', sessionId, res.status)
    return null
  }
  const data = await res.json()
  return data.line_items?.data?.[0]?.price?.id ?? null
}

// Stagione calcistica italiana (agosto → giugno) a partire da una data —
// stesso formato "2026-27" già usato da quote_iscrizione.stagione.
function stagioneDaData(d: Date): string {
  const anno = d.getFullYear()
  const mese = d.getMonth() + 1 // 1-12
  const inizio = mese >= 8 ? anno : anno - 1
  return `${inizio}-${String((inizio + 1) % 100).padStart(2, '0')}`
}

// L'oggetto invoice di Stripe ha cambiato forma tra versioni API: fino alle
// versioni "classiche" invoice.subscription era una stringa diretta; dalle
// versioni più recenti (billing/invoicing redesign) è sotto
// invoice.parent.subscription_details.subscription. Il webhook endpoint live
// resta agganciato alla versione con cui è stato creato, quindi in teoria
// riceve sempre la forma classica — ma leggiamo entrambe per non dipendere
// silenziosamente da quella configurazione: se cambiasse, un addebito
// automatico continuerebbe a incassare su Stripe ma smetterebbe di
// aggiornare il database senza errori visibili.
function invoiceSubscriptionId(invoice: any): string | null {
  if (typeof invoice.subscription === 'string') return invoice.subscription
  const nested = invoice.parent?.subscription_details?.subscription
  return typeof nested === 'string' ? nested : null
}

function planTierFromStripePrice(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'starter'
  // Mappa price ID → tier tramite env var
  const map: Record<string, PlanTier> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '']: 'starter',
    [process.env.STRIPE_PRICE_STARTER_ANNUAL  ?? '']: 'starter',
    [process.env.STRIPE_PRICE_PRO_MONTHLY     ?? '']: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL      ?? '']: 'pro',
    [process.env.STRIPE_PRICE_ELITE_MONTHLY   ?? '']: 'elite',
    [process.env.STRIPE_PRICE_ELITE_ANNUAL    ?? '']: 'elite',
  }
  if (map[priceId]) return map[priceId]
  // Fallback: cerca 'elite'/'pro' nel price ID (utile in dev)
  const lower = priceId.toLowerCase()
  if (lower.includes('elite')) return 'elite'
  if (lower.includes('pro'))   return 'pro'
  return 'starter'
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sigHeader = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // Verifica firma se il secret è configurato
  if (webhookSecret) {
    const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret)
    if (!valid) {
      console.error('[Stripe webhook] Firma non valida')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  } else {
    console.warn('[Stripe webhook] STRIPE_WEBHOOK_SECRET non configurato — verifica firma saltata (dev mode)')
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const db = createAdminClient()

  try {
    switch (event.type) {
      // ─────────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object

        // Pagamento di un'iscrizione pubblica (/iscriviti/[slug]) — non è
        // un abbonamento piattaforma, gestione separata.
        if (session.metadata?.tipo === 'iscrizione_pubblica') {
          const richiestaId = session.metadata?.richiesta_id
          if (richiestaId) {
            await db.from('richieste_iscrizione')
              .update({ pagamento_stato: 'pagato' })
              .eq('id', richiestaId)
          }
          break
        }

        // Pagamento con carta di una quota mensile (scuola calcio, tabella
        // legacy quote_giovanili) dalla dashboard famiglia — destination
        // charge sul conto Connect del club. La registrazione in Prima Nota
        // avviene da sola via trigger DB (trig_quote_giovanili_to_prima_nota,
        // AFTER UPDATE OF stato) — non inseriamo qui per evitare doppioni.
        if (session.metadata?.tipo === 'quota_giovanile') {
          const quotaId = session.metadata?.quota_id
          if (quotaId) {
            const oggi = new Date().toISOString().split('T')[0]
            await db
              .from('quote_giovanili')
              .update({
                stato: 'pagata',
                data_pagamento: oggi,
                metodo_pagamento: 'carta',
                stripe_checkout_session_id: session.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', quotaId)
          }
          break
        }

        // Pagamento con carta di una rata di un piano di pagamento (club
        // agonistici) dalla dashboard famiglia. Prima Nota via trigger DB
        // (trig_rate_to_prima_nota, AFTER UPDATE OF stato) — idem sopra.
        if (session.metadata?.tipo === 'rata_pagamento') {
          const rataId = session.metadata?.rata_id
          if (rataId) {
            const oggi = new Date().toISOString().split('T')[0]
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
            await db
              .from('rate_pagamento')
              .update({
                stato: 'pagata',
                data_pagamento: oggi,
                metodo_pagamento: 'carta',
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: paymentIntentId,
              })
              .eq('id', rataId)
          }
          break
        }

        // Attivazione di un addebito automatico retta (retta_abbonamenti).
        // La Checkout Session mode:'subscription' porta qui alla creazione
        // dell'abbonamento; i rinnovi mensili arrivano poi via
        // invoice.payment_succeeded (vedi sotto), NON di nuovo da qui.
        if (session.metadata?.tipo === 'retta_abbonamento') {
          const abbonamentoId = session.metadata?.abbonamento_id
          if (abbonamentoId) {
            await db.from('retta_abbonamenti')
              .update({
                stato: 'attivo',
                stripe_customer_id: session.customer ?? null,
                stripe_subscription_id: session.subscription ?? null,
              })
              .eq('id', abbonamentoId)
          }
          break
        }

        // Pagamento con carta di una quota di iscrizione (tabella principale
        // quote_iscrizione, usata da segretario/presidente per tutti i club).
        // Supporta pagamenti parziali: registriamo il pagamento nella tabella
        // figlia `pagamenti` e il trigger sync_pagamenti ricalcola da solo
        // importo_pagato/stato su quote_iscrizione. A differenza di
        // quote_giovanili/rate_pagamento non esiste qui un trigger verso
        // prima_nota (lo fa solo a mano la UI segretario per lo scuola
        // calcio) quindi lo registriamo esplicitamente.
        if (session.metadata?.tipo === 'quota_iscrizione') {
          // Checkout cumulativo multi-figlio: quota_ids/importi sono liste
          // CSV allineate per indice (vedi /api/famiglia/pagamenti/checkout);
          // il singolo quota_id/importo resta per compatibilità con le
          // Checkout Session create prima di questa modifica.
          const quotaIds = session.metadata?.quota_ids
            ? session.metadata.quota_ids.split(',')
            : (session.metadata?.quota_id ? [session.metadata.quota_id] : [])
          const importi = session.metadata?.importi
            ? session.metadata.importi.split(',').map(Number)
            : (session.metadata?.importo ? [Number(session.metadata.importo)] : [])

          const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
          const oggi = new Date().toISOString().split('T')[0]

          for (let i = 0; i < quotaIds.length; i++) {
            const quotaId = quotaIds[i]
            const importoPagato = importi[i]
            if (!quotaId || !(importoPagato > 0)) continue

            await db.from('pagamenti').insert({
              quota_id: quotaId,
              importo: importoPagato,
              // L'enum metodo_pagamento non ha 'carta': usiamo 'stripe'.
              metodo: 'stripe',
              data_pagamento: oggi,
              stripe_payment_id: paymentIntentId ?? session.id,
            })

            const { data: quota } = await db
              .from('quote_iscrizione')
              .select('club_id, giocatore:giocatori!giocatore_id(nome, cognome)')
              .eq('id', quotaId)
              .maybeSingle()

            if (quota) {
              const g = quota.giocatore as any
              await db.from('prima_nota').insert({
                club_id: quota.club_id,
                tipo: 'entrata',
                categoria: 'quote_iscrizione',
                // Netto di ClubIS Pay (metà commissione a carico del club),
                // non l'intero debito saldato — riflette l'incasso reale.
                importo: importoNettoClub(importoPagato),
                data: oggi,
                descrizione: `Quota iscrizione${g ? ` — ${g.nome} ${g.cognome}` : ''} (pagamento online — ClubIS Pay)`,
                controparte: g ? `${g.nome} ${g.cognome}` : null,
              })
            }
          }
          break
        }

        const customerEmail: string = session.customer_details?.email ?? session.customer_email
        const stripeCustomerId: string = session.customer
        const priceId: string | null =
          session.line_items?.data?.[0]?.price?.id ?? await fetchSessionPriceId(session.id)
        const plan = planTierFromStripePrice(priceId)

        if (!customerEmail) {
          console.error('[Stripe] checkout.session.completed: email mancante')
          break
        }

        // Crea utente su Supabase Auth se non esiste
        const { data: existingUser } = await db.auth.admin.listUsers()
        const found = existingUser?.users?.find(u => u.email === customerEmail)

        let userId: string
        if (found) {
          userId = found.id
        } else {
          const tempPassword = crypto.randomUUID()
          const { data: newUser, error: createErr } = await db.auth.admin.createUser({
            email: customerEmail,
            password: tempPassword,
            email_confirm: true,
          })
          if (createErr || !newUser.user) {
            console.error('[Stripe] Errore creazione utente:', createErr)
            break
          }
          userId = newUser.user.id
        }

        // Abbonamento per-account: se l'utente è già titolare (presidente o
        // segretario) di uno o più club, un solo pagamento sblocca TUTTI i
        // suoi club — stesso criterio già usato in activate-subscription
        // (il webhook esterno chiamato da dmfootballservices.it) e nel
        // middleware. Non un ruolo qualsiasi, per non attivare per errore
        // il club di un titolare diverso dove questa email è solo staff.
        const { data: membership } = found
          ? await db
              .from('user_clubs')
              .select('club_id')
              .eq('user_id', userId)
              .eq('status', 'accepted')
              .in('role', RUOLI_TITOLARE)
          : { data: null }
        const titolareClubIds = membership?.map(m => m.club_id) ?? []

        if (titolareClubIds.length > 0) {
          // Account esistente (nuovo o multi-club): plan_tier/plan_status vanno
          // su tutti i club posseduti. stripe_customer_id è UNIQUE su clubs — può
          // "ancorare" un solo club: lo mettiamo solo sul primo, gli eventi di
          // rinnovo/cancellazione risalgono da lì a tutto l'account (vedi
          // titolareClubIdsForStripeCustomer sopra).
          await db
            .from('clubs')
            .update({ plan_tier: plan, plan_status: 'active' })
            .in('id', titolareClubIds)

          await db
            .from('clubs')
            .update({
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: session.subscription ?? null,
            })
            .eq('id', titolareClubIds[0])
          break
        }

        // Nessun club posseduto ancora (cliente nuovo, o utente esistente ma
        // solo come staff invitato altrove): crea un club nuovo.
        // Prima cerca per stripe_customer_id per evitare doppioni su retry del webhook.
        let { data: existingClub } = await db
          .from('clubs')
          .select('id')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle()

        if (!existingClub) {
          const { data: newClub, error: clubErr } = await db.from('clubs').insert({
            nome: customerEmail.split('@')[0], // placeholder — verrà aggiornato in onboarding
            citta: '',
            plan_tier: plan,
            plan_status: 'active',
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: session.subscription ?? null,
            onboarding_completed: false,
            onboarding_step: 1,
          }).select('id').single()

          if (clubErr || !newClub) {
            console.error('[Stripe] Errore creazione club:', clubErr)
            break
          }

          // Crea record utenti con ruolo presidente
          await db.from('utenti').upsert({
            id: userId,
            club_id: newClub.id,
            nome: '',
            cognome: '',
            email: customerEmail,
            ruolo: 'presidente',
            attivo: true,
            is_super_admin: false,
          }, { onConflict: 'id' })

          // Aggiungi il presidente fondatore in user_clubs
          await db.from('user_clubs').upsert({
            user_id:     userId,
            club_id:     newClub.id,
            role:        'presidente',
            status:      'accepted',
            accepted_at: new Date().toISOString(),
          }, { onConflict: 'user_id,club_id' })

          // Invia magic link per completare registrazione
          await db.auth.admin.generateLink({
            type: 'magiclink',
            email: customerEmail,
            options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding` },
          })
        } else {
          // Club già esiste: aggiorna piano
          await db.from('clubs')
            .update({ plan_tier: plan, plan_status: 'active', stripe_customer_id: stripeCustomerId })
            .eq('id', existingClub.id)
        }
        break
      }

      // ─────────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subscriptionId = invoiceSubscriptionId(invoice)

        // Rinnovo mensile di un addebito automatico retta — controllato per
        // primo perché lo stesso event.type serve anche all'abbonamento
        // ClubIS del club (sotto, invariato) e i due NON vanno confusi.
        if (subscriptionId) {
          const { data: abbonamento } = await db
            .from('retta_abbonamenti')
            .select('id, club_id, giocatore_id, importo_centesimi, stato')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (abbonamento) {
            const oggi = new Date()
            const oggiStr = oggi.toISOString().split('T')[0]
            const importoBase = abbonamento.importo_centesimi / 100
            const stagione = stagioneDaData(oggi)
            const mese = oggi.getMonth() + 1
            const paymentIntentId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : null

            // Trova la quota del mese corrente per questo giocatore, o la
            // crea se il segretario non l'ha ancora generata — l'addebito
            // automatico non deve dipendere dal fatto che qualcuno se ne
            // ricordi manualmente ogni mese.
            let { data: quota } = await db
              .from('quote_iscrizione')
              .select('id')
              .eq('giocatore_id', abbonamento.giocatore_id)
              .eq('club_id', abbonamento.club_id)
              .eq('stagione', stagione)
              .eq('mese', mese)
              .maybeSingle()

            if (!quota) {
              const { data: nuovaQuota } = await db
                .from('quote_iscrizione')
                .insert({
                  giocatore_id: abbonamento.giocatore_id,
                  club_id: abbonamento.club_id,
                  stagione,
                  mese,
                  importo_totale: importoBase,
                  importo_pagato: 0,
                  stato: 'non_pagato',
                })
                .select('id')
                .single()
              quota = nuovaQuota
            }

            if (quota) {
              await db.from('pagamenti').insert({
                quota_id: quota.id,
                importo: importoBase,
                metodo: 'stripe',
                data_pagamento: oggiStr,
                stripe_payment_id: paymentIntentId ?? invoice.id,
              })

              const { data: quotaConGiocatore } = await db
                .from('quote_iscrizione')
                .select('giocatore:giocatori!giocatore_id(nome, cognome)')
                .eq('id', quota.id)
                .maybeSingle()
              const g = (quotaConGiocatore as any)?.giocatore

              await db.from('prima_nota').insert({
                club_id: abbonamento.club_id,
                tipo: 'entrata',
                categoria: 'quote_iscrizione',
                importo: importoNettoClub(importoBase),
                data: oggiStr,
                descrizione: `Retta mensile${g ? ` — ${g.nome} ${g.cognome}` : ''} (addebito automatico ClubIS Pay)`,
                controparte: g ? `${g.nome} ${g.cognome}` : null,
              })
            }

            // Se era in pausa-per-pagamento-fallito ed è ripartito da solo
            // (es. la famiglia ha aggiornato la carta), torna attivo.
            if (abbonamento.stato === 'pausa') {
              await db.from('retta_abbonamenti')
                .update({ stato: 'attivo', pausa_da: null })
                .eq('id', abbonamento.id)
            }

            // Trovato e gestito come retta famiglia — NON deve mai arrivare
            // al codice dell'abbonamento ClubIS del club sotto.
            break
          }
          // invoice.subscription non corrisponde a nessuna retta_abbonamenti:
          // è l'abbonamento ClubIS del club (o un altro subscription event
          // futuro) — prosegue invariato al codice esistente sotto.
        }

        // ── Abbonamento ClubIS del club (invariato) ──────────────────────
        const stripeCustomerId: string = invoice.customer
        const periodEnd: number = invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end
        const clubIds = await titolareClubIdsForStripeCustomer(db, stripeCustomerId)

        if (clubIds.length > 0) {
          await db.from('clubs')
            .update({
              plan_status: 'active',
              current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
            })
            .in('id', clubIds)
        }
        break
      }

      // ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoiceSubscriptionId(invoice)

        // Addebito automatico retta fallito (carta scaduta/rifiutata) —
        // stesso controllo-prima-di-tutto di invoice.payment_succeeded sopra.
        if (subscriptionId) {
          const { data: abbonamento } = await db
            .from('retta_abbonamenti')
            .select('id, club_id, giocatore_id, stato')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (abbonamento) {
            await db.from('retta_abbonamenti')
              .update({ stato: 'pausa', pausa_da: 'famiglia' })
              .eq('id', abbonamento.id)

            const { data: gioc } = await db
              .from('giocatori')
              .select('nome, cognome')
              .eq('id', abbonamento.giocatore_id)
              .maybeSingle()
            const nomeGiocatore = gioc ? `${gioc.nome} ${gioc.cognome}` : 'un giocatore'

            const { data: staff } = await db
              .from('utenti')
              .select('id')
              .eq('club_id', abbonamento.club_id)
              .in('ruolo', ['segretario', 'presidente'])

            if (staff && staff.length > 0) {
              await db.from('notifiche_sistema').insert(staff.map(s => ({
                club_id: abbonamento.club_id,
                destinatario_id: s.id,
                tipo: 'quota_arretrata',
                riferimento_id: abbonamento.id,
                titolo: `Addebito automatico non riuscito — ${nomeGiocatore}`,
                messaggio: `La carta collegata all'addebito automatico di ${nomeGiocatore} è stata rifiutata. L'abbonamento è in pausa finché la famiglia non aggiorna il metodo di pagamento.`,
                azione_url: '/dashboard/segretario/pagamenti',
              })))
            }
            break
          }
        }

        // ── Abbonamento ClubIS del club (invariato) ──────────────────────
        const stripeCustomerId: string = invoice.customer
        const clubIds = await titolareClubIdsForStripeCustomer(db, stripeCustomerId)

        if (clubIds.length > 0) {
          await db.from('clubs')
            .update({ plan_status: 'expired' })
            .in('id', clubIds)
        }

        console.warn('[Stripe] Pagamento fallito per customer:', stripeCustomerId, '— gestione manuale richiesta')
        break
      }

      // ─────────────────────────────────────────────────────
      // Evento Connect (account collegato da un club per incassare le rette).
      // Gli eventi Connect portano event.account, quelli della piattaforma no.
      case 'account.updated': {
        const account = event.data.object
        await db.from('clubs')
          .update({
            stripe_connect_charges_enabled: !!account.charges_enabled,
            stripe_connect_details_submitted: !!account.details_submitted,
          })
          .eq('stripe_connect_account_id', account.id)
        break
      }

      // ─────────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object

        // Cancellazione di un addebito automatico retta — stesso controllo
        // prioritario degli altri due case sopra.
        const { data: abbonamento } = await db
          .from('retta_abbonamenti')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle()

        if (abbonamento) {
          await db.from('retta_abbonamenti')
            .update({ stato: 'cancellato' })
            .eq('id', abbonamento.id)
          break
        }

        // ── Abbonamento ClubIS del club (invariato) ──────────────────────
        const stripeCustomerId: string = sub.customer
        const clubIds = await titolareClubIdsForStripeCustomer(db, stripeCustomerId)

        if (clubIds.length > 0) {
          await db.from('clubs')
            .update({ plan_status: 'inactive', plan_tier: 'starter' })
            .in('id', clubIds)
        }
        break
      }

      default:
        // Evento non gestito — ignora silenziosamente
        break
    }
  } catch (err) {
    console.error('[Stripe webhook] Errore gestione evento:', event.type, err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
