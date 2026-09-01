import { createAdminClient } from '@/lib/supabase/admin'
import { stripeRequest } from '@/lib/stripe'

export default async function GraziePage({
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ rid?: string }>
}) {
  const { rid } = await searchParams
  const admin = createAdminClient()

  const { data: richiesta } = rid
    ? await admin
        .from('richieste_iscrizione')
        .select('*, moduli_iscrizione(titolo, clubs(nome, logo_url))')
        .eq('id', rid)
        .maybeSingle()
    : { data: null }

  if (!richiesta) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🔒</div>
            <h2 style={h2Style}>Richiesta non trovata</h2>
            <p style={{ color: '#aaa', fontSize: 14 }}>Il link non è valido.</p>
          </div>
        </div>
      </div>
    )
  }

  // Fallback: se il webhook Stripe non è ancora arrivato, verifica subito
  // lo stato del pagamento direttamente con l'API Stripe.
  let pagato = richiesta.pagamento_stato === 'pagato'
  if (!pagato && richiesta.stripe_checkout_session_id) {
    try {
      const session = await stripeRequest<any>('GET', `/checkout/sessions/${richiesta.stripe_checkout_session_id}`)
      if (session.payment_status === 'paid') {
        pagato = true
        await admin.from('richieste_iscrizione').update({ pagamento_stato: 'pagato' }).eq('id', richiesta.id)
      }
    } catch {
      // Stripe non raggiungibile — mostriamo lo stato "in elaborazione" già calcolato sopra
    }
  }

  const club = (richiesta as any).moduli_iscrizione?.clubs
  const nomeClub = club?.nome ?? 'la società'

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>{pagato ? '✅' : '⏳'}</div>
          <h2 style={h2Style}>{pagato ? 'Iscrizione e pagamento confermati!' : 'Pagamento in elaborazione'}</h2>
          <p style={{ color: '#aaa', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
            Grazie <strong style={{ color: '#f5f3ee' }}>{richiesta.nome} {richiesta.cognome}</strong>.
          </p>
          <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6 }}>
            {pagato ? (
              <>
                La tua richiesta e il pagamento di{' '}
                <strong style={{ color: accent }}>€{Number(richiesta.pagamento_importo).toFixed(2)}</strong>{' '}
                sono stati ricevuti da <strong style={{ color: '#f5f3ee' }}>{nomeClub}</strong>.
                La segreteria ti contatterà all'indirizzo{' '}
                <strong style={{ color: accent }}>{richiesta.genitore_email}</strong> per confermare l'iscrizione.
              </>
            ) : (
              <>
                Stiamo ancora confermando il pagamento con la tua banca. Se questo messaggio non cambia entro
                qualche minuto, contatta la segreteria di <strong style={{ color: '#f5f3ee' }}>{nomeClub}</strong>.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

const accent = '#c8f000'
const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: '#0a0a0a', color: '#f5f3ee',
  padding: '32px 16px', fontFamily: 'system-ui, -apple-system, sans-serif',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const cardStyle: React.CSSProperties = {
  maxWidth: 520, width: '100%', background: '#111',
  border: '1px solid #222', borderRadius: 6, padding: '24px 28px',
}
const h2Style: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
  fontSize: 24, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '-0.01em',
}
