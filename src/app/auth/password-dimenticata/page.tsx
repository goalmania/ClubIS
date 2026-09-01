'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PasswordDimenticataPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [inviata, setInviata]   = useState(false)
  const [errore, setErrore]     = useState('')
  const supabase = createClient()

  const invia = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrore('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      setErrore('Errore nell\'invio. Verifica l\'email e riprova.')
      return
    }
    setInviata(true)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--black)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 56, margin: '0 auto', display: 'block' }} />
        </div>

        <div className="card" style={{ padding: '32px 28px', background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2 }}>
          {inviata ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(var(--accent-rgb, 180,255,0), 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 10 }}>
                Email inviata!
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--gray)', marginBottom: 24, lineHeight: 1.6 }}>
                Se l&apos;indirizzo <strong style={{ color: 'var(--white)' }}>{email}</strong> è registrato, riceverai un link per reimpostare la password.
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>
                Controlla anche la cartella spam.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>
                Password dimenticata
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--gray)', marginBottom: 28 }}>
                Inserisci la tua email e ti invieremo un link per reimpostare la password.
              </div>

              <form onSubmit={invia}>
                <div style={{ marginBottom: 20 }}>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="nome@club.it"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                {errore && (
                  <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {errore}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {loading ? 'Invio in corso...' : 'Invia link di recupero →'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link
            href="/auth/login"
            style={{ fontSize: 12, color: 'var(--gray)', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
          >
            ← Torna al login
          </Link>
        </div>
      </div>
    </div>
  )
}
