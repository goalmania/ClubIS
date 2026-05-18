'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [conferma, setConferma]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [errore, setErrore]       = useState('')
  const [successo, setSuccesso]   = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  const aggiorna = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== conferma) { setErrore('Le password non coincidono'); return }
    if (password.length < 6)  { setErrore('La password deve avere almeno 6 caratteri'); return }
    setLoading(true)
    setErrore('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setErrore(error.message); setLoading(false); return }
    setSuccesso(true)
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--grigio-6)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--verde)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Nuova password</div>
          <div style={{ fontSize: 13, color: 'var(--grigio-4)', marginTop: 4 }}>ClubIS — The Intelligence System</div>
        </div>

        <div className="card" style={{ padding: '28px 24px' }}>
          {successo ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--verde)' }}>Password aggiornata!</div>
              <div style={{ fontSize: 13, color: 'var(--grigio-3)', marginTop: 8 }}>Reindirizzamento al login...</div>
            </div>
          ) : (
            <form onSubmit={aggiorna}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Nuova password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Minimo 6 caratteri"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Conferma password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Ripeti la password"
                  value={conferma}
                  onChange={e => setConferma(e.target.value)}
                  required
                />
              </div>
              {errore && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                  {errore}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Salvataggio...' : 'Imposta nuova password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
