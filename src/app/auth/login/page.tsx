'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const LS_EMAIL = 'cis_ricordami_email'

function LoginContent() {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [ricordami, setRicordami] = useState(false)
  const [errore,    setErrore]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()

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
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErrore('Email o password non corretti.'); setLoading(false); return }

    // Sessioni concorrenti: permesse solo per piano pro/elite
    // Per starter/trial invalidiamo le altre sessioni attive
    if (signInData.user) {
      const { data: utente } = await supabase
        .from('utenti')
        .select('club_id')
        .eq('id', signInData.user.id)
        .maybeSingle()

      if (utente?.club_id) {
        const { data: club } = await supabase
          .from('clubs')
          .select('plan_tier')
          .eq('id', utente.club_id)
          .maybeSingle()

        const allowConcurrent = club?.plan_tier === 'pro' || club?.plan_tier === 'elite'
        if (!allowConcurrent) {
          await supabase.auth.signOut({ scope: 'others' })
        }
      }
    }

    // Redirect a redirect_to se presente e sicuro (solo path interni)
    const redirectTo = searchParams.get('redirect_to')
    const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard'
    router.push(dest)
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
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a
                href="/auth/password-dimenticata"
                style={{ fontSize: 11, color: 'var(--gray)', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
              >
                Password dimenticata?
              </a>
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

        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--grigio-4)' }}>
          Problemi di accesso? Contatta l&apos;amministratore del club.
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
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
