'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import type { AbbinamentoProvvedimento } from '@/lib/figc/parser-comunicati'

/* ─── Tipi locali ────────────────────────────────────────────── */

interface GiocatoreRosa {
  id:      string
  nome:    string
  cognome: string
}

type Step = 1 | 2 | 3

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  squalifica:  { label: 'SQUALIFICA',  cls: 'badge-rosso'  },
  diffida:     { label: 'DIFFIDA',     cls: 'badge-ambra'  },
  ammonizione: { label: 'AMMONIZIONE', cls: 'badge-grigio' },
  ammenda:     { label: 'AMMENDA',     cls: 'badge-grigio' },
}

const COMITATI = [
  'LND Puglia', 'LND Campania', 'LND Lazio', 'LND Sicilia', 'LND Lombardia',
  'LND Toscana', 'LND Veneto', 'LND Piemonte VdA', 'LND Emilia-Romagna',
  'LND Calabria', 'LND Sardegna', 'LND Abruzzo', 'LND Basilicata',
  'LND Friuli VG', 'LND Liguria', 'LND Marche', 'LND Molise',
  'LND Trentino AA', 'LND Umbria', 'LND Liguria', 'LND Nazionale',
]

/* ─── Componente ─────────────────────────────────────────────── */

export default function ComunicatiFIGCPage() {
  const supabase = createClient()

  /* Step corrente */
  const [step, setStep]       = useState<Step>(1)

  /* Step 1: form */
  const [testo, setTesto]     = useState('')
  const [comitato, setComitato]   = useState('LND Puglia')
  const [numCom, setNumCom]   = useState('')
  const [dataCom, setDataCom] = useState(new Date().toISOString().split('T')[0])
  const [dataInizio, setDataInizio] = useState(new Date().toISOString().split('T')[0])

  /* Step 2: review */
  const [comunicatoId, setComunicatoId] = useState<string | null>(null)
  const [abbinamenti, setAbbinamenti]   = useState<AbbinamentoProvvedimento[]>([])
  const [rosa, setRosa]                 = useState<GiocatoreRosa[]>([])
  const [overrides, setOverrides]       = useState<Record<number, string>>({})

  /* Applicazione */
  const [applicati, setApplicati]       = useState(0)
  const [erroriApply, setErroriApply]   = useState<string[]>([])

  /* UI */
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, tipo: 'success' | 'error' = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Step 1 → 2: invia testo all'API ──────────────────────── */

  const analizza = useCallback(async () => {
    if (!testo.trim()) { showToast('Incolla prima il testo del comunicato.', 'error'); return }
    setLoading(true)

    try {
      // Carica rosa per il select manuale di step 2
      const { data: utente } = await supabase
        .from('utenti').select('club_id').eq('id', (await supabase.auth.getUser()).data.user!.id).single()

      const { data: tess } = await supabase
        .from('tesseramenti')
        .select('giocatori(id, nome, cognome)')
        .eq('club_id', utente!.club_id)
        .eq('stato', 'attivo')

      const rosaData = (tess ?? [])
        .map((t: any) => t.giocatori)
        .filter(Boolean) as GiocatoreRosa[]
      setRosa(rosaData.sort((a, b) => a.cognome.localeCompare(b.cognome)))

      const res = await fetch('/api/figc/upload-comunicato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testo,
          comitato,
          numero_comunicato: numCom || null,
          data_comunicato: dataCom,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore analisi')

      setComunicatoId(json.comunicato_id)
      setAbbinamenti(json.abbinamenti ?? [])
      setOverrides({})
      setStep(2)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [testo, comitato, numCom, dataCom, supabase])

  /* ── Step 2 → 3: applica provvedimenti ───────────────────── */

  const applica = useCallback(async () => {
    if (!comunicatoId) return
    setLoading(true)

    // Costruisce la lista: usa override se presente, altrimenti abbinamento auto
    const provvedimenti = abbinamenti
      .map((a, i) => {
        const gId = overrides[i] ?? a.giocatore_id
        if (!gId) return null
        return {
          tipo:         a.provvedimento.tipo,
          giocatore_id: gId,
          durata:       a.provvedimento.durata,
          giornate:     a.provvedimento.giornate,
          cognome_raw:  a.provvedimento.cognome_raw,
          nome_raw:     a.provvedimento.nome_raw,
        }
      })
      .filter(Boolean)

    if (!provvedimenti.length) {
      showToast('Nessun abbinamento confermato da applicare.', 'error')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/figc/applica-provvedimenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comunicato_id: comunicatoId, data_inizio: dataInizio, provvedimenti }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore applicazione')

      setApplicati(json.applicati ?? 0)
      setErroriApply(json.errori ?? [])
      setStep(3)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [comunicatoId, abbinamenti, overrides, dataInizio])

  /* ── Reset ───────────────────────────────────────────────── */

  const reset = () => {
    setStep(1); setTesto(''); setNumCom('')
    setAbbinamenti([]); setComunicatoId(null); setOverrides({})
  }

  /* ─── Render ─────────────────────────────────────────────── */

  const abbinati    = abbinamenti.filter((a, i) => (overrides[i] ?? a.giocatore_id) !== null).length
  const nonAbbinati = abbinamenti.length - abbinati

  return (
    <FeatureGate feature="comunicati_figc_analisi" featureLabel="Comunicati FIGC">
        <>
          {toast && (
            <Toast
              msg={toast.msg}
              tipo={toast.tipo}
              onClose={() => setToast(null)}
            />
          )}

          <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
            <PageHeader
              title="Comunicati FIGC"
              subtitle="Incolla il testo del C.U. per estrarre e applicare i provvedimenti"
            />

            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
              {([
                [1, 'Incolla testo'],
                [2, 'Verifica abbinamenti'],
                [3, 'Completato'],
              ] as [number, string][]).map(([n, label], idx) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 1 : undefined }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    opacity: step === n ? 1 : step > n ? 0.7 : 0.35,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      background: step >= n ? 'var(--accent)' : 'var(--gray-light)',
                      color: step >= n ? '#0a0a0a' : 'var(--gray)',
                      border: step === n ? '2px solid var(--accent)' : '2px solid transparent',
                    }}>
                      {step > n ? '✓' : n}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '0.72rem',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: step === n ? 'var(--accent)' : 'var(--gray)',
                      fontWeight: step === n ? 700 : 500,
                    }}>
                      {label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 12px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* ─── STEP 1: Incolla testo ─────────────────────────── */}
            {step === 1 && (
              <div className="card" style={{ padding: 28 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.7rem',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--gray)', marginBottom: 20,
                  }}>
                    Dati comunicato
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 12 }}>
                    {/* Comitato */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>
                        COMITATO
                      </label>
                      <select
                        value={comitato}
                        onChange={e => setComitato(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                      >
                        {COMITATI.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {/* Numero */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>
                        N° COMUNICATO
                      </label>
                      <input
                        type="text"
                        className="input"
                        style={{ width: '100%' }}
                        placeholder="es. 42"
                        value={numCom}
                        onChange={e => setNumCom(e.target.value)}
                      />
                    </div>
                    {/* Data */}
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>
                        DATA C.U.
                      </label>
                      <input
                        type="date"
                        className="input"
                        style={{ width: '100%' }}
                        value={dataCom}
                        onChange={e => setDataCom(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Data inizio effetto */}
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 5 }}>
                        DECORRENZA SQUALIFICHE
                      </label>
                      <input
                        type="date"
                        className="input"
                        style={{ width: '100%' }}
                        value={dataInizio}
                        onChange={e => setDataInizio(e.target.value)}
                      />
                    </div>
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(200,240,0,0.04)',
                      border: '1px solid rgba(200,240,0,0.1)',
                      borderRadius: 4, marginTop: 20,
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)',
                      lineHeight: 1.6,
                    }}>
                      La decorrenza è la data della prima gara in cui si scontano le giornate.
                      Di solito è la domenica successiva alla data del comunicato.
                    </div>
                  </div>
                </div>

                {/* Textarea testo */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>
                    TESTO DEL COMUNICATO — incolla il contenuto estratto dal PDF
                  </label>
                  <textarea
                    value={testo}
                    onChange={e => setTesto(e.target.value)}
                    placeholder={`ROSSI Mario, della Soc. A.S.D. Esempio, è squalificato per 2 giornate...\nBIANCHI Luca, della Soc. A.S.D. Esempio, è diffidato...`}
                    style={{
                      width: '100%', minHeight: 260,
                      background: 'var(--gray-light)', border: '1px solid var(--border)',
                      borderRadius: 4, padding: '12px 14px',
                      color: 'var(--white)', fontFamily: 'var(--font-mono)',
                      fontSize: 12, lineHeight: 1.7, resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>
                    {testo.length} caratteri
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button
                    className="btn btn-primary"
                    onClick={analizza}
                    disabled={loading || !testo.trim()}
                  >
                    {loading ? 'Analisi in corso…' : 'Analizza comunicato →'}
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Review abbinamenti ───────────────────── */}
            {step === 2 && (
              <div>
                {/* Riepilogo */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
                  background: 'var(--border)', borderRadius: 4,
                  overflow: 'hidden', marginBottom: 24,
                }}>
                  {[
                    ['TROVATI', abbinamenti.length, 'var(--white)'],
                    ['ABBINATI', abbinati, 'var(--accent)'],
                    ['DA ASSEGNARE', nonAbbinati, nonAbbinati > 0 ? 'var(--rosso)' : 'var(--gray)'],
                  ].map(([label, val, color]) => (
                    <div key={label as string} style={{
                      background: 'var(--gray-light)', padding: '16px 20px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: color as string }}>{val}</div>
                    </div>
                  ))}
                </div>

                {abbinamenti.length === 0 ? (
                  <div className="alert alert-warning" style={{ marginBottom: 24 }}>
                    Nessun provvedimento trovato nel testo. Verifica il formato del comunicato.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {abbinamenti.map((a, i) => {
                      const cfg     = TIPO_BADGE[a.provvedimento.tipo] ?? { label: a.provvedimento.tipo.toUpperCase(), cls: 'badge-grigio' }
                      const gId     = overrides[i] ?? a.giocatore_id
                      const matched = gId !== null

                      return (
                        <div
                          key={a.provvedimento._id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '120px 1fr 240px',
                            gap: 12,
                            alignItems: 'center',
                            padding: '14px 16px',
                            background: 'var(--gray-light)',
                            border: `1px solid ${matched ? 'rgba(200,240,0,0.15)' : 'rgba(255,68,68,0.25)'}`,
                            borderLeft: `3px solid ${matched ? 'var(--accent)' : 'var(--rosso)'}`,
                            borderRadius: 4,
                          }}
                        >
                          {/* Badge tipo + durata */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span className={`badge ${cfg.cls}`} style={{ alignSelf: 'flex-start' }}>{cfg.label}</span>
                            {a.provvedimento.durata && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)' }}>
                                {a.provvedimento.durata}
                              </span>
                            )}
                          </div>

                          {/* Nome raw */}
                          <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>
                              {a.provvedimento.cognome_raw} {a.provvedimento.nome_raw}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                              {a.provvedimento.societa_raw}
                              {a.score > 0 && (
                                <span style={{ marginLeft: 8, color: a.score >= 0.72 ? 'var(--accent)' : 'var(--ambra)' }}>
                                  · match {Math.round(a.score * 100)}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Select abbinamento */}
                          <div>
                            <select
                              className="input"
                              style={{ width: '100%', fontSize: 12 }}
                              value={gId ?? ''}
                              onChange={e => setOverrides(prev => ({
                                ...prev,
                                [i]: e.target.value || null as any,
                              }))}
                            >
                              <option value="">— Non abbinare —</option>
                              {rosa.map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.cognome} {g.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>
                    ← Torna al testo
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={applica}
                    disabled={loading || abbinati === 0}
                  >
                    {loading
                      ? 'Applicazione in corso…'
                      : `Applica ${abbinati} provvedimento${abbinati !== 1 ? 'i' : ''} →`}
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: Completato ───────────────────────────── */}
            {step === 3 && (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(200,240,0,0.12)',
                  border: '2px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: 24,
                }}>
                  ✓
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900,
                  color: 'var(--white)', letterSpacing: '0.05em', marginBottom: 8,
                }}>
                  Provvedimenti applicati
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13,
                  color: 'var(--accent)', marginBottom: 4,
                }}>
                  {applicati} provvedimento{applicati !== 1 ? 'i' : ''} registrato{applicati !== 1 ? 'i' : ''} con successo
                </div>

                {erroriApply.length > 0 && (
                  <div className="alert alert-warning" style={{ marginTop: 20, textAlign: 'left' }}>
                    <strong>Attenzione — {erroriApply.length} errore{erroriApply.length > 1 ? 'i' : ''}:</strong>
                    <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                      {erroriApply.map((e, i) => <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{e}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28 }}>
                  <button className="btn btn-secondary" onClick={reset}>
                    Nuovo comunicato
                  </button>
                  <a href="/dashboard/segretario/disponibilita" className="btn btn-primary">
                    Verifica disponibilità
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
    </FeatureGate>
  )
}
