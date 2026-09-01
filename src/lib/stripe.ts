// Client minimo per l'API REST di Stripe via fetch — nessun SDK installato,
// stessa scelta già fatta in src/app/api/webhooks/stripe/route.ts.
// Richiede STRIPE_SECRET_KEY in env (mai loggata, mai esposta al client).

const STRIPE_API = 'https://api.stripe.com/v1'

/** Serializza un oggetto nel formato a parentesi quadre richiesto da Stripe
 * (es. { capabilities: { card_payments: { requested: true } } } ->
 * "capabilities[card_payments][requested]=true"). */
function toFormParams(obj: Record<string, unknown>, prefix = ''): string[] {
  const parts: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    const paramKey = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const itemKey = `${paramKey}[${i}]`
        if (typeof item === 'object' && item !== null) {
          parts.push(...toFormParams(item as Record<string, unknown>, itemKey))
        } else {
          parts.push(`${encodeURIComponent(itemKey)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === 'object') {
      parts.push(...toFormParams(value as Record<string, unknown>, paramKey))
    } else {
      parts.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts
}

export class StripeError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message)
  }
}

// ── ClubIS Pay — commissione sui pagamenti online ──────────────────────────
// 1,5% totale, diviso a metà tra famiglia (sovrapprezzo in checkout) e club
// (trattenuta sull'incasso). Stesso schema usato da Golee Pay: la famiglia
// paga l'importo dovuto + metà commissione, il club riceve l'importo dovuto
// meno l'altra metà, la differenza (1,5% dell'importo dovuto) è il ricavo
// piattaforma trattenuto automaticamente da Stripe via application_fee_amount
// prima del trasferimento all'account Connect del club.
const COMMISSIONE_CLUBIS_PAY = 0.015

/** Calcola gli importi (in centesimi) per una Checkout Session ClubIS Pay
 * a partire dall'importo dovuto in euro. Il debito (quota/rata) resta
 * saldato per intero: `importoBase` va usato per aggiornare stato/importo
 * pagato, `unitAmountCents` è quanto addebitare alla carta della famiglia,
 * `applicationFeeCents` è la trattenuta piattaforma da passare a Stripe. */
export function calcolaCheckoutClubISPay(importoBase: number) {
  const metaCommissione = importoBase * (COMMISSIONE_CLUBIS_PAY / 2)
  const unitAmountCents = Math.round((importoBase + metaCommissione) * 100)
  const applicationFeeCents = Math.round(importoBase * COMMISSIONE_CLUBIS_PAY * 100)
  return { unitAmountCents, applicationFeeCents, importoBase }
}

/** Netto che il club incassa realmente su un importo dovuto pagato via
 * ClubIS Pay (dopo la sua metà di commissione) — da usare per registrare
 * l'entrata reale in Prima Nota, distinta dall'importo del debito saldato. */
export function importoNettoClub(importoBase: number): number {
  return Math.round(importoBase * (1 - COMMISSIONE_CLUBIS_PAY / 2) * 100) / 100
}

export async function stripeRequest<T = any>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params?: Record<string, unknown>,
  opts?: { stripeAccount?: string }
): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY non configurata')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  }
  if (opts?.stripeAccount) headers['Stripe-Account'] = opts.stripeAccount

  let url = `${STRIPE_API}${path}`
  let body: string | undefined

  if ((method === 'GET' || method === 'DELETE') && params) {
    url += `?${toFormParams(params).join('&')}`
  } else if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = toFormParams(params).join('&')
  }

  const res = await fetch(url, { method, headers, body })
  const json = await res.json()

  if (!res.ok) {
    throw new StripeError(json?.error?.message ?? 'Errore Stripe', res.status, json)
  }
  return json as T
}
