'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Toast, Drawer, Modal, StatCard } from '@/components/ui'

/* ── Tipi ─────────────────────────────────────────────────────────────────── */
type Gruppo    = { id: string; club_id: string; nome: string; tipo: string; colore: string; stagione: string; descrizione?: string | null; attivo: boolean }
type Giocatore = { id: string; nome: string; cognome: string; ruolo_principale?: string | null; numero_maglia?: string | null; data_nascita?: string | null }
type Utente    = { id: string; nome: string; cognome: string; ruolo: string; email?: string | null }
type Membro    = { id: string; gruppo_id: string; giocatore_id: string | null; utente_id: string | null; ruolo_nel_gruppo: string | null; data_ingresso: string | null }

/* ── Categorie FIGC ───────────────────────────────────────────────────────── */
const FIGC = [
  { nome: 'Prima Squadra', colore: '#c8f000', etaMin: 19, etaMax: -1  },
  { nome: 'Primavera',     colore: '#00e5b8', etaMin: 18, etaMax: 20  },
  { nome: 'Under 19',      colore: '#388bfd', etaMin: 16, etaMax: 18  },
  { nome: 'Under 17',      colore: '#ff9900', etaMin: 15, etaMax: 16  },
  { nome: 'Under 15',      colore: '#aa88ff', etaMin: 13, etaMax: 14  },
  { nome: 'Under 13',      colore: '#ff6699', etaMin: 11, etaMax: 12  },
  { nome: 'Esordienti',    colore: '#ff4444', etaMin: 9,  etaMax: 10  },
  { nome: 'Pulcini',       colore: '#ff7722', etaMin: 7,  etaMax: 8   },
  { nome: 'Piccoli Amici', colore: '#ffcc00', etaMin: 5,  etaMax: 6   },
  { nome: 'Scuola Calcio', colore: '#66ddff', etaMin: 0,  etaMax: 4   },
  { nome: 'Staff Tecnico', colore: '#888888', etaMin: -1, etaMax: -1  },
]

function annoStagione() {
  const d = new Date(); const m = d.getMonth() + 1
  return m >= 7 ? d.getFullYear() + 1 : d.getFullYear()
}
function stagioneCorrente() {
  const d = new Date(); const m = d.getMonth() + 1; const a = d.getFullYear()
  const i = m >= 7 ? a : a - 1; return `${i}-${String(i + 1).slice(-2)}`
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function GruppiPage() {
  /* ── Dati principali ──────────────────────────────────────────────────── */
  const [gruppi,    setGruppi]    = useState<Gruppo[]>([])
  const [giocatori, setGiocatori] = useState<Giocatore[]>([])
  const [staff,     setStaff]     = useState<Utente[]>([])
  const [loading,   setLoading]   = useState(true)

  /* ── Toast ────────────────────────────────────────────────────────────── */
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const ok  = (msg: string) => setToast({ msg, tipo: 'success' })
  const err = (msg: string) => setToast({ msg, tipo: 'error' })

  /* ── Vista dettaglio gruppo ───────────────────────────────────────────── */
  const [gruppoSel,      setGruppoSel]      = useState<Gruppo | null>(null)
  const [membri,         setMembri]         = useState<Membro[]>([])
  const [loadingMembri,  setLoadingMembri]  = useState(false)

  /* ── Drawer nuovo gruppo ──────────────────────────────────────────────── */
  const [drawerNew, setDrawerNew] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [nNome,     setNNome]     = useState('')
  const [nDesc,     setNDesc]     = useState('')
  const [nColore,   setNColore]   = useState('#c8f000')
  const [nTipo,     setNTipo]     = useState('squadra')
  const [nStagione, setNStagione] = useState(stagioneCorrente())

  /* ── Modal aggiungi membri (nel dettaglio) ────────────────────────────── */
  const [modalAdd,   setModalAdd]   = useState(false)
  const [selIds,     setSelIds]     = useState<string[]>([])
  const [ruoloAdd,   setRuoloAdd]   = useState('')
  const [cercaAdd,   setCercaAdd]   = useState('')

  /* ── Modal modifica rapida da card ───────────────────────────────────── */
  const [modalEdit,     setModalEdit]     = useState<Gruppo | null>(null)
  const [editMembri,    setEditMembri]    = useState<Membro[]>([])
  const [editSelIds,    setEditSelIds]    = useState<string[]>([])
  const [loadingEdit,   setLoadingEdit]   = useState(false)
  const [cercaEdit,     setCercaEdit]     = useState('')

  /* ── Crea gruppi default ─────────────────────────────────────────────── */
  const [creatingDef, setCreatingDef] = useState(false)

  /* ══ CARICAMENTO DATI ════════════════════════════════════════════════════ */
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/gruppi')
      const data = await res.json()
      if (!res.ok) { err(data.error ?? 'Errore caricamento gruppi'); setLoading(false); return }
      setGruppi(data.gruppi ?? [])
      setGiocatori(data.giocatori ?? [])
      setStaff(data.staff ?? [])
    } catch (e) {
      err(`Errore di rete: ${String(e)}`)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const loadMembri = useCallback(async (gruppoId: string) => {
    setLoadingMembri(true)
    const res  = await fetch(`/api/gruppi/${gruppoId}/membri`)
    const data = await res.json()
    setMembri(Array.isArray(data) ? data : [])
    setLoadingMembri(false)
  }, [])

  /* ══ HELPERS ═════════════════════════════════════════════════════════════ */
  const isStaff = (g: Gruppo | null) => g?.tipo === 'staff'

  const personaDi = (m: Membro): (Giocatore | Utente | null) => {
    if (m.utente_id)    return staff.find(s => s.id === m.utente_id)    ?? null
    if (m.giocatore_id) return giocatori.find(g => g.id === m.giocatore_id) ?? null
    return null
  }

  /* ══ AZIONI GRUPPI ═══════════════════════════════════════════════════════ */
  const creaNuovoGruppo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nNome.trim()) return
    setSaving(true)
    const res = await fetch('/api/gruppi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nNome.trim(), descrizione: nDesc.trim() || null, colore: nColore, tipo: nTipo, stagione: nStagione }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { err(`Errore: ${data.error}`); return }
    ok('Gruppo creato!')
    setDrawerNew(false); setNNome(''); setNDesc('')
    loadAll()
  }

  const creaGruppiDefault = async () => {
    setCreatingDef(true)
    try {
      const res  = await fetch('/api/gruppi/auto-assign', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { err(data.error ?? 'Errore sconosciuto'); return }
      const { gruppiCreati, giocatoriAssegnati, staffAssegnati, saltati, errori } = data
      if (errori?.length > 0) {
        err(`Errori: ${errori.slice(0, 2).join(' · ')}${errori.length > 2 ? ` (+${errori.length - 2})` : ''}`)
      } else {
        ok(`✓ ${gruppiCreati} gruppi creati · ${giocatoriAssegnati} giocatori · ${staffAssegnati} staff assegnati${saltati > 0 ? ` · ${saltati} saltati` : ''}`)
      }
      loadAll()
    } catch (e) {
      err(`Errore di rete: ${String(e)}`)
    } finally {
      setCreatingDef(false)
    }
  }

  const toggleAttivo = async (g: Gruppo) => {
    await fetch(`/api/gruppi/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !g.attivo }),
    })
    loadAll()
  }

  const eliminaGruppo = async (g: Gruppo) => {
    if (!confirm(`Eliminare "${g.nome}"? Verranno rimossi anche tutti i membri.`)) return
    const res = await fetch(`/api/gruppi/${g.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); err(d.error ?? 'Errore eliminazione'); return }
    ok(`Gruppo "${g.nome}" eliminato`)
    if (gruppoSel?.id === g.id) setGruppoSel(null)
    loadAll()
  }

  /* ══ AZIONI MEMBRI ═══════════════════════════════════════════════════════ */
  const aggiungiMembri = async () => {
    if (!gruppoSel || selIds.length === 0) return
    const fk = isStaff(gruppoSel) ? 'utente_id' : 'giocatore_id'
    const entries = selIds.map(id => ({ fk, id, ruolo: ruoloAdd || undefined }))
    await fetch(`/api/gruppi/${gruppoSel.id}/membri`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })
    ok(`${selIds.length} membro/i aggiunto/i`)
    setModalAdd(false); setSelIds([]); setRuoloAdd(''); setCercaAdd('')
    loadMembri(gruppoSel.id)
  }

  const rimuoviMembro = async (membroId: string) => {
    if (!gruppoSel) return
    await fetch(`/api/gruppi/${gruppoSel.id}/membri?membroId=${membroId}`, { method: 'DELETE' })
    ok('Membro rimosso')
    loadMembri(gruppoSel.id)
  }

  /* ── Modifica rapida da card ─────────────────────────────────────────── */
  const apriEdit = async (g: Gruppo) => {
    setModalEdit(g); setLoadingEdit(true); setCercaEdit('')
    const res  = await fetch(`/api/gruppi/${g.id}/membri`)
    const data = await res.json()
    const membriRaw: Membro[] = Array.isArray(data) ? data : []
    setEditMembri(membriRaw)
    const fk = g.tipo === 'staff' ? 'utente_id' : 'giocatore_id'
    setEditSelIds(membriRaw.map((m: any) => m[fk]).filter(Boolean))
    setLoadingEdit(false)
  }

  const salvaEdit = async () => {
    if (!modalEdit) return
    const fk       = modalEdit.tipo === 'staff' ? 'utente_id' : 'giocatore_id'
    const correnti = editMembri.map((m: any) => m[fk] as string).filter(Boolean)
    const aggiungi = editSelIds.filter(id => !correnti.includes(id))
    const rimuovi  = correnti.filter(id => !editSelIds.includes(id))

    if (aggiungi.length > 0) {
      await fetch(`/api/gruppi/${modalEdit.id}/membri`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: aggiungi.map(id => ({ fk, id })) }),
      })
    }
    if (rimuovi.length > 0) {
      await fetch(`/api/gruppi/${modalEdit.id}/membri`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fk, ids: rimuovi }),
      })
    }
    ok(`Gruppo aggiornato — ${editSelIds.length} membri`)
    setModalEdit(null); setEditSelIds([]); setCercaEdit('')
    loadAll()
  }

  /* ── Export CSV ──────────────────────────────────────────────────────── */
  const esportaCSV = (g: Gruppo) => {
    const membriGruppo = membri.filter(() => gruppoSel?.id === g.id)
    const header = 'Cognome,Nome,Ruolo,Maglia,Ruolo nel gruppo,Ingresso'
    const rows = membriGruppo.map(m => {
      const p = personaDi(m) as any
      return [
        p?.cognome ?? '', p?.nome ?? '',
        (p as any)?.ruolo_principale ?? (p as any)?.ruolo ?? '',
        (p as any)?.numero_maglia ?? '',
        m.ruolo_nel_gruppo ?? '',
        m.data_ingresso ? new Date(m.data_ingresso).toLocaleDateString('it-IT') : '',
      ].map(v => `"${v}"`).join(',')
    })
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `gruppo-${g.nome.replace(/\s+/g, '-')}.csv`; a.click()
  }

  /* ══ VISTA DETTAGLIO GRUPPO ══════════════════════════════════════════════ */
  if (gruppoSel) {
    const staf = isStaff(gruppoSel)
    const membriVis = membri.map(m => ({ ...m, persona: personaDi(m) }))

    const fkCol    = staf ? 'utente_id' : 'giocatore_id'
    const presenti = new Set(membri.map(m => (m as any)[fkCol]).filter(Boolean))
    const listaAdd = (staf ? staff : giocatori).filter(p =>
      !presenti.has(p.id) &&
      (cercaAdd === '' || `${p.cognome} ${p.nome}`.toLowerCase().includes(cercaAdd.toLowerCase()))
    )

    return (
      <div>
        <button onClick={() => { setGruppoSel(null); setMembri([]) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grigio-4)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0 }}>
          ← Tutti i gruppi
        </button>

        <PageHeader
          title={gruppoSel.nome}
          subtitle={`${gruppoSel.tipo} · Stagione ${gruppoSel.stagione} · ${membriVis.length} membri`}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => esportaCSV(gruppoSel)}>Export CSV</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setModalAdd(true); setSelIds([]); setRuoloAdd(''); setCercaAdd('') }}>
                + Aggiungi {staf ? 'staff' : 'giocatori'}
              </button>
            </div>
          }
        />

        <div className="card" style={{ overflow: 'hidden' }}>
          {loadingMembri ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
          ) : membriVis.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessun membro in questo gruppo
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm"
                  onClick={() => { setModalAdd(true); setSelIds([]); setRuoloAdd(''); setCercaAdd('') }}>
                  + Aggiungi il primo membro
                </button>
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Atleta', 'Ruolo', 'Maglia', 'Ruolo nel gruppo', 'Ingresso', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-4)', borderBottom: '1px solid var(--border-solid)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membriVis.map(m => {
                  const p     = m.persona as any
                  const ruolo = p ? (staf ? p.ruolo : p.ruolo_principale) ?? '—' : '—'
                  const maglia = !staf && p?.numero_maglia ? `#${p.numero_maglia}` : '—'
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(200,240,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                            {p?.nome?.[0]}{p?.cognome?.[0]}
                          </div>
                          {p ? `${p.cognome} ${p.nome}` : <span style={{ color: 'var(--grigio-4)', fontStyle: 'italic', fontWeight: 400 }}>ID: {m.giocatore_id ?? m.utente_id}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grigio-3)' }}>{ruolo}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{maglia}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grigio-3)' }}>{m.ruolo_nel_gruppo ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {m.data_ingresso ? new Date(m.data_ingresso).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => rimuoviMembro(m.id)}
                          style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 2, cursor: 'pointer', color: 'var(--rosso)' }}>
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <Modal open={modalAdd} onClose={() => setModalAdd(false)}
          title={`Aggiungi ${staf ? 'staff' : 'giocatori'}`} width={500}>
          <div>
            <input className="input" placeholder="Cerca..." value={cercaAdd}
              onChange={e => setCercaAdd(e.target.value)}
              style={{ marginBottom: 10 }} />
            <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--border-solid)', borderRadius: 4, marginBottom: 12 }}>
              {listaAdd.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--grigio-4)' }}>
                  {cercaAdd ? 'Nessun risultato' : 'Tutti già nel gruppo'}
                </div>
              ) : listaAdd.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selIds.includes(p.id) ? 'rgba(200,240,0,0.06)' : 'transparent' }}>
                  <input type="checkbox" checked={selIds.includes(p.id)}
                    onChange={e => setSelIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))}
                    style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13, flex: 1 }}>{p.cognome} {p.nome}</span>
                  <span style={{ fontSize: 11, color: 'var(--grigio-4)' }}>
                    {(p as any).ruolo_principale ?? (p as any).ruolo ?? ''}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Ruolo nel gruppo (opzionale)</label>
              <input className="input" value={ruoloAdd} onChange={e => setRuoloAdd(e.target.value)} placeholder="Es. Capitano, Portiere..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{selIds.length} selezionati</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setModalAdd(false)}>Annulla</button>
                <button className="btn btn-primary btn-sm" onClick={aggiungiMembri} disabled={selIds.length === 0}>
                  Aggiungi {selIds.length > 0 ? `(${selIds.length})` : ''}
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      </div>
    )
  }

  /* ══ VISTA LISTA GRUPPI ══════════════════════════════════════════════════ */
  const stagCorrente = stagioneCorrente()

  return (
    <div>
      <PageHeader
        title="Gruppi"
        subtitle="Squadre, categorie e gruppi di giocatori"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={creaGruppiDefault} disabled={creatingDef}>
              {creatingDef ? '⏳ Elaborazione...' : 'Crea gruppi default ⚡'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setDrawerNew(true)}>+ Nuovo gruppo</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Gruppi totali" value={gruppi.length} />
        <StatCard label="Gruppi attivi" value={gruppi.filter(g => g.attivo).length} color="var(--verde)" />
        <StatCard label="Stagione corrente" value={gruppi.filter(g => g.stagione === stagCorrente).length} />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
      ) : gruppi.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--grigio-4)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏟️</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)', marginBottom: 8 }}>
            Nessun gruppo
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            Crea i gruppi default FIGC con assegnazione automatica per anno di nascita, oppure crea un gruppo manualmente.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={creaGruppiDefault} disabled={creatingDef}>
              {creatingDef ? '⏳ Elaborazione...' : 'Crea gruppi default ⚡'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setDrawerNew(true)}>+ Nuovo gruppo</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {gruppi.map(g => {
            const cat    = FIGC.find(c => c.nome === g.nome)
            const refAnn = annoStagione()
            return (
              <div key={g.id} className="card" style={{ overflow: 'hidden', opacity: g.attivo ? 1 : 0.55 }}>
                <div style={{ height: 4, background: g.colore }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--white)' }}>
                      {g.nome}
                    </div>
                    <span className="badge badge-grigio" style={{ fontSize: 10 }}>{g.tipo}</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)', marginBottom: 4 }}>
                    Stagione {g.stagione}
                  </div>
                  {cat && cat.etaMin >= 0 && (
                    <div style={{ fontSize: 10, color: g.colore, fontFamily: 'var(--font-mono)', marginBottom: 6, opacity: 0.85 }}>
                      nati {cat.etaMax === -1 ? `≤ ${refAnn - cat.etaMin}` : `${refAnn - cat.etaMax}–${refAnn - cat.etaMin}`}
                    </div>
                  )}
                  {g.descrizione && (
                    <p style={{ fontSize: 12, color: 'var(--grigio-3)', marginBottom: 12, lineHeight: 1.5 }}>{g.descrizione}</p>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                      onClick={() => { setGruppoSel(g); loadMembri(g.id) }}>
                      Vedi →
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => apriEdit(g)}>
                      ✎ Modifica
                    </button>
                    <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => toggleAttivo(g)}>
                      {g.attivo ? 'Disattiva' : 'Attiva'}
                    </button>
                    <button className="btn btn-sm" style={{ fontSize: 11, color: 'var(--rosso)', borderColor: 'rgba(239,68,68,0.3)' }}
                      onClick={() => eliminaGruppo(g)}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!modalEdit} onClose={() => { setModalEdit(null); setEditSelIds([]); setCercaEdit('') }}
        title={`Modifica membri — ${modalEdit?.nome ?? ''}`} width={520}>
        <div>
          {loadingEdit ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento…</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--grigio-3)', marginBottom: 10 }}>
                Seleziona i {modalEdit?.tipo === 'staff' ? 'membri dello staff' : 'giocatori'} da includere nel gruppo.
              </div>
              <input className="input" placeholder="Cerca..." value={cercaEdit}
                onChange={e => setCercaEdit(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border-solid)', borderRadius: 4, marginBottom: 14 }}>
                {(modalEdit?.tipo === 'staff' ? staff : giocatori)
                  .filter(p => cercaEdit === '' || `${p.cognome} ${p.nome}`.toLowerCase().includes(cercaEdit.toLowerCase()))
                  .map(p => {
                    const checked = editSelIds.includes(p.id)
                    const g = p as Giocatore
                    const eta = g.data_nascita ? annoStagione() - new Date(g.data_nascita).getFullYear() : null
                    return (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: checked ? 'rgba(200,240,0,0.06)' : 'transparent' }}>
                        <input type="checkbox" checked={checked}
                          onChange={e => setEditSelIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))}
                          style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? 'var(--white)' : 'var(--grigio-2)' }}>
                            {p.cognome} {p.nome}
                          </span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--grigio-4)' }}>
                            {(p as any).ruolo_principale ?? (p as any).ruolo ?? ''}
                          </span>
                        </div>
                        {eta !== null && (
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grigio-4)' }}>
                            {eta}a
                          </span>
                        )}
                      </label>
                    )
                  })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{editSelIds.length} selezionati</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-sm" onClick={() => { setModalEdit(null); setEditSelIds([]) }}>Annulla</button>
                  <button className="btn btn-primary btn-sm" onClick={salvaEdit}>Salva</button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Drawer open={drawerNew} onClose={() => setDrawerNew(false)} title="Nuovo gruppo" width={480}>
        <form onSubmit={creaNuovoGruppo}>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Nome *</label>
            <input className="input" value={nNome} onChange={e => setNNome(e.target.value)} placeholder="Es. Prima Squadra" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginBottom: 14 }}>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={nTipo} onChange={e => setNTipo(e.target.value)}>
                <option value="squadra">Squadra</option>
                <option value="categoria">Categoria</option>
                <option value="staff">Staff</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="label">Stagione</label>
              <input className="input" value={nStagione} onChange={e => setNStagione(e.target.value)} placeholder={stagCorrente} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Colore</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={nColore} onChange={e => setNColore(e.target.value)}
                style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--grigio-3)' }}>{nColore}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#c8f000','#00c8a0','#388bfd','#ff9900','#aa88ff','#ff4444'].map(c => (
                  <button key={c} type="button" onClick={() => setNColore(c)}
                    style={{ width: 20, height: 20, background: c, border: nColore === c ? '2px solid white' : 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="label">Descrizione</label>
            <textarea className="input" rows={2} value={nDesc} onChange={e => setNDesc(e.target.value)} placeholder="Descrizione del gruppo..." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => setDrawerNew(false)}>Annulla</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : 'Crea gruppo'}</button>
          </div>
        </form>
      </Drawer>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
