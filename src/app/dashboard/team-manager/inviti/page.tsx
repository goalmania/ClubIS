'use client'
import { useState, useEffect } from 'react'

const RUOLI_STAFF = [
  { ruolo: 'segretario',    label: 'Segretario',          icona: '📋' },
  { ruolo: 'allenatore',    label: 'Allenatore',          icona: '🧢' },
  { ruolo: 'medico',        label: 'Medico',              icona: '⚕️' },
  { ruolo: 'ds',            label: 'Direttore Sportivo',  icona: '🔭' },
  { ruolo: 'team_manager',  label: 'Team Manager',        icona: '📊' },
  { ruolo: 'osservatore',   label: 'Osservatore',         icona: '👁' },
  { ruolo: 'ufficio_stampa', label: 'Ufficio Stampa',     icona: '📰' },
  { ruolo: 'custode',       label: 'Custode',             icona: '🔑' },
]

const RUOLI_ATLETI = [
  { ruolo: 'famiglia',  label: 'Familiare / Genitore', icona: '👨‍👩‍👧' },
  { ruolo: 'giocatore', label: 'Giocatore',             icona: '⚽' },
]

interface Invito {
  id:            string
  ruolo:         string
  token:         string
  usato:         boolean
  scadenza:      string | null
  created_at:    string
  giocatore_id?: string | null
}

export default function InvitiPage() {
  const [inviti,      setInviti]     = useState<Invito[]>([])
  const [loading,     setLoading]    = useState(true)
  const [generating,  setGenerating] = useState<string | null>(null)
  const [copied,      setCopied]     = useState<string | null>(null)
  const [scadGiorni,  setScadGiorni] = useState(7)
  const [giocatori,   setGiocatori]  = useState<{ id: string; nome: string; cognome: string }[]>([])
  const [giocatoreId, setGiocatoreId] = useState<string>('')
  const [clubId,      setClubId]     = useState<string | null>(null)
  const [errore,      setErrore]     = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const res = await fetch('/api/inviti')
      if (!res.ok) return
      const data = await res.json()
      if (mounted) {
        setClubId(data.clubId)
        setInviti(data.inviti ?? [])
        setGiocatori(data.giocatori ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generaLink(ruolo: string, conGiocatore = false) {
    if (conGiocatore && !giocatoreId) {
      setErrore('Seleziona prima un atleta dalla lista.')
      return
    }
    setErrore(null)
    setGenerating(ruolo)
    try {
      const res = await fetch('/api/inviti/genera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruolo,
          scadenzaGiorni: scadGiorni,
          giocatoreId: conGiocatore ? giocatoreId : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErrore(json.error ?? `Errore ${res.status}`)
        return
      }
      if (json.link) {
        setInviti(prev => [{
          id:           json.id,
          ruolo,
          token:        json.token,
          usato:        false,
          giocatore_id: conGiocatore ? giocatoreId : null,
          scadenza:     scadGiorni
            ? new Date(Date.now() + scadGiorni * 86400000).toISOString()
            : null,
          created_at: new Date().toISOString(),
        }, ...prev])
        await copiaLink(json.link, json.token)
      }
    } catch (e: any) {
      setErrore(e?.message ?? 'Errore di rete')
    } finally {
      setGenerating(null)
    }
  }

  async function copiaLink(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(id)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // clipboard non disponibile
    }
  }

  async function revocaInvito(id: string) {
    await fetch(`/api/inviti/${id}`, { method: 'DELETE' })
    setInviti(prev => prev.filter(i => i.id !== id))
  }

  const getLink = (token: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/unisciti/${token}`
  }

  const isScaduto = (scadenza: string | null) =>
    scadenza ? new Date(scadenza) < new Date() : false

  if (loading) {
    return (
      <div style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40 }}>
        Caricamento...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div data-onboarding="section-inviti-staff" style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em',
          color: 'var(--white)',
        }}>
          Link Invito Staff
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--gray)', marginTop: 6, letterSpacing: '0.1em',
        }}>
          Genera link monouso per invitare i membri dello staff al tuo club
        </div>
      </div>

      {/* Banner errore */}
      {errore && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.3)',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ff6060',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠ {errore}</span>
          <button onClick={() => setErrore(null)} style={{ background: 'none', border: 'none', color: '#ff6060', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Generatore */}
      <div style={{
        padding: '20px 24px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        marginBottom: 24,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          textTransform: 'uppercase', fontSize: 13, color: 'var(--accent)',
          marginBottom: 16,
        }}>
          Genera nuovo invito
        </div>

        {/* Scadenza */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', letterSpacing: '0.1em' }}>
            Scadenza:
          </label>
          {[1, 3, 7, 14, 30].map(g => (
            <button
              key={g}
              onClick={() => setScadGiorni(g)}
              className={`btn btn-sm ${scadGiorni === g ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11 }}
            >
              {g}g
            </button>
          ))}
        </div>

        {/* Staff */}
        <div style={{ marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Staff</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
          {RUOLI_STAFF.map(({ ruolo, label, icona }) => (
            <button
              key={ruolo}
              onClick={() => generaLink(ruolo)}
              disabled={generating === ruolo}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', fontSize: 12, border: '1px solid var(--border)' }}
            >
              <span>{icona}</span>
              <span>{generating === ruolo ? 'Generazione...' : `Invita ${label}`}</span>
            </button>
          ))}
        </div>

        {/* Famiglie & Giocatori */}
        <div style={{ marginBottom: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Famiglie & Giocatori</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>
            Seleziona atleta:
          </label>
          <select
            className="input"
            value={giocatoreId}
            onChange={e => setGiocatoreId(e.target.value)}
            style={{ background: '#1a1a1a', color: 'var(--white)', maxWidth: 360 }}
          >
            <option value="">— Scegli un atleta —</option>
            {giocatori.map(g => (
              <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {RUOLI_ATLETI.map(({ ruolo, label, icona }) => (
            <button
              key={ruolo}
              onClick={() => generaLink(ruolo, true)}
              disabled={generating === ruolo || !giocatoreId}
              className="btn btn-ghost"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start',
                fontSize: 12, border: '1px solid var(--border)',
                opacity: !giocatoreId ? 0.4 : 1,
              }}
            >
              <span>{icona}</span>
              <span>{generating === ruolo ? 'Generazione...' : `Invita ${label}`}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista inviti */}
      {inviti.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            textTransform: 'uppercase', fontSize: 13, color: 'var(--white)',
          }}>
            Inviti generati ({inviti.length})
          </div>

          <div>
            {inviti.map(invito => {
              const scaduto  = isScaduto(invito.scadenza)
              const link     = getLink(invito.token)
              const ruoloObj = [...RUOLI_STAFF, ...RUOLI_ATLETI].find(r => r.ruolo === invito.ruolo)

              return (
                <div
                  key={invito.id}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: invito.usato || scaduto ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{ruoloObj?.icona ?? '👤'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      textTransform: 'uppercase', fontSize: 12,
                      color: 'var(--white)',
                    }}>
                      {ruoloObj?.label ?? invito.ruolo}
                      {invito.usato && (
                        <span style={{ marginLeft: 8, color: 'var(--gray)', fontSize: 10 }}>· USATO</span>
                      )}
                      {!invito.usato && scaduto && (
                        <span style={{ marginLeft: 8, color: 'var(--ambra)', fontSize: 10 }}>· SCADUTO</span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--gray)', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {link}
                    </div>
                    {invito.scadenza && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                        Scade: {new Date(invito.scadenza).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!invito.usato && !scaduto && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => copiaLink(link, invito.id)}
                        style={{ fontSize: 11 }}
                      >
                        {copied === invito.id ? '✓ Copiato' : '📋 Copia'}
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => revocaInvito(invito.id)}
                      style={{ fontSize: 11, color: 'var(--rosso)' }}
                    >
                      Revoca
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {inviti.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12,
        }}>
          Nessun invito generato. Clicca su un ruolo sopra per creare il primo link.
        </div>
      )}
    </div>
  )
}
