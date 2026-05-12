'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PIANI = {
  starter: { nome: 'Starter', colore: 'var(--gray)', prezzo: '€59/mese' },
  pro:     { nome: 'Pro',     colore: 'var(--accent2)', prezzo: '€99/mese', popular: true },
  elite:   { nome: 'Elite',   colore: 'var(--accent)', prezzo: '€179/mese' },
} as const

type Piano = keyof typeof PIANI

const CATEGORIE = [
  { value: 'serie_a',         label: 'Serie A' },
  { value: 'serie_b',         label: 'Serie B' },
  { value: 'serie_c',         label: 'Serie C' },
  { value: 'serie_d',         label: 'Serie D' },
  { value: 'eccellenza',      label: 'Eccellenza' },
  { value: 'promozione',      label: 'Promozione' },
  { value: 'prima_categoria', label: 'Prima Categoria' },
  { value: 'scuola_calcio',   label: 'Altro / Settore Giovanile' },
]

const input: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'transparent',
  border: '1px solid var(--border-solid)',
  borderRadius: 8,
  color: 'var(--white)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
}

function RegistratiForm() {
  const router = useRouter()
  const params = useSearchParams()
  const pianoParam = (params.get('piano') ?? 'pro').toLowerCase() as Piano
  const piano: Piano = pianoParam in PIANI ? pianoParam : 'pro'
  const pianoDati = PIANI[piano]

  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', password: '',
    club_nome: '', club_categoria: 'eccellenza',
  })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)

    const res = await fetch('/api/registrati', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, piano }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setErrore(d.error ?? 'Errore durante la registrazione')
      setLoading(false)
      return
    }

    // Auto-login
    const supabase = createClient()
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (loginErr) {
      setErrore('Account creato ma login automatico fallito. Vai al login.')
      setLoading(false)
      return
    }

    router.push('/onboarding')
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
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 48 }} />
      </div>

      <div style={{
        width: '100%',
        maxWidth: 480,
        border: '1px solid var(--border-solid)',
        background: 'var(--gray-light)',
        borderRadius: 12,
        padding: '40px 36px',
      }}>
        {/* Badge piano */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: `${pianoDati.colore}18`,
          border: `1px solid ${pianoDati.colore}44`,
          borderRadius: 20,
          marginBottom: 24,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: pianoDati.colore }} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: pianoDati.colore, letterSpacing: '0.06em' }}>
            PIANO {pianoDati.nome.toUpperCase()} — {pianoDati.prezzo}
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--white)',
          marginBottom: 6,
        }}>
          Inizia la prova gratuita
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 28, lineHeight: 1.5 }}>
          7 giorni gratis — nessuna carta richiesta. Poi {pianoDati.prezzo}.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Nome *</label>
              <input style={input} value={form.nome} onChange={set('nome')} required placeholder="Mario" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Cognome *</label>
              <input style={input} value={form.cognome} onChange={set('cognome')} required placeholder="Rossi" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Email *</label>
            <input style={input} type="email" value={form.email} onChange={set('email')} required placeholder="mario@club.it" autoComplete="email" />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Password *</label>
            <input style={input} type="password" value={form.password} onChange={set('password')} required placeholder="Minimo 8 caratteri" autoComplete="new-password" minLength={8} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Nome del club *</label>
            <input style={input} value={form.club_nome} onChange={set('club_nome')} required placeholder="A.S.D. Esempio Calcio" />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Categoria</label>
            <select style={{ ...input, cursor: 'pointer' }} value={form.club_categoria} onChange={set('club_categoria')}>
              {CATEGORIE.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {errore && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(255,68,68,0.08)',
              border: '1px solid rgba(255,68,68,0.25)',
              borderRadius: 8,
              fontSize: 13,
              color: '#ff6b6b',
            }}>
              {errore}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '14px 24px',
              background: loading ? 'var(--gray-mid)' : 'var(--accent)',
              color: '#000',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              border: 'none',
              borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? 'Creazione account…' : 'Crea account e inizia →'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--gray)', textAlign: 'center' }}>
          Hai già un account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Accedi</Link>
        </p>
      </div>

      <p style={{ marginTop: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380 }}>
        Registrandoti accetti i{' '}
        <a href="https://dmfootballservices.it/termini" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray)' }}>Termini di servizio</a>
        {' '}e la{' '}
        <a href="https://dmfootballservices.it/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray)' }}>Privacy Policy</a>.
      </p>
    </div>
  )
}

export default function RegistratiPage() {
  return (
    <Suspense>
      <RegistratiForm />
    </Suspense>
  )
}
