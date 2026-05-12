import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

function planTierFromStripePrice(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'starter'
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
        const customerEmail: string = session.customer_details?.email ?? session.customer_email
        const stripeCustomerId: string = session.customer
        const priceId: string | null = session.line_items?.data?.[0]?.price?.id ?? null
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

        // Crea o aggiorna il club
        const { data: existingClub } = await db
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
        const stripeCustomerId: string = invoice.customer
        const periodEnd: number = invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end

        await db.from('clubs')
          .update({
            plan_status: 'active',
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq('stripe_customer_id', stripeCustomerId)
        break
      }

      // ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const stripeCustomerId: string = invoice.customer

        await db.from('clubs')
          .update({ plan_status: 'expired' })
          .eq('stripe_customer_id', stripeCustomerId)

        console.warn('[Stripe] Pagamento fallito per customer:', stripeCustomerId, '— gestione manuale richiesta')
        break
      }

      // ─────────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const stripeCustomerId: string = sub.customer

        await db.from('clubs')
          .update({ plan_status: 'inactive', plan_tier: 'starter' })
          .eq('stripe_customer_id', stripeCustomerId)
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
