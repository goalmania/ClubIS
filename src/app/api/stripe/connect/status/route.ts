import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { stripeRequest, StripeError } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: club } = await supabase
    .from('clubs')
    .select('stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_details_submitted')
    .eq('id', ctx.clubId)
    .maybeSingle()

  if (!club?.stripe_connect_account_id) {
    return Response.json({
      collegato: false,
      chargesAbilitati: false,
      datiInviati: false,
      requirementsCurrentlyDue: [],
      requirementsPastDue: [],
      disabledReason: null,
    })
  }

  // Legge lo stato live da Stripe invece di fidarsi solo del webhook — così il
  // presidente vede subito cosa manca anche se l'evento account.updated non è
  // ancora arrivato (o non è configurato in questo ambiente).
  try {
    const account = await stripeRequest<any>('GET', `/accounts/${club.stripe_connect_account_id}`)

    const chargesAbilitati = !!account.charges_enabled
    const datiInviati = !!account.details_submitted

    // Allinea la cache locale se diversa da quella live (best-effort)
    if (chargesAbilitati !== club.stripe_connect_charges_enabled || datiInviati !== club.stripe_connect_details_submitted) {
      await supabase.from('clubs').update({
        stripe_connect_charges_enabled: chargesAbilitati,
        stripe_connect_details_submitted: datiInviati,
      }).eq('id', ctx.clubId)
    }

    return Response.json({
      collegato: true,
      chargesAbilitati,
      datiInviati,
      requirementsCurrentlyDue: account.requirements?.currently_due ?? [],
      requirementsPastDue: account.requirements?.past_due ?? [],
      disabledReason: account.requirements?.disabled_reason ?? null,
    })
  } catch (err) {
    // Stripe irraggiungibile o account non trovato — fallback ai dati in cache
    return Response.json({
      collegato: true,
      chargesAbilitati: club.stripe_connect_charges_enabled ?? false,
      datiInviati: club.stripe_connect_details_submitted ?? false,
      requirementsCurrentlyDue: [],
      requirementsPastDue: [],
      disabledReason: null,
      avviso: err instanceof StripeError ? err.message : 'Impossibile verificare lo stato live con Stripe',
    })
  }
}
