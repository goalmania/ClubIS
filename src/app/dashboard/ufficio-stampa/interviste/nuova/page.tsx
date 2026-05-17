'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const TIPI_EVENTO = [
  { value: 'intervista_tv',     label: 'Intervista TV' },
  { value: 'conferenza_stampa', label: 'Conferenza stampa' },
  { value: 'intervista_radio',  label: 'Intervista radio' },
  { value: 'podcast',           label: 'Podcast' },
  { value: 'photoshoot',        label: 'Photoshoot' },
  { value: 'altro',             label: 'Altro' },
]

const RUOLI_STAFF = ['presidente', 'ds', 'allenatore', 'segretario', 'team_manager']

const RUOLO_LABEL: Record<string, string> = {
  presidente: 'Presidente', ds: 'Dir. Sportivo', allenatore: 'Allenatore',
  segretario: 'Segretario', team_manager: 'Team Manager',
}

interface Soggetto {
  id: string
  nome: string
  cognome: string
  gruppo: string   // 'Staff' | 'Giocatori'
  ruolo?: string
}

export default function NuovaIntervistePage() {
  const router = useRouter()
  // Istanza stabile: non va nel body del componente per evitare loop nell'useEffect
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [soggetti, setSoggetti] = useState<Soggetto[]>([])
  const [selezionati, setSelezionati] = useState<string[]>([])

  const [form, setForm] = useState({
    tipo: 'intervista_tv',
    data: '',
    ora: '',
    durata_minuti: 30,
    luogo: '',
    emittente_testata: '',
    stato: 'da_confermare',
    note: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  // Carica staff e giocatori del club — [] garantisce una sola esecuzione
  useEffect(() => {
    async function load() {
      const [staffData, giocatoriData] = await Promise.all([
        fetch('/api/staff?ruoli=' + RUOLI_STAFF.join(',')).then(r => r.json()).catch(() => []),
        fetch('/api/giocatori').then(r => r.json()).catch(() => []),
      ])

      const staff: any[]     = Array.isArray(staffData)     ? staffData     : []
      const giocatori: any[] = Array.isArray(giocatoriData) ? giocatoriData : []

      const lista: Soggetto[] = [
        ...staff.map((u: any) => ({
          id: u.id,
          nome: u.nome,
          cognome: u.cognome,
          gruppo: 'Staff',
          ruolo: RUOLO_LABEL[u.ruolo] ?? u.ruolo,
        })),
        ...giocatori.map((g: any) => ({
          id: g.id,
          nome: g.nome,
          cognome: g.cognome,
          gruppo: 'Giocatori',
        })),
      ]
      setSoggetti(lista)
    }
    load()
  }, [])

  const toggleSoggetto = (id: string) => {
    setSelezionati(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const salva = async () => {
    if (!form.data || !form.ora) {
      setErrore('Data e ora sono obbligatorie')
      return
    }
    setSaving(true)
    setErrore(null)

    const data_ora = `${form.data}T${form.ora}:00`

    const res = await fetch('/api/ufficio-stampa/eventi-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: form.tipo,
        data_ora,
        durata_minuti: Number(form.durata_minuti),
        luogo: form.luogo || undefined,
        emittente_testata: form.emittente_testata || undefined,
        stato: form.stato,
        note: form.note || undefined,
        soggetti_coinvolti: selezionati,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setErrore(json.error ?? 'Errore durante il salvataggio')
      setSaving(false)
      return
    }
    router.push('/dashboard/ufficio-stampa/calendario-media')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: '#1a1a1a', border: '1px solid var(--border-solid)',
    borderRadius: 2, color: 'var(--white)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none',
  } as const

  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
    fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '0.15em', color: 'var(--grigio-3)', marginBottom: 6,
  }

  // Raggruppa soggetti per gruppo
  const gruppi = soggetti.reduce<Record<string, Soggetto[]>>((acc, s) => {
    if (!acc[s.gruppo]) acc[s.gruppo] = []
    acc[s.gruppo].push(s)
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        }}>
          Nuovo evento media
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Programma un&apos;intervista, conferenza stampa o altro impegno mediatico
        </p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {errore && (
          <div style={{
            padding: '10px 14px', background: 'var(--rosso-lt)',
            border: '1px solid var(--rosso-bd)', borderRadius: 2,
            color: 'var(--rosso)', fontSize: 13, marginBottom: 20,
          }}>
            {errore}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo evento *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputStyle}>
              {TIPI_EVENTO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Data e ora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ora *</label>
              <input type="time" value={form.ora} onChange={e => set('ora', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Durata */}
          <div>
            <label style={labelStyle}>Durata (minuti)</label>
            <input
              type="number" min={5} max={480} value={form.durata_minuti}
              onChange={e => set('durata_minuti', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Emittente */}
          <div>
            <label style={labelStyle}>Emittente / Testata</label>
            <input
              type="text" placeholder="es. RAI Sport, Corriere dello Sport…"
              value={form.emittente_testata} onChange={e => set('emittente_testata', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Luogo */}
          <div>
            <label style={labelStyle}>Luogo</label>
            <input
              type="text" placeholder="es. Sala stampa stadio, Studio TV…"
              value={form.luogo} onChange={e => set('luogo', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* ── Soggetti coinvolti ── */}
          <div>
            <label style={labelStyle}>
              Soggetti coinvolti{selezionati.length > 0 && ` (${selezionati.length} selezionati)`}
            </label>

            {soggetti.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--grigio-4)', padding: '10px 0' }}>
                Caricamento tesserati…
              </div>
            ) : (
              <div style={{
                border: '1px solid var(--border-solid)', borderRadius: 2,
                background: '#1a1a1a', maxHeight: 260, overflowY: 'auto',
              }}>
                {Object.entries(gruppi).map(([gruppo, membri]) => (
                  <div key={gruppo}>
                    {/* Intestazione gruppo */}
                    <div style={{
                      padding: '7px 12px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
                      color: 'var(--grigio-4)',
                      background: '#111',
                      borderBottom: '1px solid var(--border-solid)',
                      position: 'sticky', top: 0,
                    }}>
                      {gruppo}
                    </div>

                    {membri.map(s => {
                      const isSelected = selezionati.includes(s.id)
                      return (
                        <label key={s.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 14px', cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: isSelected ? 'rgba(200,240,0,0.06)' : 'transparent',
                          transition: 'background 0.1s',
                        }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSoggetto(s.id)}
                            style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 13, color: isSelected ? 'var(--white)' : 'var(--grigio-2)', flex: 1 }}>
                            {s.cognome} {s.nome}
                          </span>
                          {s.ruolo && (
                            <span style={{
                              fontSize: 10, fontFamily: 'var(--font-mono)',
                              color: 'var(--grigio-4)', textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}>
                              {s.ruolo}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            {selezionati.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                Riceveranno una notifica alla conferma dell&apos;evento.
              </div>
            )}
          </div>

          {/* Stato iniziale */}
          <div>
            <label style={labelStyle}>Stato</label>
            <select value={form.stato} onChange={e => set('stato', e.target.value)} style={inputStyle}>
              <option value="da_confermare">Da confermare</option>
              <option value="confermato">Confermato</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label style={labelStyle}>Note</label>
            <textarea
              placeholder="Informazioni aggiuntive, argomenti, istruzioni…"
              value={form.note} onChange={e => set('note', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button
              onClick={salva}
              disabled={saving}
              style={{
                padding: '10px 24px', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Salvataggio…' : 'Salva evento'}
            </button>
            <button
              onClick={() => router.back()}
              style={{
                padding: '10px 20px', background: 'transparent', color: 'var(--grigio-3)',
                border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
