'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Modulo {
  id: string
  club_id: string
  slug: string
  titolo: string
  descrizione: string | null
  tipo: string
  stagione: string
  richiedi_data_nascita: boolean
  richiedi_codice_fiscale: boolean
  richiedi_genitore: boolean
  richiedi_documento: boolean
  richiedi_consenso_gdpr: boolean
  richiedi_consenso_foto: boolean
  pagamento_obbligatorio: boolean
  importo_iscrizione: number | null
  clubs: { nome: string; logo_url: string | null; citta: string | null }
}

type Step = 1 | 2 | 3 | 4

export default function FormIscrizionePublic({ modulo }: { modulo: Modulo }) {
  const supabase = createClient()
  const [step, setStep] = useState<Step>(1)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — Dati atleta
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [dataNascita, setDataNascita] = useState('')
  const [cf, setCf] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [comune, setComune] = useState('')

  // Step 2 — Dati genitore
  const [gNome, setGNome] = useState('')
  const [gCognome, setGCognome] = useState('')
  const [gEmail, setGEmail] = useState('')
  const [gTel, setGTel] = useState('')
  const [gCf, setGCf] = useState('')
  const [relazione, setRelazione] = useState('genitore')

  // Step 3 — Consensi
  const [gdpr, setGdpr] = useState(false)
  const [foto, setFoto] = useState(false)

  const club = modulo.clubs

  const handleSubmit = async () => {
    if (modulo.richiedi_consenso_gdpr && !gdpr) {
      setError('Il consenso al trattamento dati è obbligatorio.')
      return
    }
    if (!gEmail.trim()) {
      setError("L'email del genitore/responsabile è obbligatoria.")
      return
    }
    setSaving(true)
    setError(null)

    const { error: err } = await supabase.from('richieste_iscrizione').insert({
      modulo_id: modulo.id,
      club_id: modulo.club_id,
      nome: nome.trim(),
      cognome: cognome.trim(),
      data_nascita: dataNascita || null,
      codice_fiscale: cf.trim() || null,
      indirizzo: indirizzo.trim() || null,
      comune: comune.trim() || null,
      genitore_nome: gNome.trim() || null,
      genitore_cognome: gCognome.trim() || null,
      genitore_email: gEmail.trim(),
      genitore_telefono: gTel.trim() || null,
      genitore_cf: gCf.trim() || null,
      relazione,
      consenso_gdpr: gdpr,
      consenso_foto: foto,
      consenso_data: new Date().toISOString(),
      stato: 'in_attesa',
    })

    setSaving(false)
    if (err) {
      setError('Errore durante l\'invio. Riprova o contatta la segreteria.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
            <h2 style={h2Style}>Iscrizione ricevuta!</h2>
            <p style={{ color: '#aaa', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
              Grazie <strong style={{ color: '#f5f3ee' }}>{nome} {cognome}</strong>.
            </p>
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6 }}>
              La tua richiesta è stata inviata a <strong style={{ color: '#f5f3ee' }}>{club.nome}</strong>.
              La segreteria ti contatterà all'indirizzo <strong style={{ color: accent }}>{gEmail}</strong>
              {' '}per confermare l'iscrizione.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const steps = ['Atleta', 'Genitore', 'Consensi', 'Conferma']

  return (
    <div style={pageStyle}>
      {/* Header club */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        {club.logo_url && (
          <img src={club.logo_url} alt={club.nome} style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 10 }} />
        )}
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f5f3ee', marginBottom: 4 }}>
          {club.nome}
        </h1>
        <p style={{ color: accent, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {modulo.titolo}
        </p>
        {modulo.descrizione && (
          <p style={{ color: '#888', fontSize: 13, marginTop: 6, maxWidth: 420, margin: '6px auto 0' }}>
            {modulo.descrizione}
          </p>
        )}
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
        {steps.map((s, i) => {
          const n = (i + 1) as Step
          const active = step === n
          const done = step > n
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? accent : active ? accent : '#222',
                border: `2px solid ${done || active ? accent : '#333'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: done || active ? '#000' : '#555',
                fontFamily: 'monospace',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: 11, color: active ? accent : done ? '#aaa' : '#444', fontWeight: active ? 700 : 400, marginLeft: 5, marginRight: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s}
              </span>
              {i < steps.length - 1 && <div style={{ width: 20, height: 1, background: '#333', marginRight: 12 }} />}
            </div>
          )
        })}
      </div>

      <div style={cardStyle}>
        {/* Step 1 — Dati atleta */}
        {step === 1 && (
          <div>
            <h3 style={sectionTitle}>Dati dell'atleta</h3>
            <div style={gridStyle}>
              <Field label="Nome *">
                <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario" />
              </Field>
              <Field label="Cognome *">
                <input style={inputStyle} value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" />
              </Field>
            </div>
            {modulo.richiedi_data_nascita && (
              <div style={gridStyle}>
                <Field label="Data di nascita">
                  <input style={inputStyle} type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} />
                </Field>
                <Field label="Comune di nascita">
                  <input style={inputStyle} value={comune} onChange={e => setComune(e.target.value)} placeholder="Roma" />
                </Field>
              </div>
            )}
            {modulo.richiedi_codice_fiscale && (
              <Field label="Codice fiscale">
                <input style={{ ...inputStyle, textTransform: 'uppercase' }} value={cf}
                  onChange={e => setCf(e.target.value.toUpperCase())} placeholder="RSSMRA90A01H501Z" maxLength={16} />
              </Field>
            )}
            <Field label="Indirizzo di residenza">
              <input style={inputStyle} value={indirizzo} onChange={e => setIndirizzo(e.target.value)} placeholder="Via Roma 1, Milano" />
            </Field>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button style={btnPrimary} onClick={() => {
                if (!nome.trim() || !cognome.trim()) { setError('Nome e cognome sono obbligatori.'); return }
                setError(null); setStep(2)
              }}>
                Avanti →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Dati genitore */}
        {step === 2 && (
          <div>
            <h3 style={sectionTitle}>Dati genitore / responsabile</h3>
            <div style={gridStyle}>
              <Field label="Nome">
                <input style={inputStyle} value={gNome} onChange={e => setGNome(e.target.value)} placeholder="Anna" />
              </Field>
              <Field label="Cognome">
                <input style={inputStyle} value={gCognome} onChange={e => setGCognome(e.target.value)} placeholder="Rossi" />
              </Field>
            </div>
            <Field label="Email *">
              <input style={inputStyle} type="email" value={gEmail} onChange={e => setGEmail(e.target.value)} placeholder="anna.rossi@email.com" />
            </Field>
            <div style={gridStyle}>
              <Field label="Telefono">
                <input style={inputStyle} type="tel" value={gTel} onChange={e => setGTel(e.target.value)} placeholder="+39 333 1234567" />
              </Field>
              <Field label="Relazione">
                <select style={inputStyle} value={relazione} onChange={e => setRelazione(e.target.value)}>
                  <option value="genitore">Genitore</option>
                  <option value="tutore">Tutore legale</option>
                  <option value="atleta">Atleta (maggiorenne)</option>
                </select>
              </Field>
            </div>
            <Field label="Codice fiscale genitore">
              <input style={{ ...inputStyle, textTransform: 'uppercase' }} value={gCf}
                onChange={e => setGCf(e.target.value.toUpperCase())} placeholder="RSSANN70A41H501Z" maxLength={16} />
            </Field>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <button style={btnSecondary} onClick={() => { setError(null); setStep(1) }}>← Indietro</button>
              <button style={btnPrimary} onClick={() => {
                if (!gEmail.trim()) { setError("L'email è obbligatoria."); return }
                setError(null); setStep(3)
              }}>
                Avanti →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Consensi */}
        {step === 3 && (
          <div>
            <h3 style={sectionTitle}>Consensi e dichiarazioni</h3>
            {modulo.richiedi_consenso_gdpr && (
              <label style={checkLabel}>
                <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: accent, flexShrink: 0 }} />
                <span>
                  <strong>Consenso al trattamento dei dati personali *</strong><br />
                  <span style={{ color: '#888', fontSize: 12 }}>
                    Ai sensi del GDPR (Reg. UE 679/2016) e del D.Lgs. 196/2003, acconsento al trattamento
                    dei dati personali del minore/atleta per finalità di gestione sportiva, amministrativa
                    e organizzativa da parte di {club.nome}.
                  </span>
                </span>
              </label>
            )}
            {modulo.richiedi_consenso_foto && (
              <label style={{ ...checkLabel, marginTop: 16 }}>
                <input type="checkbox" checked={foto} onChange={e => setFoto(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: accent, flexShrink: 0 }} />
                <span>
                  <strong>Consenso alla pubblicazione di immagini</strong><br />
                  <span style={{ color: '#888', fontSize: 12 }}>
                    Acconsento alla pubblicazione di foto e video del minore/atleta sui canali ufficiali
                    di {club.nome} (sito web, social media, materiale promozionale).
                  </span>
                </span>
              </label>
            )}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <button style={btnSecondary} onClick={() => { setError(null); setStep(2) }}>← Indietro</button>
              <button style={btnPrimary} onClick={() => {
                if (modulo.richiedi_consenso_gdpr && !gdpr) { setError('Il consenso GDPR è obbligatorio.'); return }
                setError(null); setStep(4)
              }}>
                Avanti →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Conferma */}
        {step === 4 && (
          <div>
            <h3 style={sectionTitle}>Riepilogo e conferma</h3>
            <div style={{ background: '#0d0d0d', borderRadius: 4, padding: '16px 18px', marginBottom: 16, fontSize: 13, lineHeight: 1.8 }}>
              <Row label="Atleta" value={`${nome} ${cognome}`} />
              {dataNascita && <Row label="Nato/a il" value={new Date(dataNascita).toLocaleDateString('it-IT')} />}
              {cf && <Row label="Codice fiscale" value={cf} />}
              <div style={{ height: 1, background: '#222', margin: '8px 0' }} />
              <Row label="Genitore" value={`${gNome} ${gCognome}`.trim() || '—'} />
              <Row label="Email" value={gEmail} />
              {gTel && <Row label="Telefono" value={gTel} />}
              <div style={{ height: 1, background: '#222', margin: '8px 0' }} />
              <Row label="Consenso dati" value={gdpr ? '✓ Accordato' : '—'} />
              <Row label="Consenso foto" value={foto ? '✓ Accordato' : '—'} />
            </div>
            {modulo.importo_iscrizione && (
              <div style={{ background: '#1a1a00', border: `1px solid ${accent}`, borderRadius: 4, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                <strong style={{ color: accent }}>Quota iscrizione: €{Number(modulo.importo_iscrizione).toFixed(2)}</strong>
                <br /><span style={{ color: '#888', fontSize: 12 }}>Il pagamento verrà gestito dalla segreteria al momento della conferma.</span>
              </div>
            )}
            {error && <p style={{ color: '#ff4d4d', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={btnSecondary} onClick={() => { setError(null); setStep(3) }}>← Indietro</button>
              <button style={{ ...btnPrimary, minWidth: 160 }} onClick={handleSubmit} disabled={saving}>
                {saving ? 'Invio in corso...' : 'Invia iscrizione ✓'}
              </button>
            </div>
          </div>
        )}

        {error && step !== 4 && (
          <p style={{ color: '#ff4d4d', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}
      </div>

      <p style={{ textAlign: 'center', color: '#444', fontSize: 11, marginTop: 20 }}>
        ClubIS — The Intelligence System · Dati protetti e trattati ai sensi del GDPR
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: '#666', minWidth: 130 }}>{label}:</span>
      <span style={{ color: '#f5f3ee', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const accent = '#c8f000'
const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: '#0a0a0a', color: '#f5f3ee',
  padding: '32px 16px', fontFamily: 'system-ui, -apple-system, sans-serif',
}
const cardStyle: React.CSSProperties = {
  maxWidth: 520, margin: '0 auto', background: '#111',
  border: '1px solid #222', borderRadius: 6, padding: '24px 28px',
}
const h2Style: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
  fontSize: 24, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '-0.01em',
}
const sectionTitle: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
  fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: '#f5f3ee', marginBottom: 18, paddingBottom: 10,
  borderBottom: '1px solid #222',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d0d0d', border: '1px solid #333',
  borderRadius: 4, padding: '10px 12px', color: '#f5f3ee', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }
const btnPrimary: React.CSSProperties = {
  background: accent, color: '#000', border: 'none', borderRadius: 4,
  padding: '11px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}
const btnSecondary: React.CSSProperties = {
  background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: 4,
  padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}
const checkLabel: React.CSSProperties = {
  display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer',
  fontSize: 13, lineHeight: 1.5, color: '#ddd',
}
