'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatData } from '@/lib/helpers'

type Figlio = {
  giocatore: {
    id: string; nome: string; cognome: string; data_nascita: string | null
    codice_fiscale: string | null; ruolo_principale: string | null
    consenso_gdpr: boolean | null; consenso_immagini: boolean | null
  } | null
  famiglia: {
    id: string; nome: string; cognome: string; relazione: string
    email: string | null; telefono: string | null; telefono_emergenza: string | null
    consenso_dati: boolean | null; consenso_immagini: boolean | null
  } | null
}

export default function FamigliaProfiloPage() {
  const [anteprima, setAnteprima] = useState(false)
  const [figli, setFigli] = useState<Figlio[]>([])
  const [loading, setLoading] = useState(true)
  const [salvataggio, setSalvataggio] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)
  const [draft, setDraft] = useState<Record<string, { telefono: string; telefono_emergenza: string; consenso_immagini: boolean }>>({})

  const carica = useCallback(async () => {
    const res = await fetch('/api/famiglia/profilo')
    const json = await res.json()
    setAnteprima(!!json.anteprima)
    const lista: Figlio[] = json.figli ?? []
    setFigli(lista)
    const d: typeof draft = {}
    lista.forEach(f => {
      if (f.famiglia) {
        d[f.famiglia.id] = {
          telefono: f.famiglia.telefono ?? '',
          telefono_emergenza: f.famiglia.telefono_emergenza ?? '',
          consenso_immagini: !!f.famiglia.consenso_immagini,
        }
      }
    })
    setDraft(d)
    setLoading(false)
  }, [])

  useEffect(() => { carica() }, [carica])

  function showToast(msg: string, tipo: 'ok' | 'err' = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 4000)
  }

  async function salva(famigliaId: string) {
    const d = draft[famigliaId]
    if (!d) return
    setSalvataggio(prev => ({ ...prev, [famigliaId]: true }))
    const res = await fetch('/api/famiglia/profilo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ famiglia_id: famigliaId, ...d }),
    })
    const json = await res.json()
    setSalvataggio(prev => ({ ...prev, [famigliaId]: false }))
    if (!res.ok) { showToast(json.error ?? 'Errore', 'err'); return }
    showToast('Dati aggiornati')
    carica()
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Caricamento…</div>
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Profilo
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
          Dati anagrafici e contatti collegati al tuo account
        </div>
      </div>

      {anteprima && (
        <div style={{ padding: '10px 14px', marginBottom: 20, background: 'rgba(200,240,0,0.06)', border: '1px solid rgba(200,240,0,0.2)', borderRadius: 4, fontSize: 12, color: 'var(--accent)' }}>
          Modalità anteprima — i dati di contatto genitore si vedono solo con un account famiglia registrato.
        </div>
      )}

      {figli.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: 13, background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2 }}>
          Nessun profilo collegato.
        </div>
      ) : figli.map((f, i) => {
        const g = f.giocatore
        const fam = f.famiglia
        const d = fam ? draft[fam.id] : null
        const eta = g?.data_nascita ? new Date().getFullYear() - new Date(g.data_nascita).getFullYear() : null

        return (
          <div key={g?.id ?? i} style={{ marginBottom: 24, background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-solid)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)' }}>
              {g?.nome} {g?.cognome}
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: 10 }}>
                Dati giocatore
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <Campo label="Data di nascita" value={g?.data_nascita ? `${formatData(g.data_nascita)} (${eta} anni)` : '—'} />
                <Campo label="Ruolo" value={g?.ruolo_principale?.replace(/_/g, ' ') ?? '—'} />
                <Campo label="Codice fiscale" value={g?.codice_fiscale ?? '—'} />
                <Campo label="Consenso GDPR" value={g?.consenso_gdpr ? '✓ Confermato' : '—'} />
              </div>

              {fam && d && (
                <>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: 10 }}>
                    I tuoi dati ({fam.relazione})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <Campo label="Nome" value={`${fam.nome} ${fam.cognome}`} />
                    <Campo label="Email" value={fam.email ?? '—'} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>Telefono</label>
                      <input
                        className="input"
                        value={d.telefono}
                        onChange={e => setDraft(prev => ({ ...prev, [fam.id]: { ...prev[fam.id], telefono: e.target.value } }))}
                        placeholder="+39 333 1234567"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Telefono emergenza</label>
                      <input
                        className="input"
                        value={d.telefono_emergenza}
                        onChange={e => setDraft(prev => ({ ...prev, [fam.id]: { ...prev[fam.id], telefono_emergenza: e.target.value } }))}
                        placeholder="+39 333 7654321"
                      />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--white)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={d.consenso_immagini}
                      onChange={e => setDraft(prev => ({ ...prev, [fam.id]: { ...prev[fam.id], consenso_immagini: e.target.checked } }))}
                    />
                    Consenso all&apos;utilizzo di immagini e video
                  </label>

                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!!salvataggio[fam.id]}
                    onClick={() => salva(fam.id)}
                  >
                    {salvataggio[fam.id] ? 'Salvataggio…' : 'Salva modifiche'}
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: toast.tipo === 'ok' ? '#1a2e1a' : '#2e1a1a',
          border: `1px solid ${toast.tipo === 'ok' ? 'rgba(0,200,160,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: 4, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <span>{toast.tipo === 'ok' ? '✓' : '⚠'}</span>
          <span style={{ fontSize: 13, color: toast.tipo === 'ok' ? '#00C8A0' : '#EF4444', fontWeight: 500 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--white)' }}>{value}</div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--gray)', marginBottom: 4, textTransform: 'uppercase' }
