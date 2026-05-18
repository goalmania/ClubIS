'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CompletaProfiloPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [step, setStep]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  // Dati dall'OAuth
  const [emailOAuth, setEmailOAuth] = useState('')

  // Step 1
  const [nome, setNome]         = useState('')
  const [cognome, setCognome]   = useState('')
  const [telefono, setTelefono] = useState('')
  const [codiceClub, setCodiceClub] = useState('')

  // Step 2 — Consensi
  const [accettaTermini, setAccettaTermini]     = useState(false)
  const [accettaPrivacy, setAccettaPrivacy]     = useState(false)
  const [accettaDati, setAccettaDati]           = useState(false)
  const [accettaComm, setAccettaComm]           = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setEmailOAuth(user.email ?? '')
      const meta = user.user_metadata ?? {}
      const fullName: string = meta.full_name ?? meta.name ?? ''
      const parti = fullName.split(' ')
      setNome(parti[0] ?? '')
      setCognome(parti.slice(1).join(' ') ?? '')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const completa = async () => {
    if (!accettaTermini || !accettaPrivacy || !accettaDati) {
      setErrore('Devi accettare tutti i consensi obbligatori.')
      return
    }
    setSaving(true)
    setErrore('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Trova club tramite codice invito
    let clubId: string | null = null
    if (codiceClub.trim()) {
      const { data: club } = await supabase
        .from('clubs')
        .select('id')
        .eq('codice_invito', codiceClub.trim().toUpperCase())
        .maybeSingle()
      if (!club) { setErrore('Codice club non valido.'); setSaving(false); return }
      clubId = club.id
    }

    const { error } = await supabase.from('utenti').insert({
      id: user.id,
      club_id: clubId,
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: emailOAuth,
      telefono: telefono.trim() || null,
      ruolo: 'famiglia',
      attivo: true,
      is_super_admin: false,
    })

    setSaving(false)
    if (error) { setErrore(`Errore: ${error.message}`); return }

    // Invia automaticamente il codice invito all'email del nuovo account famiglia
    fetch('/api/inviti/richiedi-codice-famiglia', { method: 'POST' }).catch(() => {})

    router.push('/dashboard')
    router.refresh()
  }

  const consensi = [
    { key: 'termini',   state: accettaTermini, set: setAccettaTermini, obbligatorio: true,  link: '/legal/termini',  label: 'Accetto i Termini e Condizioni di utilizzo del servizio ClubIS' },
    { key: 'privacy',   state: accettaPrivacy, set: setAccettaPrivacy, obbligatorio: true,  link: '/legal/privacy',  label: 'Ho letto e accetto la Privacy Policy (GDPR). Autorizzo il trattamento dei miei dati personali per la gestione dell\'account e dei servizi ClubIS.' },
    { key: 'dati',      state: accettaDati,    set: setAccettaDati,    obbligatorio: true,  link: null,              label: 'Autorizzo il club sportivo a trattare i miei dati ai fini della gestione delle attività sportive e amministrative, ai sensi del D.Lgs. 196/2003 e GDPR 2016/679.' },
    { key: 'comm',      state: accettaComm,    set: setAccettaComm,    obbligatorio: false, link: null,              label: 'Acconsento a ricevere comunicazioni promozionali e aggiornamenti da ClubIS (opzionale)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: 2, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--white)' }}>
            C<span style={{ color: 'var(--accent)' }}>IS</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gray)', textTransform: 'uppercase', marginTop: 6 }}>
            Completa il tuo profilo
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
          {['Dati personali', 'Consensi'].map((s, i) => {
            const n = i + 1
            const active = step === n
            const done   = step > n
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: done || active ? 'var(--accent)' : '#222', border: `2px solid ${done || active ? 'var(--accent)' : '#333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: done || active ? '#000' : '#555', fontFamily: 'monospace' }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize: 11, marginLeft: 6, marginRight: 14, color: active ? 'var(--accent)' : done ? 'var(--gray)' : '#444', fontWeight: active ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s}</span>
                {i < 1 && <div style={{ width: 24, height: 1, background: '#333', marginRight: 14 }} />}
              </div>
            )
          })}
        </div>

        <div className="card" style={{ padding: '28px 32px', background: '#111', border: '1px solid var(--border-solid)' }}>

          {/* Step 1 — Dati personali */}
          {step === 1 && (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 16, letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 20 }}>
                I tuoi dati
              </div>

              {emailOAuth && (
                <div style={{ background: 'rgba(200,240,0,0.06)', border: '1px solid rgba(200,240,0,0.2)', borderRadius: 2, padding: '8px 12px', marginBottom: 20, fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  Account: {emailOAuth}
                </div>
              )}

              <F label="Nome *">
                <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario" />
              </F>
              <F label="Cognome *">
                <input className="input" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" />
              </F>
              <F label="Telefono">
                <input className="input" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 333 1234567" />
              </F>
              <F label="Codice club" hint="Fornito dalla segreteria del tuo club (es. CLUB-ABC123). Puoi aggiungerlo anche in seguito.">
                <input className="input" value={codiceClub} onChange={e => setCodiceClub(e.target.value.toUpperCase())} placeholder="CLUB-ABC123" style={{ textTransform: 'uppercase' }} />
              </F>

              {errore && <p style={{ color: 'var(--rosso)', fontSize: 13, marginBottom: 12 }}>{errore}</p>}

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                onClick={() => { if (!nome.trim() || !cognome.trim()) { setErrore('Nome e cognome sono obbligatori.'); return } setErrore(''); setStep(2) }}
                disabled={!nome || !cognome}
              >
                Avanti →
              </button>
            </>
          )}

          {/* Step 2 — Consensi */}
          {step === 2 && (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 16, letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 6 }}>
                Consensi e dichiarazioni
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 22 }}>
                Leggi attentamente e accetta per continuare
              </div>

              {consensi.map(c => (
                <div key={c.key} style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--gray-light)', borderRadius: 2, border: `1px solid ${c.state ? 'rgba(200,240,0,0.3)' : 'var(--border-solid)'}`, transition: 'border-color 0.15s' }}>
                  <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={c.state} onChange={e => c.set(e.target.checked)} style={{ accentColor: 'var(--accent)', flexShrink: 0, marginTop: 3, width: 15, height: 15 }} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6 }}>
                        {c.label}
                        {c.obbligatorio && <span style={{ color: 'var(--rosso)', marginLeft: 4 }}>*</span>}
                      </div>
                      {c.link && (
                        <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                          LEGGI →
                        </a>
                      )}
                    </div>
                  </label>
                </div>
              ))}

              {errore && <p style={{ color: 'var(--rosso)', fontSize: 13, marginBottom: 12 }}>{errore}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => { setErrore(''); setStep(1) }}>← Indietro</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={completa}
                  disabled={!accettaTermini || !accettaPrivacy || !accettaDati || saving}
                >
                  {saving ? 'Salvataggio...' : 'Completa registrazione →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="label">{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 5, fontFamily: 'var(--font-mono)' }}>{hint}</div>}
    </div>
  )
}
