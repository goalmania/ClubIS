'use client'
// src/app/dashboard/segretario/settore-giovanile/page.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, FormField, FormGrid } from '@/components/ui'
import {
  CATEGORIE_SQUADRA,
  CATEGORIE_SQUADRA_OPTIONS,
  STATI_QUOTA_GIOVANILE,
  METODI_PAGAMENTO,
  mesiStagione,
  formatMese,
  coloreQuota,
  type CategoriaSquadra,
  type StatoQuotaGiovanile,
} from '@/lib/settore-giovanile'

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface Squadra {
  id: string
  nome: string
  categoria_eta: string
  colore_badge: string
  descrizione: string | null
  max_giocatori: number
  attiva: boolean
  allenatore_id: string | null
  allenatore?: { id: string; nome: string; cognome: string } | null
}

interface QuotaGiovanile {
  id: string
  squadra_id: string
  giocatore_id: string
  importo_mensile: number
  mese_competenza: string
  stato: string
  data_pagamento: string | null
  metodo_pagamento: string | null
  note: string | null
  giocatore?: { id: string; nome: string; cognome: string } | null
  squadra?: { id: string; nome: string; categoria_eta: string; colore_badge: string } | null
}

type Tab = 'squadre' | 'quote'

const MESI = mesiStagione(2025)

// ── Componente principale ─────────────────────────────────────────────────────

export default function SettoreGiovanilePage() {
  const supabase = useRef(createClient()).current
  const [tab, setTab] = useState<Tab>('squadre')

  // Squadre
  const [squadre, setSquadre]             = useState<Squadra[]>([])
  const [loadingSquadre, setLoadingSquadre] = useState(true)
  const [modalSquadra, setModalSquadra]   = useState<Partial<Squadra> | null>(null)
  const [editingSquadra, setEditingSquadra] = useState<Squadra | null>(null)
  const [savingSquadra, setSavingSquadra] = useState(false)

  // Giocatori (per select nel modal quota)
  const [giocatori, setGiocatori] = useState<{ id: string; nome: string; cognome: string }[]>([])

  // Quote
  const [quote, setQuote]               = useState<QuotaGiovanile[]>([])
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [filtroSquadra, setFiltroSquadra] = useState<string>('tutte')
  const [filtroMese, setFiltroMese]     = useState<string>(MESI[0]?.value ?? '')
  const [filtroStato, setFiltroStato]   = useState<string>('tutte')
  const [modalQuota, setModalQuota]     = useState<Partial<QuotaGiovanile> | null>(null)
  const [editingQuota, setEditingQuota] = useState<QuotaGiovanile | null>(null)
  const [savingQuota, setSavingQuota]   = useState(false)

  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, tipo: 'ok' | 'err' = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Caricamento squadre ────────────────────────────────────────────────────

  const caricaSquadre = useCallback(async () => {
    setLoadingSquadre(true)
    const res = await fetch('/api/settore-giovanile/squadre?attive=false')
    const json = await res.json()
    setSquadre(json.squadre ?? [])
    setLoadingSquadre(false)
  }, [])

  useEffect(() => { caricaSquadre() }, [caricaSquadre])

  // ── Caricamento giocatori ──────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('giocatori')
      .select('id, nome, cognome')
      .order('cognome')
      .then(({ data }) => setGiocatori(data ?? []))
  }, [supabase])

  // ── Caricamento quote ──────────────────────────────────────────────────────

  const caricaQuote = useCallback(async () => {
    setLoadingQuote(true)
    const params = new URLSearchParams()
    if (filtroSquadra !== 'tutte') params.set('squadra_id', filtroSquadra)
    if (filtroMese)                params.set('mese', filtroMese)
    if (filtroStato !== 'tutte')   params.set('stato', filtroStato)
    const res = await fetch(`/api/settore-giovanile/quote?${params}`)
    const json = await res.json()
    setQuote(json.quote ?? [])
    setLoadingQuote(false)
  }, [filtroSquadra, filtroMese, filtroStato])

  useEffect(() => {
    if (tab === 'quote') caricaQuote()
  }, [tab, caricaQuote])

  // ── Salvataggio squadra ────────────────────────────────────────────────────

  async function salvaSquadra() {
    if (!modalSquadra?.nome || !modalSquadra.categoria_eta) {
      showToast('Nome e categoria obbligatori', 'err')
      return
    }
    setSavingSquadra(true)
    try {
      const method = editingSquadra ? 'PATCH' : 'POST'
      const url = editingSquadra
        ? `/api/settore-giovanile/squadre?id=${editingSquadra.id}`
        : '/api/settore-giovanile/squadre'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modalSquadra) })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(editingSquadra ? 'Squadra aggiornata' : 'Squadra creata')
      setModalSquadra(null)
      setEditingSquadra(null)
      caricaSquadre()
    } catch (e: any) {
      showToast(e.message, 'err')
    } finally {
      setSavingSquadra(false)
    }
  }

  async function disattivaSquadra(id: string) {
    if (!confirm('Disattivare questa squadra?')) return
    const res = await fetch(`/api/settore-giovanile/squadre?id=${id}`, { method: 'DELETE' })
    if (res.ok) { showToast('Squadra disattivata'); caricaSquadre() }
    else showToast('Errore', 'err')
  }

  // ── Salvataggio quota ──────────────────────────────────────────────────────

  async function salvaQuota() {
    if (!modalQuota?.giocatore_id || !modalQuota.squadra_id || !modalQuota.mese_competenza) {
      showToast('Campi obbligatori mancanti', 'err')
      return
    }
    setSavingQuota(true)
    try {
      const method = editingQuota ? 'PATCH' : 'POST'
      const url = editingQuota
        ? `/api/settore-giovanile/quote?id=${editingQuota.id}`
        : '/api/settore-giovanile/quote'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modalQuota) })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(editingQuota ? 'Quota aggiornata' : 'Quota registrata')
      setModalQuota(null)
      setEditingQuota(null)
      caricaQuote()
    } catch (e: any) {
      showToast(e.message, 'err')
    } finally {
      setSavingQuota(false)
    }
  }

  async function marcaPagata(quota: QuotaGiovanile) {
    const res = await fetch(`/api/settore-giovanile/quote?id=${quota.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'pagata' }),
    })
    if (res.ok) { showToast('Quota segnata come pagata'); caricaQuote() }
    else showToast('Errore', 'err')
  }

  // ── KPI quote ─────────────────────────────────────────────────────────────

  const totQuote      = quote.length
  const totPagate     = quote.filter(q => q.stato === 'pagata').length
  const totInRitardo  = quote.filter(q => q.stato === 'in_ritardo').length
  const incassoMese   = quote.filter(q => q.stato === 'pagata').reduce((s, q) => s + Number(q.importo_mensile), 0)
  const attesaMese    = quote.filter(q => q.stato !== 'esonerata').reduce((s, q) => s + Number(q.importo_mensile), 0)

  function fmtEuro(v: number) {
    return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Settore Giovanile"
        subtitle="Gestione multi-squadra, quote mensili e prima nota per squadra"
        actions={
          tab === 'squadre' ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setEditingSquadra(null); setModalSquadra({ colore_badge: '#c8f000', max_giocatori: 30, attiva: true }) }}
            >
              + Nuova squadra
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setEditingQuota(null); setModalQuota({ squadra_id: filtroSquadra !== 'tutte' ? filtroSquadra : '', mese_competenza: filtroMese, stato: 'da_pagare', importo_mensile: 0 }) }}
            >
              + Nuova quota
            </button>
          )
        }
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {([['squadre', '🏟 Squadre'], ['quote', '💶 Quote mensili']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tab === t ? 'var(--accent-green)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--accent-green)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB SQUADRE ─────────────────────────────────────────────────── */}
      {tab === 'squadre' && (
        <div>
          {loadingSquadre ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Caricamento…</div>
          ) : squadre.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏟</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nessuna squadra configurata</div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 16 }}
                onClick={() => { setEditingSquadra(null); setModalSquadra({ colore_badge: '#c8f000', max_giocatori: 30, attiva: true }) }}
              >
                + Crea la prima squadra
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {squadre
                .sort((a, b) => {
                  const oa = CATEGORIE_SQUADRA[a.categoria_eta as CategoriaSquadra]?.ordine ?? 99
                  const ob = CATEGORIE_SQUADRA[b.categoria_eta as CategoriaSquadra]?.ordine ?? 99
                  return oa - ob
                })
                .map(s => (
                  <div
                    key={s.id}
                    className="card"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      opacity: s.attiva ? 1 : 0.5,
                      borderTop: `3px solid ${s.colore_badge ?? '#c8f000'}`,
                    }}
                  >
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: s.colore_badge ?? '#c8f000',
                            flexShrink: 0,
                          }} />
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{s.nome}</span>
                        </div>
                        {!s.attiva && <span className="badge badge-grigio">Inattiva</span>}
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {CATEGORIE_SQUADRA[s.categoria_eta as CategoriaSquadra]?.label ?? s.categoria_eta}
                      </div>

                      {s.allenatore && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          👤 {s.allenatore.nome} {s.allenatore.cognome}
                        </div>
                      )}

                      {s.descrizione && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                          {s.descrizione}
                        </div>
                      )}

                      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, fontSize: 12 }}
                          onClick={() => { setEditingSquadra(s); setModalSquadra({ ...s }) }}
                        >
                          Modifica
                        </button>
                        {s.attiva && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 12, color: 'var(--accent-red)' }}
                            onClick={() => disattivaSquadra(s.id)}
                          >
                            Disattiva
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB QUOTE ───────────────────────────────────────────────────── */}
      {tab === 'quote' && (
        <div>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Quote mese</div>
              <div className="stat-value">{totQuote}</div>
              <div className="stat-sub">{totPagate} pagate</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Incassato</div>
              <div className="stat-value" style={{ fontSize: 20, color: 'var(--accent-green)' }}>{fmtEuro(incassoMese)}</div>
              <div className="stat-sub">su {fmtEuro(attesaMese)} attesi</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In ritardo</div>
              <div className="stat-value" style={{ color: totInRitardo > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{totInRitardo}</div>
              <div className="stat-sub">oltre il 10 del mese</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tasso riscossione</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {totQuote > 0 ? Math.round((totPagate / totQuote) * 100) : 0}%
              </div>
              <div className="stat-sub">{totQuote - totPagate} da riscuotere</div>
            </div>
          </div>

          {/* Filtri */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Squadra</label>
              <select
                className="select"
                style={{ minWidth: 160 }}
                value={filtroSquadra}
                onChange={e => setFiltroSquadra(e.target.value)}
              >
                <option value="tutte">Tutte le squadre</option>
                {squadre.filter(s => s.attiva).map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Mese</label>
              <select
                className="select"
                style={{ minWidth: 160 }}
                value={filtroMese}
                onChange={e => setFiltroMese(e.target.value)}
              >
                {MESI.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Stato</label>
              <select
                className="select"
                value={filtroStato}
                onChange={e => setFiltroStato(e.target.value)}
              >
                <option value="tutte">Tutti</option>
                {Object.entries(STATI_QUOTA_GIOVANILE).map(([k, v]) => (
                  <option key={k} value={k}>{v.icona} {v.label}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={caricaQuote}>
              🔄 Aggiorna
            </button>
          </div>

          {/* Alert in ritardo */}
          {totInRitardo > 0 && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>
                <strong>{totInRitardo} quot{totInRitardo === 1 ? 'a' : 'e'}</strong> in ritardo — non {totInRitardo === 1 ? 'è stata pagata' : 'sono state pagate'} entro il 10 del mese.
              </span>
            </div>
          )}

          {/* Lista quote */}
          {loadingQuote ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Caricamento…</div>
          ) : quote.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💶</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nessuna quota per i filtri selezionati</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Giocatore</th>
                      <th>Squadra</th>
                      <th>Mese</th>
                      <th>Importo</th>
                      <th>Stato</th>
                      <th>Pagato il</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.map(q => {
                      const statoInfo = STATI_QUOTA_GIOVANILE[q.stato as StatoQuotaGiovanile]
                      return (
                        <tr key={q.id}>
                          <td style={{ fontWeight: 500 }}>
                            {q.giocatore ? `${q.giocatore.nome} ${q.giocatore.cognome}` : `#${q.giocatore_id.slice(-4)}`}
                          </td>
                          <td>
                            {q.squadra && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.squadra.colore_badge, flexShrink: 0 }} />
                                <span style={{ fontSize: 12 }}>{q.squadra.nome}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatMese(q.mese_competenza)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {fmtEuro(Number(q.importo_mensile))}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                              background: `${coloreQuota(q.stato)}22`,
                              color: coloreQuota(q.stato),
                            }}>
                              {statoInfo?.icona} {statoInfo?.label ?? q.stato}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {q.data_pagamento ? new Date(q.data_pagamento).toLocaleDateString('it-IT') : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {q.stato !== 'pagata' && q.stato !== 'esonerata' && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: 11 }}
                                  onClick={() => marcaPagata(q)}
                                >
                                  ✓ Pagata
                                </button>
                              )}
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: 11 }}
                                onClick={() => { setEditingQuota(q); setModalQuota({ ...q }) }}
                              >
                                Modifica
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL SQUADRA ─────────────────────────────────────────────────── */}
      {modalSquadra !== null && (
        <div className="modal-overlay" onClick={() => { setModalSquadra(null); setEditingSquadra(null) }}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingSquadra ? 'Modifica squadra' : 'Nuova squadra'}</h3>
              <button className="modal-close" onClick={() => { setModalSquadra(null); setEditingSquadra(null) }}>✕</button>
            </div>
            <div className="modal-body">
              <FormGrid cols={2}>
                <FormField label="Nome squadra" required>
                  <input
                    className="input"
                    value={modalSquadra.nome ?? ''}
                    onChange={e => setModalSquadra(p => ({ ...p!, nome: e.target.value }))}
                    placeholder="Es. Under 15 A"
                  />
                </FormField>
                <FormField label="Categoria" required>
                  <select
                    className="select"
                    value={modalSquadra.categoria_eta ?? ''}
                    onChange={e => {
                      const cat = e.target.value as CategoriaSquadra
                      setModalSquadra(p => ({
                        ...p!,
                        categoria_eta: cat,
                        colore_badge: CATEGORIE_SQUADRA[cat]?.colore ?? '#c8f000',
                      }))
                    }}
                  >
                    <option value="">— Seleziona —</option>
                    {CATEGORIE_SQUADRA_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Colore badge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="color"
                      value={modalSquadra.colore_badge ?? '#c8f000'}
                      onChange={e => setModalSquadra(p => ({ ...p!, colore_badge: e.target.value }))}
                      style={{ width: 44, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
                    />
                    <input
                      className="input"
                      value={modalSquadra.colore_badge ?? '#c8f000'}
                      onChange={e => setModalSquadra(p => ({ ...p!, colore_badge: e.target.value }))}
                      placeholder="#c8f000"
                    />
                  </div>
                </FormField>
                <FormField label="Max giocatori">
                  <input
                    type="number"
                    className="input"
                    value={modalSquadra.max_giocatori ?? 30}
                    onChange={e => setModalSquadra(p => ({ ...p!, max_giocatori: parseInt(e.target.value) || 30 }))}
                    min={1}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Descrizione">
                <textarea
                  className="input"
                  rows={2}
                  value={modalSquadra.descrizione ?? ''}
                  onChange={e => setModalSquadra(p => ({ ...p!, descrizione: e.target.value }))}
                  placeholder="Note opzionali sulla squadra…"
                />
              </FormField>

              {editingSquadra && (
                <FormField label="Squadra attiva">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={modalSquadra.attiva ?? true}
                      onChange={e => setModalSquadra(p => ({ ...p!, attiva: e.target.checked }))}
                    />
                    <span style={{ fontSize: 13 }}>Attiva</span>
                  </label>
                </FormField>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setModalSquadra(null); setEditingSquadra(null) }}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={salvaSquadra} disabled={savingSquadra}>
                {savingSquadra ? 'Salvataggio…' : editingSquadra ? 'Aggiorna' : 'Crea squadra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL QUOTA ───────────────────────────────────────────────────── */}
      {modalQuota !== null && (
        <div className="modal-overlay" onClick={() => { setModalQuota(null); setEditingQuota(null) }}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingQuota ? 'Modifica quota' : 'Nuova quota'}</h3>
              <button className="modal-close" onClick={() => { setModalQuota(null); setEditingQuota(null) }}>✕</button>
            </div>
            <div className="modal-body">
              <FormField label="Giocatore" required>
                <select
                  className="select"
                  value={modalQuota.giocatore_id ?? ''}
                  onChange={e => setModalQuota(p => ({ ...p!, giocatore_id: e.target.value }))}
                >
                  <option value="">— Seleziona giocatore —</option>
                  {giocatori.map(g => (
                    <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
                  ))}
                </select>
              </FormField>
              <FormGrid cols={2}>
                <FormField label="Squadra" required>
                  <select
                    className="select"
                    value={modalQuota.squadra_id ?? ''}
                    onChange={e => setModalQuota(p => ({ ...p!, squadra_id: e.target.value }))}
                  >
                    <option value="">— Seleziona —</option>
                    {squadre.filter(s => s.attiva).map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Mese competenza" required>
                  <select
                    className="select"
                    value={modalQuota.mese_competenza ?? ''}
                    onChange={e => setModalQuota(p => ({ ...p!, mese_competenza: e.target.value }))}
                  >
                    <option value="">— Seleziona —</option>
                    {MESI.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Importo mensile (€)" required>
                  <input
                    type="number"
                    className="input"
                    value={modalQuota.importo_mensile ?? 0}
                    onChange={e => setModalQuota(p => ({ ...p!, importo_mensile: parseFloat(e.target.value) || 0 }))}
                    min={0}
                    step={0.01}
                  />
                </FormField>
                <FormField label="Stato">
                  <select
                    className="select"
                    value={modalQuota.stato ?? 'da_pagare'}
                    onChange={e => setModalQuota(p => ({ ...p!, stato: e.target.value }))}
                  >
                    {Object.entries(STATI_QUOTA_GIOVANILE).map(([k, v]) => (
                      <option key={k} value={k}>{v.icona} {v.label}</option>
                    ))}
                  </select>
                </FormField>
              </FormGrid>

              {(modalQuota.stato === 'pagata') && (
                <FormGrid cols={2}>
                  <FormField label="Data pagamento">
                    <input
                      type="date"
                      className="input"
                      value={modalQuota.data_pagamento ?? ''}
                      onChange={e => setModalQuota(p => ({ ...p!, data_pagamento: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Metodo pagamento">
                    <select
                      className="select"
                      value={modalQuota.metodo_pagamento ?? ''}
                      onChange={e => setModalQuota(p => ({ ...p!, metodo_pagamento: e.target.value }))}
                    >
                      <option value="">— Seleziona —</option>
                      {METODI_PAGAMENTO.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </FormField>
                </FormGrid>
              )}

              <FormField label="Note">
                <textarea
                  className="input"
                  rows={2}
                  value={modalQuota.note ?? ''}
                  onChange={e => setModalQuota(p => ({ ...p!, note: e.target.value }))}
                  placeholder="Note opzionali…"
                />
              </FormField>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setModalQuota(null); setEditingQuota(null) }}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={salvaQuota} disabled={savingQuota}>
                {savingQuota ? 'Salvataggio…' : editingQuota ? 'Aggiorna' : 'Registra quota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: toast.tipo === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
          color: toast.tipo === 'ok' ? '#000' : '#fff',
          padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
