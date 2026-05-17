'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Membro {
  id:             string
  nome:           string
  cognome:        string
  email:          string
  ruolo:          string
  attivo:         boolean
  created_at:     string
  ultimo_accesso: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RUOLO_LABEL: Record<string, string> = {
  presidente:    'Presidente',
  ds:            'Direttore Sportivo',
  segretario:    'Segretario',
  allenatore:    'Allenatore',
  osservatore:   'Osservatore',
  medico:        'Medico',
  famiglia:      'Famiglia',
  team_manager:  'Team Manager',
  giocatore:     'Giocatore',
  ufficio_stampa:'Ufficio Stampa',
  custode:       'Custode',
}

const RUOLO_ORDER: Record<string, number> = {
  presidente: 0, ds: 1, segretario: 2, allenatore: 3,
  team_manager: 4, medico: 5, osservatore: 6,
  ufficio_stampa: 7, giocatore: 8, famiglia: 9, custode: 10,
}

const RUOLO_COLOR: Record<string, string> = {
  presidente:     '#a855f7',
  ds:             '#3b82f6',
  segretario:     '#22c55e',
  allenatore:     '#eab308',
  team_manager:   '#f97316',
  medico:         '#ef4444',
  osservatore:    '#64748b',
  ufficio_stampa: '#06b6d4',
  giocatore:      '#10b981',
  famiglia:       '#8b5cf6',
  custode:        '#78716c',
}

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDataOra(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (fuori dal componente principale — evita problemi di focus)
// ─────────────────────────────────────────────────────────────────────────────

interface ModalConfermaProps {
  membro:    Membro
  loading:   boolean
  errore:    string | null
  onConfirm: () => void
  onClose:   () => void
}

function ModalConferma({ membro, loading, errore, onConfirm, onClose }: ModalConfermaProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        zIndex: 1000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div style={{
        background: '#111', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 4, width: '100%', maxWidth: 480,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15,
            textTransform: 'uppercase', color: '#ef4444', letterSpacing: '-0.01em',
          }}>
            Elimina Account
          </span>
          {!loading && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px' }}>
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 3, padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>
              Attenzione: azione irreversibile
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
              Sei sicuro di voler eliminare l&apos;account di{' '}
              <strong style={{ color: 'var(--white)' }}>
                {membro.nome} {membro.cognome}
              </strong>
              {' '}({RUOLO_LABEL[membro.ruolo] ?? membro.ruolo})?
              <br />
              Questa azione è <strong style={{ color: '#ef4444' }}>irreversibile</strong>.
              Il membro perderà immediatamente l&apos;accesso a ClubIS.
            </div>
          </div>

          {errore && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 3, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#ef4444',
            }}>
              {errore}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 3, padding: '8px 18px', fontSize: 13,
                color: 'var(--gray)', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                background: loading ? 'rgba(239,68,68,0.5)' : '#ef4444',
                border: 'none', borderRadius: 3, padding: '8px 18px',
                fontSize: 13, fontWeight: 600, color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 12, height: 12,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Eliminazione…
                </>
              ) : (
                'Elimina definitivamente'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ messaggio, onDismiss }: { messaggio: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
      background: '#1a2e1a', border: '1px solid rgba(34,197,94,0.4)',
      borderRadius: 4, padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <span style={{ fontSize: 16 }}>✓</span>
      <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>{messaggio}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 18, cursor: 'pointer', lineHeight: 1, marginLeft: 8 }}
      >
        ×
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagina principale
// ─────────────────────────────────────────────────────────────────────────────

export default function GestioneAccountPage() {
  const supabase = useMemo(() => createClient(), [])

  const [userId,  setUserId]  = useState<string | null>(null)
  const [membri,  setMembri]  = useState<Membro[]>([])
  const [loading, setLoading] = useState(true)
  const [errore,  setErrore]  = useState<string | null>(null)

  const [daEliminare,   setDaEliminare]   = useState<Membro | null>(null)
  const [eliminando,    setEliminando]    = useState(false)
  const [erroreModal,   setErroreModal]   = useState<string | null>(null)
  const [toast,         setToast]         = useState<string | null>(null)

  // ── Caricamento lista ──────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setErrore(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Usa l'API route che bypassa RLS e applica auto-fix is_super_admin
    const res = await fetch('/api/utenti/club')
    if (!res.ok) {
      setErrore('Errore caricamento membri')
      setLoading(false)
      return
    }
    const data: Membro[] = await res.json()
    // Escludi l'utente corrente (il presidente loggato) dalla lista
    const filtrati = data.filter(m => m.id !== user.id)
    setMembri(
      filtrati.slice().sort((a, b) => {
        const ro = (RUOLO_ORDER[a.ruolo] ?? 99) - (RUOLO_ORDER[b.ruolo] ?? 99)
        if (ro !== 0) return ro
        return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, 'it')
      })
    )

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ── Eliminazione ──────────────────────────────────────────────────────────

  const apriModal = (m: Membro) => {
    setDaEliminare(m)
    setErroreModal(null)
  }

  const chiudiModal = () => {
    if (eliminando) return
    setDaEliminare(null)
    setErroreModal(null)
  }

  const confermaEliminazione = async () => {
    if (!daEliminare) return
    setEliminando(true)
    setErroreModal(null)

    try {
      const res = await fetch('/api/admin/elimina-account-membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utente_id: daEliminare.id }),
      })
      const json = await res.json()

      if (!res.ok) {
        setErroreModal(json.error ?? 'Errore durante l\'eliminazione.')
        setEliminando(false)
        return
      }

      // Successo: rimuovi dalla lista senza reload
      setMembri(prev => prev.filter(m => m.id !== daEliminare.id))
      setToast(`Account di ${daEliminare.nome} ${daEliminare.cognome} eliminato con successo`)
      setDaEliminare(null)
    } catch (e) {
      setErroreModal('Errore di rete. Riprova.')
    }

    setEliminando(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, animation: 'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '3px',
          textTransform: 'uppercase', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <span style={{ display: 'block', width: 20, height: 1, background: 'var(--accent)' }} />
          Club
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
          lineHeight: 1, marginBottom: 4,
        }}>
          Gestione Account
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray)' }}>
          Visualizza e gestisci gli account dei membri del club · Solo il presidente può eliminare account
        </p>
      </div>

      {/* Errore globale */}
      {errore && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>{errore}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ padding: '40px', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Caricamento…
        </div>
      ) : membri.length === 0 ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>
            Nessun account trovato
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 6 }}>
            Non ci sono altri membri registrati nel club.
          </div>
        </div>
      ) : (
        <>
          {/* Contatore */}
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--gray)',
            marginBottom: 14, letterSpacing: '0.05em',
          }}>
            {membri.length} account {membri.length === 1 ? 'registrato' : 'registrati'}
            {' '}· {membri.filter(m => m.attivo).length} attivi
          </div>

          {/* Tabella */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Membro</th>
                    <th>Ruolo</th>
                    <th>Email</th>
                    <th>Registrato</th>
                    <th>Ultimo accesso</th>
                    <th style={{ textAlign: 'right' }}>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {membri.map(m => (
                    <tr key={m.id}>
                      {/* Nome */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: `${RUOLO_COLOR[m.ruolo] ?? '#64748b'}22`,
                            border: `1px solid ${RUOLO_COLOR[m.ruolo] ?? '#64748b'}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                            color: RUOLO_COLOR[m.ruolo] ?? '#64748b',
                            flexShrink: 0,
                          }}>
                            {m.nome[0]}{m.cognome[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                              {m.cognome} {m.nome}
                            </div>
                            {!m.attivo && (
                              <div style={{ fontSize: 10, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                                DISATTIVO
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ruolo */}
                      <td>
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: 3,
                          fontSize: 11, fontFamily: 'var(--font-mono)',
                          background: `${RUOLO_COLOR[m.ruolo] ?? '#64748b'}18`,
                          color: RUOLO_COLOR[m.ruolo] ?? '#64748b',
                          border: `1px solid ${RUOLO_COLOR[m.ruolo] ?? '#64748b'}33`,
                        }}>
                          {RUOLO_LABEL[m.ruolo] ?? m.ruolo}
                        </span>
                      </td>

                      {/* Email */}
                      <td style={{ fontSize: 12, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                        {m.email}
                      </td>

                      {/* Registrato */}
                      <td style={{ fontSize: 12, color: 'var(--gray)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {fmtData(m.created_at)}
                      </td>

                      {/* Ultimo accesso */}
                      <td style={{ fontSize: 12, color: 'var(--gray)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {fmtDataOra(m.ultimo_accesso)}
                      </td>

                      {/* Azione */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => apriModal(m)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 3, padding: '4px 12px',
                            fontSize: 12, color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'none'
                          }}
                        >
                          Elimina Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nota sicurezza */}
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 3, fontSize: 12, color: 'var(--gray)',
          }}>
            ⚠️ L&apos;eliminazione di un account è definitiva e irreversibile. I dati associati al membro
            (presenze, valutazioni, ecc.) rimarranno nel sistema ma l&apos;accesso verrà revocato immediatamente.
          </div>
        </>
      )}

      {/* Modal conferma */}
      {daEliminare && (
        <ModalConferma
          membro={daEliminare}
          loading={eliminando}
          errore={erroreModal}
          onConfirm={confermaEliminazione}
          onClose={chiudiModal}
        />
      )}

      {/* Toast successo */}
      {toast && (
        <Toast messaggio={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
