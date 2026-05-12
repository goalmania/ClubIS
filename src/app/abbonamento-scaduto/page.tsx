import Link from 'next/link'

export default function AbbonamentoScadutoPage({
  searchParams,
}: {
  searchParams: { motivo?: string }
}) {
  const motivo = searchParams.motivo ?? 'inactive'
  const isTrialScaduto = motivo === 'trial_scaduto'

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
      {/* Logo ClubIS */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 52, display: 'inline-block' }} />
      </div>

      {/* Card principale */}
      <div style={{
        width: '100%',
        maxWidth: 540,
        border: '1px solid var(--border-solid)',
        background: 'var(--gray-light)',
        borderRadius: 12,
        padding: '48px 40px',
        textAlign: 'center',
      }}>
        {/* Icona */}
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isTrialScaduto ? 'rgba(200,240,0,0.08)' : 'rgba(255,68,68,0.08)',
          border: `1px solid ${isTrialScaduto ? 'rgba(200,240,0,0.25)' : 'rgba(255,68,68,0.25)'}`,
          borderRadius: 12,
        }}>
          {isTrialScaduto ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
        </div>

        {/* Titolo */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--white)',
          marginBottom: 12,
        }}>
          {isTrialScaduto ? 'Prova gratuita scaduta' : 'Accesso non disponibile'}
        </h1>

        {/* Messaggio contestuale */}
        {isTrialScaduto ? (
          <>
            <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.7, marginBottom: 8 }}>
              Il periodo di prova gratuita di <strong style={{ color: 'var(--white)' }}>7 giorni</strong> è terminato.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
              Scegli il piano più adatto al tuo club su DM Football Services per continuare ad usare ClubIS con tutti i tuoi dati intatti.
            </p>

            {/* Piani — preview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 32,
              textAlign: 'left',
            }}>
              {[
                { nome: 'Starter', colore: 'var(--gray)', features: ['Rosa & gestione quote', 'Calendario partite', 'Distinte gara'] },
                { nome: 'Pro', colore: 'var(--accent2)', features: ['Tutto Starter +', 'Contratti & mercato', 'Documenti & SEPA'] },
                { nome: 'Elite', colore: 'var(--accent)', features: ['Tutto Pro +', 'DM Scout AI', 'Report mensili auto'] },
              ].map(p => (
                <div key={p.nome} style={{
                  background: '#111',
                  border: `1px solid ${p.colore}33`,
                  borderTop: `2px solid ${p.colore}`,
                  borderRadius: 8,
                  padding: '14px 12px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 13,
                    color: p.colore,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}>
                    {p.nome}
                  </div>
                  {p.features.map(f => (
                    <div key={f} style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.6 }}>
                      · {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.7, marginBottom: 8 }}>
              Il tuo abbonamento non è attivo o è scaduto.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 36 }}>
              Rinnova o attiva il tuo abbonamento su DM Football Services per riprendere l&apos;accesso a ClubIS.
            </p>
          </>
        )}

        {/* CTA principale */}
        <a
          href="https://dmfootballservices.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            width: '100%',
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
            transition: 'filter 0.15s ease-out',
          }}
        >
          {isTrialScaduto ? 'Scegli il tuo piano →' : 'Vai su DM Football Services →'}
        </a>

        {/* CTA supporto */}
        <a
          href="https://wa.me/393xxxxx"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            width: '100%',
            padding: '13px 24px',
            background: 'transparent',
            color: 'var(--gray)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textDecoration: 'none',
            textAlign: 'center',
            border: '1px solid var(--border-solid)',
            borderRadius: 10,
            marginBottom: 24,
          }}
        >
          Contatta il supporto
        </a>

        <div style={{ fontSize: 12, color: 'var(--gray)' }}>
          Hai già attivato un abbonamento?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Ricarica la pagina
          </Link>
          {' '}o contattaci se il problema persiste.
        </div>
      </div>
    </div>
  )
}
