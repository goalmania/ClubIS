'use client'
import { useState, useCallback, useEffect } from 'react'
import type { RuoloUtente } from '@/types/database'
import type { Accredito, TipoAccredito } from '@/lib/accrediti'
import {
  TIPO_ACCREDITO_LABEL,
  STATO_ACCREDITO_INFO,
  SETTORI_STADIO,
  generaStampaAccrediti,
} from '@/lib/accrediti'

// ── Stili condivisi ──────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '8px 11px',
  background: '#1a1a1a', border: '1px solid var(--border-solid)',
  borderRadius: 2, color: 'var(--white)', fontSize: 13,
  fontFamily: 'var(--font-sans)', outline: 'none',
} as const

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-mono)',
  fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.15em', color: 'var(--grigio-3)', marginBottom: 5,
}

// ── Modal nuovo accredito ────────────────────────────────────────────────────

interface ModalNuovoProps {
  partitaId?: string
  onSalva: () => void
  onClose: () => void
}

function ModalNuovoAccredito({ partitaId, onSalva, onClose }: ModalNuovoProps) {
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '', cognome: '', tipo: 'media' as TipoAccredito,
    organizzazione: '', email: '', telefono: '',
    settore: '', note: '', numero_badge: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const salva = async () => {
    if (!form.nome || !form.cognome) {
      setErrore('Nome e cognome sono obbligatori')
      return
    }
    setSaving(true)
    setErrore(null)
    const res = await fetch('/api/accrediti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partita_id: partitaId || undefined,
        nome: form.nome,
        cognome: form.cognome,
        tipo: form.tipo,
        organizzazione: form.organizzazione || undefined,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        settore: form.settore || undefined,
        note: form.note || undefined,
        numero_badge: form.numero_badge || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrore(json.error ?? 'Errore durante il salvataggio')
      setSaving(false)
      return
    }
    onSalva()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#111', border: '1px solid var(--border-solid)',
        borderRadius: 4, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: 'var(--white)' }}>
            Nuovo accredito
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grigio-4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {errore && (
          <div style={{ padding: '10px 14px', background: 'var(--rosso-lt)', border: '1px solid var(--rosso-bd)', borderRadius: 2, color: 'var(--rosso)', fontSize: 13, marginBottom: 20 }}>
            {errore}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nome / Cognome */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} style={inputStyle} placeholder="Mario" />
            </div>
            <div>
              <label style={labelStyle}>Cognome *</label>
              <input value={form.cognome} onChange={e => set('cognome', e.target.value)} style={inputStyle} placeholder="Rossi" />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo accredito *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value as TipoAccredito)} style={inputStyle}>
              {(Object.entries(TIPO_ACCREDITO_LABEL) as [TipoAccredito, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Organizzazione */}
          <div>
            <label style={labelStyle}>Organizzazione / Testata</label>
            <input value={form.organizzazione} onChange={e => set('organizzazione', e.target.value)} style={inputStyle} placeholder="es. Corriere dello Sport" />
          </div>

          {/* Email / Telefono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="mario@giornale.it" />
            </div>
            <div>
              <label style={labelStyle}>Telefono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} style={inputStyle} placeholder="+39 333 …" />
            </div>
          </div>

          {/* Settore / Badge */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Settore accesso</label>
              <select value={form.settore} onChange={e => set('settore', e.target.value)} style={inputStyle}>
                <option value="">— Seleziona —</option>
                {SETTORI_STADIO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>N° badge</label>
              <input value={form.numero_badge} onChange={e => set('numero_badge', e.target.value)} style={inputStyle} placeholder="A-001" />
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={labelStyle}>Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Informazioni aggiuntive…" />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              onClick={salva}
              disabled={saving}
              style={{
                padding: '9px 22px', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Salvataggio…' : 'Aggiungi accredito'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px', background: 'transparent', color: 'var(--grigio-3)',
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

// ── Modal approvazione ────────────────────────────────────────────────────────

interface ModalApprovaProps {
  accredito: Accredito
  onSalva: () => void
  onClose: () => void
}

function ModalApprova({ accredito, onSalva, onClose }: ModalApprovaProps) {
  const [stato, setStato] = useState<'approvato' | 'rifiutato'>('approvato')
  const [motivo, setMotivo] = useState('')
  const [badge, setBadge] = useState(accredito.numero_badge ?? '')
  const [settore, setSettore] = useState(accredito.settore ?? '')
  const [saving, setSaving] = useState(false)

  const salva = async () => {
    setSaving(true)
    await fetch(`/api/accrediti/${accredito.id}/approva`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stato,
        motivo_rifiuto: stato === 'rifiutato' ? motivo : undefined,
        numero_badge: badge || undefined,
        settore: settore || undefined,
      }),
    })
    onSalva()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#111', border: '1px solid var(--border-solid)',
        borderRadius: 4, width: '100%', maxWidth: 440, padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--white)' }}>
            Gestisci accredito
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grigio-4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--grigio-3)', marginBottom: 20 }}>
          <strong style={{ color: 'var(--white)' }}>{accredito.cognome} {accredito.nome}</strong>
          {accredito.organizzazione && <span style={{ marginLeft: 6 }}>· {accredito.organizzazione}</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stato */}
          <div>
            <label style={labelStyle}>Decisione</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['approvato', 'rifiutato'] as const).map(s => {
                const info = STATO_ACCREDITO_INFO[s]
                const isSelected = stato === s
                return (
                  <button
                    key={s}
                    onClick={() => setStato(s)}
                    style={{
                      flex: 1, padding: '8px 12px',
                      background: isSelected ? info.bg : 'transparent',
                      border: `1px solid ${isSelected ? info.colore : 'var(--border-solid)'}`,
                      borderRadius: 2, cursor: 'pointer',
                      color: isSelected ? info.colore : 'var(--grigio-4)',
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      textTransform: 'uppercase', fontWeight: 700,
                    }}
                  >
                    {info.label}
                  </button>
                )
              })}
            </div>
          </div>

          {stato === 'approvato' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>N° badge</label>
                  <input value={badge} onChange={e => setBadge(e.target.value)} style={inputStyle} placeholder="A-001" />
                </div>
                <div>
                  <label style={labelStyle}>Settore</label>
                  <select value={settore} onChange={e => setSettore(e.target.value)} style={inputStyle}>
                    <option value="">— Seleziona —</option>
                    {SETTORI_STADIO.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {stato === 'rifiutato' && (
            <div>
              <label style={labelStyle}>Motivo rifiuto</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Indica il motivo del rifiuto…" />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              onClick={salva}
              disabled={saving}
              style={{
                padding: '9px 22px',
                background: stato === 'approvato' ? 'var(--verde)' : 'var(--rosso)',
                color: '#fff', border: 'none', borderRadius: 2,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '…' : stato === 'approvato' ? 'Approva' : 'Rifiuta'}
            </button>
            <button onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', color: 'var(--grigio-3)', border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12, textTransform: 'uppercase' }}>Annulla</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────

interface AccreditiPartitaProps {
  partitaId?: string
  ruolo: RuoloUtente
  titoloPagina?: string
  mostraFiltroPartita?: boolean
}

export default function AccreditiPartita({
  partitaId,
  ruolo,
  titoloPagina,
  mostraFiltroPartita = false,
}: AccreditiPartitaProps) {
  const [accrediti, setAccrediti] = useState<Accredito[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [filtroStato, setFiltroStato] = useState<string>('tutti')
  const [filtroTipo, setFiltroTipo] = useState<string>('tutti')
  const [modalNuovo, setModalNuovo] = useState(false)
  const [modalApprova, setModalApprova] = useState<Accredito | null>(null)

  const canWrite  = ['segretario', 'presidente', 'ds', 'team_manager', 'ufficio_stampa'].includes(ruolo)
  const canApprove = ['segretario', 'presidente', 'ds', 'team_manager'].includes(ruolo)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (partitaId) params.set('partita_id', partitaId)
    const res = await fetch(`/api/accrediti?${params}`)
    const json = await res.json()
    setAccrediti(json.data ?? [])
    setLoading(false)
  }, [partitaId])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const elimina = async (id: string) => {
    if (!confirm('Eliminare questo accredito?')) return
    await fetch(`/api/accrediti/${id}`, { method: 'DELETE' })
    await load()
    showToast('Accredito eliminato')
  }

  const stampa = () => {
    const lista = accreditiFiltrati
    const html = generaStampaAccrediti(lista, titoloPagina ?? 'Lista Accrediti')
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }

  // Filtri client-side
  const accreditiFiltrati = accrediti.filter(a => {
    if (filtroStato !== 'tutti' && a.stato !== filtroStato) return false
    if (filtroTipo  !== 'tutti' && a.tipo  !== filtroTipo)  return false
    return true
  })

  // KPI
  const kpi = {
    totale:    accrediti.length,
    approvati: accrediti.filter(a => a.stato === 'approvato').length,
    attesa:    accrediti.filter(a => a.stato === 'in_attesa').length,
    rifiutati: accrediti.filter(a => a.stato === 'rifiutato').length,
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--verde)', color: '#fff', padding: '10px 18px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 13, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      {/* Modal */}
      {modalNuovo && (
        <ModalNuovoAccredito
          partitaId={partitaId}
          onSalva={async () => { setModalNuovo(false); await load(); showToast('Accredito aggiunto') }}
          onClose={() => setModalNuovo(false)}
        />
      )}
      {modalApprova && (
        <ModalApprova
          accredito={modalApprova}
          onSalva={async () => { setModalApprova(null); await load(); showToast('Accredito aggiornato') }}
          onClose={() => setModalApprova(null)}
        />
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Totale',    value: kpi.totale,    colore: 'var(--white)' },
          { label: 'Approvati', value: kpi.approvati, colore: 'var(--verde)' },
          { label: 'In attesa', value: kpi.attesa,    colore: 'var(--ambra)' },
          { label: 'Rifiutati', value: kpi.rifiutati, colore: 'var(--rosso)' },
        ].map(({ label, value, colore }) => (
          <div key={label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--grigio-3)', marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: colore }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {/* Filtro stato */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['tutti', 'in_attesa', 'approvato', 'rifiutato'] as const).map(s => {
            const info = s !== 'tutti' ? STATO_ACCREDITO_INFO[s] : null
            const isActive = filtroStato === s
            return (
              <button
                key={s}
                onClick={() => setFiltroStato(s)}
                style={{
                  padding: '5px 11px', borderRadius: 2, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
                  border: `1px solid ${isActive && info ? info.colore : 'var(--border-solid)'}`,
                  background: isActive && info ? info.bg : isActive ? 'var(--accent)' : 'transparent',
                  color: isActive && info ? info.colore : isActive ? '#0a0a0a' : 'var(--grigio-3)',
                }}
              >
                {s === 'tutti' ? 'Tutti' : info?.label}
              </button>
            )
          })}
        </div>

        {/* Filtro tipo */}
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          style={{ ...inputStyle, width: 'auto', padding: '5px 10px', fontSize: 11 }}
        >
          <option value="tutti">Tutti i tipi</option>
          {(Object.entries(TIPO_ACCREDITO_LABEL) as [TipoAccredito, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Azioni */}
        <button
          onClick={stampa}
          disabled={accreditiFiltrati.length === 0}
          style={{
            padding: '7px 14px', background: 'transparent',
            color: 'var(--grigio-3)', border: '1px solid var(--border-solid)',
            borderRadius: 2, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
          }}
        >
          🖨 Stampa lista
        </button>

        {canWrite && (
          <button
            onClick={() => setModalNuovo(true)}
            style={{
              padding: '7px 16px', background: 'var(--accent)', color: '#0a0a0a',
              border: 'none', borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            + Nuovo accredito
          </button>
        )}
      </div>

      {/* Tabella */}
      {loading ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>Caricamento…</div>
      ) : accreditiFiltrati.length === 0 ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎫</div>
          <div style={{ fontSize: 14, color: 'var(--grigio-4)' }}>
            {accrediti.length === 0
              ? 'Nessun accredito registrato'
              : 'Nessun accredito corrisponde ai filtri selezionati'}
          </div>
          {canWrite && accrediti.length === 0 && (
            <button
              onClick={() => setModalNuovo(true)}
              style={{
                marginTop: 16, padding: '8px 18px', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              + Primo accredito
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nominativo</th>
                <th>Tipo</th>
                <th>Organizzazione</th>
                <th>Settore</th>
                <th>Badge</th>
                <th>Stato</th>
                {mostraFiltroPartita && <th>Partita</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accreditiFiltrati.map(a => {
                const statoInfo = STATO_ACCREDITO_INFO[a.stato]
                const tipoLabel = TIPO_ACCREDITO_LABEL[a.tipo] ?? a.tipo
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>
                      {a.cognome} {a.nome}
                      {a.email && (
                        <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{a.email}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{tipoLabel}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{a.organizzazione ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{a.settore ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.numero_badge ?? '—'}</td>
                    <td>
                      <div>
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--font-mono)',
                          color: statoInfo.colore, background: statoInfo.bg,
                          padding: '2px 8px', borderRadius: 2, fontWeight: 700,
                        }}>
                          {statoInfo.label}
                        </span>
                        {a.stato === 'rifiutato' && a.motivo_rifiuto && (
                          <div style={{ fontSize: 10, color: 'var(--rosso)', marginTop: 2 }}>{a.motivo_rifiuto}</div>
                        )}
                      </div>
                    </td>
                    {mostraFiltroPartita && (
                      <td style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                        {a.partite ? `${a.partite.avversario} · ${a.partite.data_ora.slice(0, 10)}` : '—'}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {canApprove && a.stato === 'in_attesa' && (
                          <button
                            onClick={() => setModalApprova(a)}
                            style={{
                              padding: '3px 9px', fontSize: 10, fontFamily: 'var(--font-mono)',
                              background: 'var(--accent-lt)', color: 'var(--accent)',
                              border: '1px solid var(--accent)', borderRadius: 2,
                              cursor: 'pointer', textTransform: 'uppercase',
                            }}
                          >
                            Gestisci
                          </button>
                        )}
                        {canApprove && a.stato !== 'in_attesa' && (
                          <button
                            onClick={() => setModalApprova(a)}
                            style={{
                              padding: '3px 9px', fontSize: 10, fontFamily: 'var(--font-mono)',
                              background: 'transparent', color: 'var(--grigio-4)',
                              border: '1px solid var(--border-solid)', borderRadius: 2,
                              cursor: 'pointer', textTransform: 'uppercase',
                            }}
                          >
                            Modifica
                          </button>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => elimina(a.id)}
                            style={{
                              padding: '3px 7px', background: 'transparent',
                              color: 'var(--grigio-4)', border: '1px solid var(--border-solid)',
                              borderRadius: 2, cursor: 'pointer', fontSize: 11,
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
