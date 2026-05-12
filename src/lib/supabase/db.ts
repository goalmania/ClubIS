'use client'

/**
 * Campi che non devono MAI essere inclusi in un payload di UPDATE o INSERT
 * proveniente dal frontend. Sono campi gestiti dal DB (trigger, webhook Stripe,
 * admin) e protetti dalla policy RLS.
 */
const ALWAYS_STRIP = new Set([
  'id',
  'created_at',
  // Abbonamento — gestito da Stripe/admin via service_role
  'plan_tier',
  'plan_status',
  'stripe_customer_id',
  'stripe_subscription_id',
  'trial_ends_at',
  'current_period_end',
  'onboarding_completed',
  'onboarding_step',
])

/**
 * Rimuove dal payload tutti i campi read-only prima di inviarlo a Supabase.
 * Accetta un secondo parametro per aggiungere campi extra da escludere per
 * la specifica operazione (es. 'club_id' se non deve cambiare).
 */
export function stripPayload<T extends Record<string, unknown>>(
  data: T,
  extra: string[] = []
): Partial<T> {
  const exclude = extra.length ? new Set([...ALWAYS_STRIP, ...extra]) : ALWAYS_STRIP
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => !exclude.has(k))
  ) as Partial<T>
}

/**
 * Helper per UPDATE: strips read-only fields e aggiunge updated_at automatico.
 * Usa così: await safeUpdatePayload(form, ['campo_extra'])
 */
export function safeUpdatePayload<T extends Record<string, unknown>>(
  data: T,
  extra: string[] = []
): Partial<T> & { updated_at: string } {
  return {
    ...stripPayload(data, extra),
    updated_at: new Date().toISOString(),
  }
}
