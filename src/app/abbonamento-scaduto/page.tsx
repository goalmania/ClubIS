'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const PIANI = [
  {
    id: 'starter',
    nome: 'Starter',
    colore: 'var(--gray)',
    prezzoMensile: 59,
    prezzoAnnuale: 49,
    features: ['Rosa & tesseramenti', 'Certificati medici', 'Quote & rateali', 'Calendario & distinte', 'Prima nota', '11 dashboard role-based'],
    envMensile: process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER_MONTHLY,
    envAnnuale: process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER_ANNUAL,
  },
  {
    id: 'pro',
    nome: 'Pro',
    colore: 'var(--accent2)',
    prezzoMensile: 99,
    prezzoAnnuale: 83,
    popular: true,
    features: ['Tutto Starter +', 'Dashboard DS completa', 'Analisi C.U. FIGC', 'Scouting con export PDF', 'Rimborsi SEPA', 'Registro IVA'],
    envMensile: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO_MONTHLY,
    envAnnuale: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO_ANNUAL,
  },
  {
    id: 'elite',
    nome: 'Elite',
    colore: 'var(--accent)',
    prezzoMensile: 179,
    prezzoAnnuale: 149,
    features: ['Tutto Pro +', 'DM Scout integrato', 'Utenti illimitati', 'Onboarding dedicato', 'Supporto WhatsApp 4h', 'Report mensile auto'],
    envMensile: process.env.NEXT_PUBLIC_STRIPE_LINK_ELITE_MONTHLY,
    envAnnuale: process.env.NEXT_PUBLIC_STRIPE_LINK_ELITE_ANNUAL,
  },
]

function buildStripeUrl(baseUrl: string | undefined, email: string | null): string {
  const fallback = 'https://dmfootballservices.it/#prezzi'
  if (!baseUrl) return fallback
  try {
    const url = new URL(baseUrl)
    if (email) url.searchParams.set('prefilled_email', email)
    return url.toString()
  } catch {
    return fallback
  }
}

function AbbonamentoContent() {
  const params = useSearchParams()
  const motivo = params.get('motivo') ?? 'inactive'
  const email = params.get('email')
  const isTrialScaduto = motivo === 'trial_scaduto'
  const [annuale, setAnnuale] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--black)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 48 }} />
      </div>

      <div style={{
        width: '100%',
        maxWidth: isTrialScaduto ? 860 : 480,
        border: '1px solid var(--border-solid)',
        background: 'var(--gray-light)',
        borderRadius: 12,
        padding: '40px 36px',
        textAlign: 'center',
      }}>
        {/* Icona */}
        <div style={{
          width: 56,
          height: 56,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isTrialScaduto ? 'rgba(200,240,0,0.08)' : 'rgba(255,68,68,0.08)',
          border: `1px solid ${isTrialScaduto ? 'rgba(200,240,0,0.25)' : 'rgba(255,68,68,0.25)'}`,
          borderRadius: 12,
        }}>
          {isTrialScaduto ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--white)',
          marginBottom: 10,
        }}>
          {isTrialScaduto ? 'Prova gratuita scaduta' : 'Accesso non disponibile'}
        </h1>

        <p style={{ fontSize: 14, color: 'var(--gray)', lineHeight: 1.6, marginBottom: isTrialScaduto ? 28 : 32 }}>
          {isTrialScaduto
            ? 'Il periodo di prova di 7 giorni è terminato. Scegli il piano per continuare con tutti i tuoi dati intatti.'
            : 'Il tuo abbonamento non è attivo. Attiva o rinnova per riprendere l\'accesso a ClubIS.'}
        </p>

        {isTrialScaduto && (
          <>
            {/* Toggle mensile/annuale */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex',
                background: '#111',
                border: '1px solid var(--border-solid)',
                borderRadius: 10,
                padding: 3,
              }}>
                {['Mensile', 'Annuale −15%'].map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setAnnuale(i === 1)}
                    style={{
                      padding: '7px 18px',
                      borderRadius: 7,
                      border: 'none',
                      background: (i === 1) === annuale ? 'var(--accent)' : 'transparent',
                      color: (i === 1) === annuale ? '#000' : 'var(--gray)',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Piani */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 24,
              textAlign: 'left',
            }}>
              {PIANI.map(p => {
                const stripeUrl = buildStripeUrl(annuale ? p.envAnnuale : p.envMensile, email)
                const prezzo = annuale ? p.prezzoAnnuale : p.prezzoMensile
                return (
                  <div key={p.id} style={{
                    background: '#0a0a0a',
                    border: p.popular ? `1px solid ${p.colore}` : `1px solid ${p.colore}33`,
                    borderTop: `2px solid ${p.colore}`,
                    borderRadius: 10,
                    padding: '18px 14px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {p.popular && (
                      <div style={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: p.colore,
                        color: '#000',
                        fontSize: 9,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        padding: '3px 10px',
                        borderRadius: 20,
                      }}>MOST POPULAR</div>
                    )}

                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: p.colore, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      {p.nome}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--white)' }}>€{prezzo}</span>
                      <span style={{ fontSize: 11, color: 'var(--gray)', marginLeft: 4 }}>/mese</span>
                      {annuale && <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>Fatturato annualmente</div>}
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', flex: 1 }}>
                      {p.features.map(f => (
                        <li key={f} style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.7, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ color: p.colore, flexShrink: 0 }}>·</span>{f}
                        </li>
                      ))}
                    </ul>

                    <a
                      href={stripeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '10px 12px',
                        background: p.popular ? p.colore : 'transparent',
                        color: p.popular ? '#000' : p.colore,
                        border: `1px solid ${p.colore}`,
                        borderRadius: 7,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                      }}
                    >
                      Scegli {p.nome} →
                    </a>
                  </div>
                )
              })}
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
              IVA esclusa · Cancellazione in qualsiasi momento · I tuoi dati rimangono intatti
            </p>
          </>
        )}

        {!isTrialScaduto && (
          <a
            href={`https://dmfootballservices.it/#prezzi`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '14px 24px',
              background: 'var(--accent)',
              color: '#000',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              textAlign: 'center',
              marginBottom: 12,
              borderRadius: 10,
            }}
          >
            Vai ai piani →
          </a>
        )}

        {/* Supporto */}
        <a
          href="https://wa.me/393334218596"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: '12px 24px',
            background: 'transparent',
            color: 'var(--gray)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textDecoration: 'none',
            textAlign: 'center',
            border: '1px solid var(--border-solid)',
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          Contatta il supporto WhatsApp
        </a>

        <div style={{ fontSize: 12, color: 'var(--gray)' }}>
          Hai già attivato un abbonamento?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Ricarica la pagina
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AbbonamentoScadutoPage() {
  return (
    <Suspense>
      <AbbonamentoContent />
    </Suspense>
  )
}
