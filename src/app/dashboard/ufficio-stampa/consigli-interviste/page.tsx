'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DestinatarioRuolo = 'presidente' | 'direttore_sportivo' | 'team_manager' | 'allenatore' | 'giocatore'
type Contesto = 'pre_partita' | 'post_partita' | 'conferenza_stampa' | 'mercato' | 'generale' | 'crisi_risultati' | 'infortunio'
type Priorita = 1 | 2 | 3

interface Consiglio {
  id: string
  club_id: string | null
  creato_da: string | null
  destinatario_ruolo: DestinatarioRuolo
  destinatario_specifico_id: string | null
  domanda: string
  consiglio_risposta: string
  contesto: Contesto
  priorita: Priorita
  attivo: boolean
  created_at: string
}

interface MembroClub {
  id: string
  nome: string
  cognome: string
  ruolo: string
}

interface FormState {
  destinatario_ruolo: DestinatarioRuolo
  destinatario_specifico_id: string | null
  domanda: string
  consiglio_risposta: string
  contesto: Contesto
  priorita: Priorita
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RUOLI_DEST: { value: DestinatarioRuolo; label: string; emoji: string }[] = [
  { value: 'presidente',         label: 'Presidente',         emoji: '🏛' },
  { value: 'direttore_sportivo', label: 'Direttore Sportivo', emoji: '📋' },
  { value: 'team_manager',       label: 'Team Manager',       emoji: '📌' },
  { value: 'allenatore',         label: 'Allenatore',         emoji: '🎯' },
  { value: 'giocatore',          label: 'Giocatore',          emoji: '⚽' },
]

// Mappa ruolo utente (utenti.ruolo) → destinatario_ruolo (consigli_interviste)
const UTENTE_RUOLO_TO_DEST: Partial<Record<string, DestinatarioRuolo>> = {
  presidente:   'presidente',
  ds:           'direttore_sportivo',
  team_manager: 'team_manager',
  allenatore:   'allenatore',
  giocatore:    'giocatore',
}

// Mappa inversa: destinatario_ruolo → utenti.ruolo (per query su tabella utenti)
const DEST_TO_UTENTE_RUOLO: Record<DestinatarioRuolo, string> = {
  presidente:          'presidente',
  direttore_sportivo:  'ds',
  team_manager:        'team_manager',
  allenatore:          'allenatore',
  giocatore:           'giocatore',
}

const CONTESTI: { value: Contesto; label: string }[] = [
  { value: 'generale',          label: 'Generale' },
  { value: 'pre_partita',       label: 'Pre-partita' },
  { value: 'post_partita',      label: 'Post-partita' },
  { value: 'conferenza_stampa', label: 'Conferenza stampa' },
  { value: 'mercato',           label: 'Mercato' },
  { value: 'crisi_risultati',   label: 'Crisi risultati' },
  { value: 'infortunio',        label: 'Infortunio' },
]

const PRIORITA_CFG: Record<Priorita, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
  2: { label: 'Media', color: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)'  },
  3: { label: 'Bassa', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)'  },
}

const FORM_EMPTY: FormState = {
  destinatario_ruolo:        'presidente',
  destinatario_specifico_id: null,
  domanda:                   '',
  consiglio_risposta:        '',
  contesto:                  'generale',
  priorita:                  2 as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (defined OUTSIDE the main component — no focus issues)
// ─────────────────────────────────────────────────────────────────────────────

function PrioritaBadge({ p }: { p: Priorita }) {
  const c = PRIORITA_CFG[p]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 3,
      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {c.label}
    </span>
  )
}

function ContestoBadge({ v }: { v: Contesto }) {
  const label = CONTESTI.find(c => c.value === v)?.label ?? v
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 3,
      fontSize: 10, fontFamily: 'var(--font-mono)',
      background: 'rgba(200,240,0,0.08)', color: 'var(--accent)',
      border: '1px solid rgba(200,240,0,0.2)',
    }}>
      {label}
    </span>
  )
}

// Card singolo consiglio
interface CardProps {
  item:        Consiglio
  readonly:    boolean
  membriMap:   Record<string, MembroClub>
  onEdit?:     (item: Consiglio) => void
  onDelete?:   (id: string) => void
  deletingId:  string | null
}

function ConsiglioCard({ item, readonly, membriMap, onEdit, onDelete, deletingId }: CardProps) {
  const [expanded,   setExpanded]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const membroSpecifico = item.destinatario_specifico_id
    ? membriMap[item.destinatario_specifico_id]
    : null

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <PrioritaBadge p={item.priorita} />
            <ContestoBadge v={item.contesto} />
            {membroSpecifico && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 3, fontSize: 10,
                fontFamily: 'var(--font-mono)',
                background: 'rgba(139,92,246,0.12)', color: '#a78bfa',
                border: '1px solid rgba(139,92,246,0.3)',
              }}>
                👤 {membroSpecifico.nome} {membroSpecifico.cognome}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)', lineHeight: 1.4 }}>
            {item.domanda}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 3, padding: '4px 10px', fontSize: 11,
              color: 'var(--gray)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
            }}
          >
            {expanded ? '↑ chiudi' : '↓ consiglio'}
          </button>

          {!readonly && (
            <>
              <button
                onClick={() => onEdit?.(item)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11 }}
              >
                Modifica
              </button>
              {confirmDel ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => { setConfirmDel(false); onDelete?.(item.id) }}
                    disabled={deletingId === item.id}
                    style={{
                      background: '#ef4444', border: 'none', borderRadius: 3,
                      padding: '4px 10px', fontSize: 11, color: '#fff', cursor: 'pointer',
                    }}
                  >
                    {deletingId === item.id ? '…' : 'Sì, elimina'}
                  </button>
                  <button
                    onClick={() => setConfirmDel(false)}
                    style={{
                      background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 3, padding: '4px 8px', fontSize: 11,
                      color: 'var(--gray)', cursor: 'pointer',
                    }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDel(true)}
                  style={{
                    background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 3, padding: '4px 10px', fontSize: 11,
                    color: '#ef4444', cursor: 'pointer',
                  }}
                >
                  Elimina
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{
          marginTop: 12, padding: '12px 16px',
          background: 'rgba(200,240,0,0.05)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: '0 3px 3px 0',
        }}>
          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
          }}>
            💬 Consiglio per rispondere
          </div>
          <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {item.consiglio_risposta}
          </div>
        </div>
      )}
    </div>
  )
}

// Modal form — Nuovo / Modifica consiglio
interface FormModalProps {
  initial:        Consiglio | null
  saving:         boolean
  error:          string | null
  membriPerRuolo: Record<DestinatarioRuolo, MembroClub[]>
  onSave:         (data: FormState) => void
  onClose:        () => void
}

function ConsiglioFormModal({ initial, saving, error, membriPerRuolo, onSave, onClose }: FormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          destinatario_ruolo:        initial.destinatario_ruolo,
          destinatario_specifico_id: initial.destinatario_specifico_id,
          domanda:                   initial.domanda,
          consiglio_risposta:        initial.consiglio_risposta,
          contesto:                  initial.contesto,
          priorita:                  initial.priorita,
        }
      : { ...FORM_EMPTY }
  )

  const canSave = form.domanda.trim().length > 0 && form.consiglio_risposta.trim().length > 0

  const membriRuoloCorrente = membriPerRuolo[form.destinatario_ruolo] ?? []

  // Se si cambia ruolo, resetta il destinatario specifico
  const handleRuoloChange = (ruolo: DestinatarioRuolo) => {
    setForm(p => ({ ...p, destinatario_ruolo: ruolo, destinatario_specifico_id: null }))
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '40px 20px', overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#111', border: '1px solid var(--border-solid)',
        borderRadius: 3, width: '100%', maxWidth: 560, flexShrink: 0,
      }}>
        {/* Intestazione */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-solid)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
          }}>
            {initial ? 'Modifica consiglio' : 'Nuovo consiglio'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Campi */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ruolo destinatario + Contesto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">Ruolo destinatario *</label>
              <select
                className="input"
                value={form.destinatario_ruolo}
                onChange={e => handleRuoloChange(e.target.value as DestinatarioRuolo)}
                style={{ background: '#1a1a1a', color: 'var(--white)' }}
              >
                {RUOLI_DEST.map(r => (
                  <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contesto *</label>
              <select
                className="input"
                value={form.contesto}
                onChange={e => setForm(p => ({ ...p, contesto: e.target.value as Contesto }))}
                style={{ background: '#1a1a1a', color: 'var(--white)' }}
              >
                {CONTESTI.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Persona specifica */}
          <div>
            <label className="label">
              Persona specifica
              <span style={{ color: 'var(--gray)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                (opzionale — lascia vuoto per indirizzarlo a tutti i {RUOLI_DEST.find(r => r.value === form.destinatario_ruolo)?.label ?? ''})
              </span>
            </label>
            <select
              className="input"
              value={form.destinatario_specifico_id ?? ''}
              onChange={e => setForm(p => ({ ...p, destinatario_specifico_id: e.target.value || null }))}
              style={{ background: '#1a1a1a', color: 'var(--white)' }}
            >
              <option value="">— Tutti i {RUOLI_DEST.find(r => r.value === form.destinatario_ruolo)?.label ?? ''} —</option>
              {membriRuoloCorrente.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome} {m.cognome}
                </option>
              ))}
            </select>
            {membriRuoloCorrente.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                Nessun membro con questo ruolo trovato nel club.
              </div>
            )}
          </div>

          {/* Priorità */}
          <div>
            <label className="label">Priorità *</label>
            <select
              className="input"
              value={form.priorita}
              onChange={e => setForm(p => ({ ...p, priorita: Number(e.target.value) as Priorita }))}
              style={{ background: '#1a1a1a', color: 'var(--white)' }}
            >
              <option value={1}>🔴 Alta — domanda probabile e delicata</option>
              <option value={2}>🟡 Media</option>
              <option value={3}>🟢 Bassa</option>
            </select>
          </div>

          {/* Domanda */}
          <div>
            <label className="label">Domanda probabile *</label>
            <textarea
              className="input"
              value={form.domanda}
              onChange={e => setForm(p => ({ ...p, domanda: e.target.value }))}
              rows={3}
              placeholder="Es. Come valuta la prestazione della squadra oggi?"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Consiglio risposta */}
          <div>
            <label className="label">
              💬 Consiglio per la risposta *
              <span style={{ color: 'var(--gray)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                (visibile al destinatario)
              </span>
            </label>
            <textarea
              className="input"
              value={form.consiglio_risposta}
              onChange={e => setForm(p => ({ ...p, consiglio_risposta: e.target.value }))}
              rows={4}
              placeholder="Suggerisci cosa dire, come impostare la risposta, quali temi toccare o evitare…"
              style={{ resize: 'vertical' }}
            />
          </div>

          {error && <div className="alert alert-warning">{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onSave(form)}
              disabled={saving || !canSave}
            >
              {saving ? 'Salvataggio…' : initial ? 'Aggiorna' : 'Salva consiglio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagina principale
// ─────────────────────────────────────────────────────────────────────────────

export default function ConsigliIntervistePage() {
  const router = useRouter()

  // Dati utente
  const [ruolo,  setRuolo]  = useState<string | null>(null)
  const [clubId, setClubId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Dati consigli
  const [consigli,   setConsigli]   = useState<Consiglio[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  // Membri del club (per la selezione specifica nel form)
  const [membriClub, setMembriClub] = useState<MembroClub[]>([])

  // Stato form
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editItem,   setEditItem]   = useState<Consiglio | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Tab attiva (solo per ufficio stampa)
  const [tabAttiva, setTabAttiva] = useState<DestinatarioRuolo>('presidente')

  // Tab per contesto (destinatari)
  const [tabContesto, setTabContesto] = useState<Contesto | 'tutti'>('tutti')

  // ── Computed ────────────────────────────────────────────────────────────────

  const isUfficioStampa = ruolo === 'ufficio_stampa'

  // Mappa id → membro (per mostrare il nome nelle card)
  const membriMap = useMemo(
    () => Object.fromEntries(membriClub.map(m => [m.id, m])),
    [membriClub]
  )

  // Mappa ruolo → lista membri (per il form)
  const membriPerRuolo = useMemo((): Record<DestinatarioRuolo, MembroClub[]> => {
    const out: Record<DestinatarioRuolo, MembroClub[]> = {
      presidente:          [],
      direttore_sportivo:  [],
      team_manager:        [],
      allenatore:          [],
      giocatore:           [],
    }
    for (const m of membriClub) {
      const destRuolo = UTENTE_RUOLO_TO_DEST[m.ruolo]
      if (destRuolo) out[destRuolo].push(m)
    }
    return out
  }, [membriClub])

  const contestiPresenti = useMemo(
    () => [...new Set(consigli.map(c => c.contesto))].sort(),
    [consigli]
  )

  const consigliPerTabAttiva = useMemo(
    () => consigli.filter(c => c.destinatario_ruolo === tabAttiva),
    [consigli, tabAttiva]
  )

  const consigliDestinatario = useMemo(() => {
    if (tabContesto === 'tutti') return consigli
    return consigli.filter(c => c.contesto === tabContesto)
  }, [consigli, tabContesto])

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Usa /api/user-context per risolvere correttamente l'impersonation
    // (il cookie httpOnly non è leggibile lato client)
    const ctxRes = await fetch('/api/user-context')
    if (!ctxRes.ok) { router.replace('/auth/login'); return }
    const utente: { userId: string; clubId: string; ruolo: string } = await ctxRes.json()

    setUserId(utente.userId)
    setClubId(utente.clubId)
    setRuolo(utente.ruolo)

    // Carica i membri del club (solo per l'addetto stampa, per la selezione nel form).
    // Usa /api/staff per tutti i ruoli incluso 'giocatore': in questo modo gli ID
    // provengono da utenti.id, che è l'unico riferimento valido per la FK
    // consigli_interviste.destinatario_specifico_id → utenti(id).
    if (utente.ruolo === 'ufficio_stampa' && utente.clubId) {
      const membriData = await fetch('/api/staff?ruoli=presidente,ds,team_manager,allenatore,giocatore')
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
      const membri: MembroClub[] = Array.isArray(membriData) ? membriData : []
      setMembriClub(membri)
    }

    // Legge consigli via API route (adminClient, bypassa RLS)
    const consigliData = await fetch('/api/ufficio-stampa/consigli-interviste')
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)

    if (consigliData === null) {
      setError('Errore nel caricamento dei consigli')
    } else {
      setConsigli(Array.isArray(consigliData) ? consigliData : [])
    }

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async (form: FormState) => {
    setSaving(true)
    setFormError(null)

    const payload = {
      destinatario_ruolo:        form.destinatario_ruolo,
      destinatario_specifico_id: form.destinatario_specifico_id,
      domanda:                   form.domanda.trim(),
      consiglio_risposta:        form.consiglio_risposta.trim(),
      contesto:                  form.contesto,
      priorita:                  form.priorita,
      ...(editItem ? { id: editItem.id } : {}),
    }

    const res = await fetch('/api/ufficio-stampa/consigli-interviste', {
      method:  editItem ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    const json = await res.json()
    if (!res.ok) {
      setFormError(json.error ?? 'Errore durante il salvataggio')
      setSaving(false)
      return
    }

    if (!editItem) setTabAttiva(form.destinatario_ruolo)

    setSaving(false)
    setModalOpen(false)
    setEditItem(null)
    await load()
  }, [editItem, load])

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    const res = await fetch('/api/ufficio-stampa/consigli-interviste', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Errore durante l\'eliminazione')
    } else {
      setConsigli(prev => prev.filter(c => c.id !== id))
    }
    setDeletingId(null)
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openCreate = () => { setEditItem(null); setFormError(null); setModalOpen(true) }
  const openEdit   = (item: Consiglio) => { setEditItem(item); setFormError(null); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditItem(null); setFormError(null) }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '40px 32px', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        Caricamento…
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VISTA DESTINATARIO (presidente, ds, team_manager, allenatore, giocatore)
  // ─────────────────────────────────────────────────────────────────────────

  if (!isUfficioStampa) {
    const destRuoloCorrente = UTENTE_RUOLO_TO_DEST[ruolo ?? '']
    const labelRuolo = RUOLI_DEST.find(r => r.value === destRuoloCorrente)?.label ?? ruolo ?? ''

    return (
      <div style={{ padding: '28px 32px', maxWidth: 800, animation: 'fadeIn .3s ease' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          }}>
            <span style={{ display: 'block', width: 20, height: 1, background: 'var(--accent)' }} />
            Ufficio Stampa
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
            lineHeight: 1, marginBottom: 4,
          }}>
            Consigli per le tue interviste
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray)' }}>
            Preparati con i suggerimenti del tuo ufficio stampa · {labelRuolo}
          </p>
        </div>

        {error && <div className="alert alert-warning" style={{ marginBottom: 16 }}>{error}</div>}

        {consigli.length === 0 ? (
          <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎤</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>
              Nessun consiglio disponibile al momento
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>
              L&apos;addetto stampa non ha ancora inserito suggerimenti per te.
            </div>
          </div>
        ) : (
          <>
            {/* Tab per contesto */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
              <button
                onClick={() => setTabContesto('tutti')}
                style={{
                  padding: '6px 14px', borderRadius: 3, fontSize: 12,
                  fontFamily: 'var(--font-mono)', cursor: 'pointer', border: 'none',
                  background: tabContesto === 'tutti' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  color:      tabContesto === 'tutti' ? '#000' : 'var(--gray)',
                  fontWeight: tabContesto === 'tutti' ? 700 : 400,
                }}
              >
                Tutti ({consigli.length})
              </button>
              {contestiPresenti.map(c => {
                const label  = CONTESTI.find(x => x.value === c)?.label ?? c
                const count  = consigli.filter(x => x.contesto === c).length
                const active = tabContesto === c
                return (
                  <button
                    key={c}
                    onClick={() => setTabContesto(c)}
                    style={{
                      padding: '6px 14px', borderRadius: 3, fontSize: 12,
                      fontFamily: 'var(--font-mono)', cursor: 'pointer', border: 'none',
                      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                      color:      active ? '#000' : 'var(--gray)',
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {label} ({count})
                  </button>
                )
              })}
            </div>

            {consigliDestinatario.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--gray)', padding: '20px 0' }}>
                Nessun consiglio per questo contesto.
              </div>
            ) : (
              consigliDestinatario.map(item => (
                <ConsiglioCard
                  key={item.id}
                  item={item}
                  readonly={true}
                  membriMap={{}}
                  deletingId={null}
                />
              ))
            )}
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VISTA UFFICIO STAMPA
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, animation: 'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{
        marginBottom: 28,
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          }}>
            <span style={{ display: 'block', width: 20, height: 1, background: 'var(--accent)' }} />
            Ufficio Stampa
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
            lineHeight: 1, marginBottom: 4,
          }}>
            Consigli Interviste
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray)' }}>
            Scrivi i consigli di risposta per ogni membro dello staff
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={openCreate}
          style={{ flexShrink: 0, marginTop: 4 }}
        >
          + Nuovo Consiglio
        </button>
      </div>

      {error && <div className="alert alert-warning" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Tab per ruolo destinatario */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border-solid)' }}>
        {RUOLI_DEST.map(r => {
          const count  = consigli.filter(c => c.destinatario_ruolo === r.value).length
          const active = tabAttiva === r.value
          return (
            <button
              key={r.value}
              onClick={() => setTabAttiva(r.value)}
              style={{
                padding: '10px 18px', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', border: 'none',
                background: 'transparent',
                color:      active ? 'var(--accent)' : 'var(--gray)',
                fontWeight: active ? 700 : 400,
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {r.emoji} {r.label}
              {count > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontFamily: 'var(--font-mono)',
                  background: active ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  color:      active ? '#000' : 'var(--gray)',
                  padding: '1px 5px', borderRadius: 2, fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista consigli per tab attiva */}
      {consigliPerTabAttiva.length === 0 ? (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎤</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>
            Nessun consiglio inserito per questo ruolo
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 18 }}>
            Clicca &quot;+ Nuovo Consiglio&quot; per aggiungere un consiglio per{' '}
            {RUOLI_DEST.find(r => r.value === tabAttiva)?.label}.
          </div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + Nuovo Consiglio
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
            {consigliPerTabAttiva.length} consiglio{consigliPerTabAttiva.length !== 1 ? 'i' : ''} per{' '}
            {RUOLI_DEST.find(r => r.value === tabAttiva)?.label}
          </div>
          {consigliPerTabAttiva.map(item => (
            <ConsiglioCard
              key={item.id}
              item={item}
              readonly={false}
              membriMap={membriMap}
              onEdit={openEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))}
        </>
      )}

      {/* Modal form */}
      {modalOpen && (
        <ConsiglioFormModal
          initial={editItem}
          saving={saving}
          error={formError}
          membriPerRuolo={membriPerRuolo}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
