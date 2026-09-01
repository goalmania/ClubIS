'use client'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui'

type Piattaforma = 'ios' | 'android' | 'altro'

function rilevaPiattaforma(): Piattaforma {
  if (typeof navigator === 'undefined') return 'altro'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'altro'
}

export default function AppMobilePage() {
  const [piattaforma, setPiattaforma] = useState<Piattaforma>('altro')
  const [tab, setTab] = useState<'ios' | 'android'>('ios')

  useEffect(() => {
    const p = rilevaPiattaforma()
    setPiattaforma(p)
    if (p === 'android') setTab('android')
  }, [])

  return (
    <div>
      <PageHeader
        title="Installa ClubIS come app"
        subtitle="Aggiungila alla schermata Home: si apre a schermo intero, senza barra degli indirizzi, e resti sempre collegato"
      />

      {piattaforma !== 'altro' && (
        <div className="card" style={{
          padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(200,240,0,0.06)', border: '1px solid rgba(200,240,0,0.25)',
        }}>
          <span style={{ fontSize: 18 }}>📱</span>
          <span style={{ fontSize: 13, color: 'var(--grigio-2, #ccc)' }}>
            Abbiamo rilevato che stai usando un {piattaforma === 'ios' ? 'iPhone/iPad' : 'dispositivo Android'} — ecco le istruzioni per il tuo dispositivo.
          </span>
        </div>
      )}

      {/* Tabs iOS / Android */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border, #2a2a2a)' }}>
        {(['ios', 'android'] as const).map(t => {
          const attivo = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 18px', background: 'transparent', border: 'none',
                borderBottom: attivo ? '2px solid var(--accent, #c8f000)' : '2px solid transparent',
                color: attivo ? 'var(--accent, #c8f000)' : 'var(--grigio-3, #999)',
                fontFamily: 'var(--font-display)', fontWeight: attivo ? 700 : 500, fontSize: 13,
                textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginBottom: -1,
              }}
            >
              {t === 'ios' ? '🍎 iPhone / iPad' : '🤖 Android'}
            </button>
          )
        })}
      </div>

      {tab === 'ios' ? <IstruzioniIOS /> : <IstruzioniAndroid />}

      <div className="card" style={{ padding: '16px 18px', marginTop: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, color: 'var(--white)' }}>
          Perché conviene farlo
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--grigio-3, #999)', lineHeight: 1.9 }}>
          <li>Si apre come un&apos;app vera, a schermo intero — niente barra di Safari/Chrome</li>
          <li>Resti collegato: non ti verrà richiesto di rifare l&apos;accesso ogni volta</li>
          <li>Icona ClubIS direttamente sulla schermata Home, come qualsiasi altra app</li>
          <li>Ricevi le notifiche (pagamenti, quote, comunicazioni) più facilmente</li>
        </ul>
      </div>
    </div>
  )
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
      <div style={{
        flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
        background: 'var(--accent, #c8f000)', color: '#0d0d0d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14,
      }}>
        {n}
      </div>
      <div style={{ fontSize: 14, color: 'var(--grigio-2, #ddd)', lineHeight: 1.7, paddingTop: 4 }}>
        {children}
      </div>
    </div>
  )
}

function IstruzioniIOS() {
  return (
    <div className="card" style={{ padding: '22px 24px' }}>
      <div style={{
        fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent, #c8f000)',
        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 18,
      }}>
        Solo con Safari — su iPhone Chrome non permette di creare l&apos;icona
      </div>

      <Passo n={1}>
        Apri <strong>clubis.it</strong> usando <strong>Safari</strong> (non Chrome) e accedi al tuo account come fai di solito.
      </Passo>
      <Passo n={2}>
        In basso al centro (o in alto, su iPad) tocca l&apos;icona <strong>Condividi</strong> — il quadrato con la freccia verso l&apos;alto <span style={{ fontFamily: 'var(--font-mono)' }}>⬆️□</span>.
      </Passo>
      <Passo n={3}>
        Scorri l&apos;elenco delle opzioni verso il basso e tocca <strong>&quot;Aggiungi alla schermata Home&quot;</strong>.
      </Passo>
      <Passo n={4}>
        Verifica il nome (va bene &quot;ClubIS&quot;) e tocca <strong>&quot;Aggiungi&quot;</strong> in alto a destra.
      </Passo>
      <Passo n={5}>
        Fatto! Trovi l&apos;icona di ClubIS sulla schermata Home: aprila da lì invece che da Safari — resterai sempre collegato.
      </Passo>
    </div>
  )
}

function IstruzioniAndroid() {
  return (
    <div className="card" style={{ padding: '22px 24px' }}>
      <div style={{
        fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent, #c8f000)',
        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 18,
      }}>
        Con Chrome (o altri browser basati su Chrome, es. Samsung Internet)
      </div>

      <Passo n={1}>
        Apri <strong>clubis.it</strong> usando <strong>Chrome</strong> e accedi al tuo account.
      </Passo>
      <Passo n={2}>
        Spesso Chrome mostra da solo un banner <strong>&quot;Aggiungi ClubIS alla schermata Home&quot;</strong> o <strong>&quot;Installa app&quot;</strong> in basso: se lo vedi, toccalo e vai al passo 4.
      </Passo>
      <Passo n={3}>
        Se non compare da solo: tocca i <strong>tre puntini ⋮</strong> in alto a destra, poi <strong>&quot;Installa app&quot;</strong> (o <strong>&quot;Aggiungi a schermata Home&quot;</strong>).
      </Passo>
      <Passo n={4}>
        Conferma toccando <strong>&quot;Installa&quot;</strong> (o <strong>&quot;Aggiungi&quot;</strong>).
      </Passo>
      <Passo n={5}>
        Fatto! Trovi l&apos;icona di ClubIS tra le tue app: aprila da lì — resterai sempre collegato.
      </Passo>
    </div>
  )
}
