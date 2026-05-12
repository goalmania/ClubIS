'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const LS_EMAIL = 'cis_ricordami_email'

export default function LoginPage() {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [ricordami, setRicordami] = useState(false)
  const [errore,    setErrore]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  // Pre-fill email se salvata
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_EMAIL)
      if (saved) { setEmail(saved); setRicordami(true) }
    } catch { /* localStorage non disponibile */ }
  }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrore('')
    try {
      if (ricordami) {
        localStorage.setItem(LS_EMAIL, email)
      } else {
        localStorage.removeItem(LS_EMAIL)
      }
    } catch { /* localStorage non disponibile */ }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErrore('Email o password non corretti.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  const loginApple = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--black)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 56, margin: '0 auto', display: 'block' }} />
        </div>

        {/* Card login */}
        <div className="card" style={{ padding: '32px 28px', background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>Accedi</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--gray)', marginBottom: 28 }}>
            Inserisci le credenziali del tuo account
          </div>

          <form onSubmit={login}>
            <div style={{ marginBottom: 18 }}>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="nome@club.it" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" autoFocus />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="ricordami"
                type="checkbox"
                checked={ricordami}
                onChange={e => setRicordami(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <label
                htmlFor="ricordami"
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--gray)', cursor: 'pointer', letterSpacing: '0.05em',
                }}
              >
                Ricordami
              </label>
            </div>
            {errore && (
              <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errore}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Accesso in corso...' : 'Accedi →'}
            </button>
          </form>

          {/* Separatore */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-solid)' }} />
            <span style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>oppure</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-solid)' }} />
          </div>

          {/* Google */}
          <button onClick={loginGoogle} style={socialBtnStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Accedi con Google
          </button>

          {/* Apple */}
          <button onClick={loginApple} style={{ ...socialBtnStyle, marginBottom: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Accedi con Apple
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--grigio-4)' }}>
          Problemi di accesso? Contatta l&apos;amministratore del club.
        </div>
      </div>
    </div>
  )
}

const socialBtnStyle: React.CSSProperties = {
  width: '100%', padding: '11px 20px', marginBottom: 10,
  background: 'var(--gray-light)', border: '1px solid var(--border-solid)',
  borderRadius: 2, cursor: 'pointer', color: 'var(--white)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
  transition: 'border-color 0.2s',
}
