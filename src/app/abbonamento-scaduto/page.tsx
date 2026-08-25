'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const PIANI = [
  {
    id: 'starter' as const,
    nome: 'Base',
    colore: 'var(--gray)',
    prezzoMensile: 50,
    prezzoAnnuale: 42,   // €504/anno (−15% circa)
    fatturatoAnno: 504,
    features: ['1 club', 'Rosa & tesseramenti', 'Certificati medici', 'Quote & rateali', 'Calendario & distinte', 'Prima nota', '11 dashboard role-based'],
  },
  {
    id: 'pro' as const,
    nome: 'Multi-club',
    colore: 'var(--accent2)',
    prezzoMensile: 100,
    prezzoAnnuale: 85,   // €1.020/anno (−15% circa)
    fatturatoAnno: 1020,
    popular: true,
    features: ['Fino a 5 club', 'Tutto Base +', 'Dashboard DS completa', 'Analisi C.U. FIGC', 'Scouting con export PDF', 'Rimborsi SEPA', 'Registro IVA'],
  },
  {
    id: 'elite' as const,
    nome: 'Multi-club Max',
    colore: 'var(--accent)',
    prezzoMensile: 179,
    prezzoAnnuale: 152,  // €1.824/anno (−15%)
    fatturatoAnno: 1824,
    features: ['Club illimitati', 'Tutto Multi-club +', 'DM Scout integrato', 'Utenti illimitati', 'Onboarding dedicato', 'Supporto WhatsApp 4h', 'Report mensile auto'],
  },
]

// Le scuole calcio / settori giovanili standalone (club.tipo_prodotto ===
// 'scuola_calcio_standalone') hanno un piano unico, diverso dai 3 piani
// club agonistico sopra — l'annuale qui è "a stagione" (importo pieno una
// volta l'anno, non un prezzo/mese scontato come per gli altri piani).
const PIANO_SCUOLA_CALCIO = {
  id: 'scuola_calcio' as const,
  nome: 'Scuola Calcio',
  colore: 'var(--accent2)',
  popular: false,
  prezzoMensile: 30,
  prezzoAnnuale: 300,
  fatturatoAnno: 300,
  features: ['Rosa & tesseramenti', 'Quote mensili scuola calcio', 'Presenze & gruppi', 'Calendario allenamenti', 'Comunicazioni famiglie', 'Prima nota', 'Dashboard allenatore'],
}

function AbbonamentoContent() {
  const params = useSearchParams()
  const motivo = params.get('motivo') ?? 'inactive'
  // Qualsiasi motivo di blocco (trial scaduto, abbonamento scaduto, mai
  // attivato) porta comunque a un rinnovo/attivazione: mostriamo sempre la
  // griglia piani, non più il link generico al sito marketing esterno che
  // non aggancia il checkout all'account del club — era questo il motivo per
  // cui "Vai ai piani" non portava a nulla di utile per chi aveva la prova
  // già scaduta a DB.
  const isTrialScaduto = motivo === 'trial_scaduto'
  const isScuolaCalcio = params.get('tipo') === 'scuola_calcio_standalone'
  const piani = isScuolaCalcio ? [PIANO_SCUOLA_CALCIO] : PIANI
  const [annuale, setAnnuale] = useState(false)
  const [caricamento, setCaricamento] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  // Checkout creato via API (subscription su Price ID nudo, nessun
  // trial_period_days): a differenza dei vecchi Payment Link statici, non
  // può MAI far ripartire una prova gratuita per chi la prova l'ha già
  // consumata — è sempre e solo un pagamento immediato.
  async function scegliPiano(tier: 'starter' | 'pro' | 'elite' | 'scuola_calcio') {
    setErrore(null)
    setCaricamento(tier)
    try {
      const res = await fetch('/api/checkout/piano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billing: annuale ? 'annual' : 'monthly' }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Errore nella creazione del pagamento')
      window.location.href = data.url
    } catch (e: any) {
      setErrore(e.message ?? 'Errore nella creazione del pagamento')
      setCaricamento(null)
    }
  }

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
        maxWidth: isScuolaCalcio ? 420 : 860,
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
          {isTrialScaduto ? 'Prova gratuita scaduta' : 'Abbonamento non attivo'}
        </h1>

        <p style={{ fontSize: 14, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 28 }}>
          {isTrialScaduto
            ? 'Il periodo di prova di 7 giorni è terminato. Scegli il piano per continuare con tutti i tuoi dati intatti.'
            : 'Il tuo abbonamento non è attivo. Scegli il piano per riprendere l\'accesso a ClubIS con tutti i tuoi dati intatti.'}
        </p>

        {/* Qualunque sia il motivo del blocco, il rinnovo/attivazione passa
            sempre dalla stessa griglia con checkout creato via API — mai dal
            link generico al sito marketing, che non aggancia il pagamento al
            club dell'utente né esclude un'eventuale prova gratuita
            configurata sui vecchi Payment Link. */}
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
                {['Mensile', isScuolaCalcio ? 'A stagione' : 'Annuale −15%'].map((label, i) => (
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
              gridTemplateColumns: isScuolaCalcio ? '1fr' : 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 24,
              textAlign: 'left',
            }}>
              {piani.map(p => {
                const prezzo = annuale ? p.prezzoAnnuale : p.prezzoMensile
                const suffissoPrezzo = annuale && isScuolaCalcio ? '/stagione' : '/mese'
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
                      <span style={{ fontSize: 11, color: 'var(--gray)', marginLeft: 4 }}>{suffissoPrezzo}</span>
                      {annuale && !isScuolaCalcio && (
                        <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 3 }}>
                          €{p.fatturatoAnno.toLocaleString('it-IT')}/anno · risparmio 15%
                        </div>
                      )}
                      {annuale && isScuolaCalcio && (
                        <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 3 }}>
                          Pagamento unico, valido per tutta la stagione
                        </div>
                      )}
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', flex: 1 }}>
                      {p.features.map(f => (
                        <li key={f} style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.7, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ color: p.colore, flexShrink: 0 }}>·</span>{f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => scegliPiano(p.id)}
                      disabled={caricamento !== null}
                      style={{
                        display: 'block',
                        width: '100%',
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
                        cursor: caricamento !== null ? 'default' : 'pointer',
                        opacity: caricamento !== null && caricamento !== p.id ? 0.5 : 1,
                      }}
                    >
                      {caricamento === p.id ? 'Attendi…' : `Scegli ${p.nome} →`}
                    </button>
                  </div>
                )
              })}
            </div>

            {errore && (
              <p style={{ fontSize: 12, color: '#ff4444', marginBottom: 16 }}>{errore}</p>
            )}

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
              IVA esclusa · Cancellazione in qualsiasi momento · I tuoi dati rimangono intatti
            </p>
        </>

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
