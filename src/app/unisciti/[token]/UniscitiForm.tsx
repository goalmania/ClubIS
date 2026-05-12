'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const RUOLI_LABEL: Record<string, string> = {
  segretario:    'Segretario',
  allenatore:    'Allenatore',
  medico:        'Medico',
  ds:            'Direttore Sportivo',
  team_manager:  'Team Manager',
  osservatore:   'Osservatore',
  magazziniere:  'Magazziniere',
  presidente:    'Presidente',
}

interface Props {
  token:          string
  invitoId:       string
  ruolo:          string
  clubId:         string
  clubNome:       string
  clubCategoria:  string
  clubCitta:      string
}

export default function UniscitiForm({
  token, invitoId, ruolo, clubId, clubNome, clubCategoria, clubCitta,
}: Props) {
  const router = useRouter()

  const [nome,     setNome]     = useState('')
  const [cognome,  setCognome]  = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [errore,   setErrore]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)

    try {
      const supabase = createClient()

      // 1. Crea account Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome, cognome, ruolo, club_id: clubId },
        },
      })

      if (authErr || !authData.user) {
        setErrore(authErr?.message ?? 'Errore durante la registrazione')
        setLoading(false)
        return
      }

      const userId = authData.user.id

      // 2. Inserisce in utenti
      const { error: utenteErr } = await supabase.from('utenti').upsert({
        id:       userId,
        club_id:  clubId,
        nome,
        cognome,
        email,
        ruolo,
        attivo:   true,
        is_super_admin: false,
      }, { onConflict: 'id' })

      if (utenteErr) {
        setErrore(utenteErr.message)
        setLoading(false)
        return
      }

      // 3. Segna invito come usato
      await supabase.from('inviti_club').update({
        usato:    true,
        usato_da: userId,
        usato_at: new Date().toISOString(),
      }).eq('id', invitoId)

      // 4. Redirect alla dashboard
      router.push('/dashboard')
    } catch (err: unknown) {
      setErrore(err instanceof Error ? err.message : 'Errore imprevisto')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-app)', padding: '20px',
    }}>
      <div style={{ maxWidth: 460, width: '100%' }}>

        {/* Club header */}
        <div style={{
          padding: '20px 24px',
          border: '1px solid rgba(200,240,0,0.3)',
          background: 'rgba(200,240,0,0.04)',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            letterSpacing: '0.2em', color: 'var(--accent)', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Invito da
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 22, textTransform: 'uppercase', color: 'var(--white)',
          }}>
            {clubNome}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)',
            marginTop: 4,
          }}>
            {clubCategoria.toUpperCase()}{clubCitta ? ` · ${clubCitta}` : ''}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          padding: '28px 24px',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            textTransform: 'uppercase', fontSize: 16, color: 'var(--white)',
            marginBottom: 6,
          }}>
            Registrati come {RUOLI_LABEL[ruolo] ?? ruolo}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)',
            marginBottom: 24,
          }}>
            Completa il modulo per accedere alla dashboard ClubIS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.15em', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>
                Nome *
              </label>
              <input
                className="input"
                type="text"
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Mario"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.15em', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>
                Cognome *
              </label>
              <input
                className="input"
                type="text"
                required
                value={cognome}
                onChange={e => setCognome(e.target.value)}
                placeholder="Rossi"
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.15em', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>
              Email *
            </label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="mario.rossi@email.it"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.15em', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>
              Password *
            </label>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimo 8 caratteri"
            />
          </div>

          {errore && (
            <div style={{
              padding: '10px 14px', marginBottom: 16,
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid var(--rosso)',
              color: 'var(--rosso)',
              fontFamily: 'var(--font-mono)', fontSize: 12,
            }}>
              {errore}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Registrazione in corso...' : `Unisciti come ${RUOLI_LABEL[ruolo] ?? ruolo} →`}
          </button>

          <p style={{
            marginTop: 16, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)',
          }}>
            Hai già un account?{' '}
            <a href="/auth/login" style={{ color: 'var(--accent)' }}>Accedi</a>
          </p>
        </form>
      </div>
    </div>
  )
}
