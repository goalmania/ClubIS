'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function FamigliaSetupPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [codice,        setCodice]        = useState('')
  const [loading,       setLoading]       = useState(false)
  const [errore,        setErrore]        = useState<string | null>(null)
  const [successo,      setSuccesso]      = useState(false)
  const [invioLoading,  setInvioLoading]  = useState(false)
  const [invioStato,    setInvioStato]    = useState<'idle' | 'sent' | 'error'>('idle')
  const [invioMsg,      setInvioMsg]      = useState<string | null>(null)

  // Invia automaticamente il codice all'email dell'utente loggato al primo caricamento
  useEffect(() => {
    setInvioLoading(true)
    fetch('/api/inviti/richiedi-codice-famiglia', { method: 'POST' })
      .then(res => res.json())
      .then(json => {
        if (json.ok) {
          setInvioStato('sent')
          setInvioMsg('Codice inviato! Controlla la tua email.')
        } else {
          // Nessun profilo trovato — non è un errore bloccante, il genitore può usare il form manuale
          setInvioStato('error')
          setInvioMsg(json.error ?? null)
        }
      })
      .catch(() => {
        setInvioStato('error')
      })
      .finally(() => setInvioLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function collegaAccount() {
    const code = codice.trim()
    if (!code) { setErrore('Inserisci il codice invito.'); return }

    setLoading(true)
    setErrore(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Il codice invito è l'UUID del record in `famiglie`
    const { data: famiglia, error: fetchErr } = await supabase
      .from('famiglie')
      .select('id, nome, cognome, auth_user_id')
      .eq('id', code)
      .maybeSingle()

    if (fetchErr || !famiglia) {
      setErrore('Codice invito non valido. Verifica di aver copiato il codice completo.')
      setLoading(false)
      return
    }

    if (famiglia.auth_user_id && famiglia.auth_user_id !== user.id) {
      setErrore('Questo codice invito è già stato utilizzato da un altro account.')
      setLoading(false)
      return
    }

    // Collega l'account auth all'invito
    const { error: updateErr } = await supabase
      .from('famiglie')
      .update({ auth_user_id: user.id })
      .eq('id', code)

    if (updateErr) {
      setErrore('Errore durante il collegamento. Riprova tra qualche secondo.')
      setLoading(false)
      return
    }

    setSuccesso(true)
    // Breve pausa per mostrare il messaggio di successo, poi entra nella dashboard
    setTimeout(() => router.push('/dashboard/famiglia'), 1800)
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--black)',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo / titolo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 10,
            background: 'rgba(200,240,0,0.08)',
            border: '1px solid rgba(200,240,0,0.2)',
            fontSize: 24, marginBottom: 16,
          }}>
            👨‍👩‍👧
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            color: 'var(--white)', marginBottom: 8,
          }}>
            Collega il tuo account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', lineHeight: 1.6 }}>
            Inserisci il codice invito che ti ha fornito la segreteria del club
            per collegare il tuo account al profilo di tuo figlio/a.
          </p>
        </div>

        {/* Card principale */}
        <div style={{
          background: 'var(--grigio-6)',
          border: '1px solid var(--grigio-5)',
          borderRadius: 12,
          padding: 28,
          marginBottom: 20,
        }}>
          {successo ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                textTransform: 'uppercase', color: 'var(--verde)', marginBottom: 8,
              }}>
                Account collegato!
              </div>
              <p style={{ fontSize: 13, color: 'var(--grigio-3)' }}>
                Stai per essere reindirizzato alla tua area famiglia…
              </p>
            </div>
          ) : (
            <>
              <label style={{
                display: 'block', fontSize: 11,
                fontFamily: 'var(--font-display)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--grigio-3)', marginBottom: 8,
              }}>
                Codice invito *
              </label>
              <input
                className="input"
                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 8 }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={codice}
                onChange={e => { setCodice(e.target.value); setErrore(null) }}
                onKeyDown={e => e.key === 'Enter' && collegaAccount()}
                autoFocus
              />
              <p style={{ fontSize: 11, color: 'var(--grigio-4)', marginBottom: 20, lineHeight: 1.5 }}>
                Il codice è un identificativo univoco (UUID) che trovi nell&apos;email di invito
                o che puoi richiedere alla segreteria.
              </p>

              {errore && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,68,68,0.08)',
                  border: '1px solid rgba(255,68,68,0.3)',
                  fontSize: 13, color: 'var(--rosso)',
                  marginBottom: 16,
                }}>
                  {errore}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={collegaAccount}
                disabled={loading || !codice.trim()}
              >
                {loading ? 'Verifica in corso…' : 'Collega account'}
              </button>
            </>
          )}
        </div>

        {/* Sezione alternativa */}
        <div style={{
          background: 'var(--grigio-6)',
          border: '1px solid var(--grigio-5)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--grigio-3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 10,
          }}>
            Non hai ricevuto un codice?
          </div>
          <p style={{ fontSize: 13, color: 'var(--grigio-4)', lineHeight: 1.6, marginBottom: 14 }}>
            Se la segreteria ha già registrato il tuo profilo, puoi ricevere il codice
            direttamente alla tua email.
          </p>

          {invioStato === 'sent' ? (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.3)',
              fontSize: 13, color: 'var(--verde)',
            }}>
              ✓ {invioMsg}
            </div>
          ) : (
            <>
              {invioStato === 'error' && invioMsg && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,68,68,0.08)',
                  border: '1px solid rgba(255,68,68,0.3)',
                  fontSize: 13, color: 'var(--rosso)',
                  marginBottom: 10,
                }}>
                  {invioMsg}
                </div>
              )}
              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={invioLoading}
                onClick={async () => {
                  setInvioLoading(true)
                  setInvioMsg(null)
                  try {
                    const res = await fetch('/api/inviti/richiedi-codice-famiglia', { method: 'POST' })
                    const json = await res.json()
                    if (!res.ok) {
                      setInvioStato('error')
                      setInvioMsg(json.error ?? 'Errore durante l\'invio.')
                    } else {
                      setInvioStato('sent')
                      setInvioMsg('Codice inviato! Controlla la tua email.')
                    }
                  } catch {
                    setInvioStato('error')
                    setInvioMsg('Errore di rete. Riprova.')
                  }
                  setInvioLoading(false)
                }}
              >
                {invioLoading ? 'Invio in corso…' : 'Inviami il codice via email'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 10, lineHeight: 1.5, marginBottom: 0 }}>
                Se non trovi nessun profilo, contatta la segreteria del club e comunica il tuo indirizzo email.
              </p>
            </>
          )}
        </div>

        {/* Logout link */}
        <div style={{ textAlign: 'center' }}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--grigio-4)',
              textDecoration: 'underline',
            }}>
              Accedi con un account diverso
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
