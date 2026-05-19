'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatEuro } from '@/lib/helpers'
import { matchSearch } from '@/lib/search'

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

type Fornitore = {
  id: string
  tipo: 'fornitore' | 'cliente' | 'entrambi'
  nome: string
  ragione_sociale: string | null
  piva: string | null
  codice_fiscale: string | null
  email: string | null
  telefono: string | null
  pec: string | null
  sdi: string | null
  indirizzo: string | null
  citta: string | null
  cap: string | null
  provincia: string | null
  categoria: string | null
  iban: string | null
  bic: string | null
  note: string | null
  attivo: boolean
}

type Pagamento = {
  id: string
  fornitore_id: string
  descrizione: string
  importo: number
  tipo: 'entrata' | 'uscita'
  data_scadenza: string | null
  data_pagamento: string | null
  stato: 'da_pagare' | 'pagato' | 'scaduto' | 'annullato'
  numero_fattura: string | null
  note: string | null
}

const CATEGORIE_FORNITORE: { key: string; label: string }[] = [
  { key: 'materiale_sportivo', label: 'Materiale sportivo' },
  { key: 'servizi',            label: 'Servizi' },
  { key: 'strutture',          label: 'Strutture/Impianti' },
  { key: 'comunicazione',      label: 'Comunicazione' },
  { key: 'legale',             label: 'Legale' },
  { key: 'commercialista',     label: 'Commercialista' },
  { key: 'altro',              label: 'Altro' },
]

const TIPO_LABEL: Record<string, string> = { fornitore: 'Fornitore', cliente: 'Cliente', entrambi: 'F+C' }
const TIPO_COLOR: Record<string, string> = { fornitore: 'var(--accent)', cliente: 'var(--verde)', entrambi: '#88aaff' }
const STATO_LABEL: Record<string, string> = { da_pagare: 'Da pagare', pagato: 'Pagato', scaduto: 'Scaduto', annullato: 'Annullato' }
const STATO_COLOR: Record<string, string> = { da_pagare: 'var(--accent)', pagato: 'var(--verde)', scaduto: 'var(--rosso)', annullato: 'var(--gray)' }

const EMPTY_FC: Omit<Fornitore, 'id' | 'attivo'> = {
  tipo: 'fornitore', nome: '', ragione_sociale: null, piva: null, codice_fiscale: null,
  email: null, telefono: null, pec: null, sdi: null, indirizzo: null, citta: null,
  cap: null, provincia: null, categoria: 'altro', iban: null, bic: null, note: null,
}

const EMPTY_PAG: Omit<Pagamento, 'id' | 'fornitore_id'> = {
  descrizione: '', importo: 0, tipo: 'uscita', data_scadenza: null, data_pagamento: null,
  stato: 'da_pagare', numero_fattura: null, note: null,
}

export default function FornitoriPage() {
  const supabase = createClient()
  const [clubId,     setClubId]     = useState<string | null>(null)
  const [tab,        setTab]        = useState<'fornitori' | 'pagamenti'>('fornitori')
  const [filtroTipo, setFiltroTipo] = useState<'tutti' | 'fornitore' | 'cliente' | 'entrambi'>('tutti')
  const [search,     setSearch]     = useState('')
  const [fornitori,  setFornitori]  = useState<Fornitore[]>([])
  const [pagamenti,  setPagamenti]  = useState<Pagamento[]>([])
  const [selected,   setSelected]   = useState<Fornitore | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  // Drawer state
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [drawerMode,   setDrawerMode]   = useState<'nuovo' | 'modifica'>('nuovo')
  const [form,         setForm]         = useState<Omit<Fornitore, 'id' | 'attivo'>>(EMPTY_FC)

  // Pagamento modal
  const [pagModal,     setPagModal]     = useState(false)
  const [pagForm,      setPagForm]      = useState<Omit<Pagamento, 'id' | 'fornitore_id'>>(EMPTY_PAG)
  const [editPag,      setEditPag]      = useState<string | null>(null) // id pagamento in edit
  const [pagFornitore, setPagFornitore] = useState<string>('') // fornitore_id per il pagamento

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!u) return
      setClubId(u.club_id)
      await reload(u.club_id)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = async (cid: string) => {
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from('fornitori_clienti').select('*').eq('club_id', cid).eq('attivo', true).order('nome'),
      supabase.from('pagamenti_fornitore').select('*').eq('club_id', cid).order('data_scadenza', { ascending: true }),
    ])
    setFornitori(f ?? [])
    setPagamenti(p ?? [])
  }

  const openNuovo = () => {
    setForm(EMPTY_FC)
    setDrawerMode('nuovo')
    setDrawerOpen(true)
  }

  const openModifica = (f: Fornitore) => {
    const { id, attivo, ...rest } = f
    setForm(rest)
    setDrawerMode('modifica')
    setSelected(f)
    setDrawerOpen(true)
  }

  const salva = async () => {
    if (!clubId || !form.nome.trim()) return
    setSaving(true)
    setSaveError(null)
    let error
    if (drawerMode === 'nuovo') {
      ;({ error } = await supabase.from('fornitori_clienti').insert({ ...form, club_id: clubId, attivo: true }))
    } else if (selected) {
      ;({ error } = await supabase.from('fornitori_clienti').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    await reload(clubId)
    setDrawerOpen(false)
  }

  const archivia = async (id: string) => {
    if (!clubId || !confirm('Archiviare questo fornitore/cliente?')) return
    await supabase.from('fornitori_clienti').update({ attivo: false }).eq('id', id).eq('club_id', clubId)
    await reload(clubId)
    if (selected?.id === id) setSelected(null)
  }

  const salvaPagamento = async () => {
    if (!clubId || !pagFornitore || !pagForm.descrizione.trim()) return
    setSaving(true)
    setSaveError(null)
    let error
    if (editPag) {
      ;({ error } = await supabase.from('pagamenti_fornitore').update(pagForm).eq('id', editPag).eq('club_id', clubId))
    } else {
      ;({ error } = await supabase.from('pagamenti_fornitore').insert({ ...pagForm, club_id: clubId, fornitore_id: pagFornitore }))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    await reload(clubId)
    setPagModal(false)
    setEditPag(null)
  }

  const filtratiF = useMemo(() => {
    let list = fornitori
    if (filtroTipo !== 'tutti') list = list.filter(f => f.tipo === filtroTipo)
    if (search.trim()) list = list.filter(f => matchSearch(search, f.nome, f.ragione_sociale, f.piva, f.codice_fiscale))
    return list
  }, [fornitori, filtroTipo, search])

  const pagFiltrati = useMemo(() => {
    if (selected) return pagamenti.filter(p => p.fornitore_id === selected.id)
    return pagamenti
  }, [pagamenti, selected])

  const totDaPagare = pagamenti.filter(p => p.stato === 'da_pagare' && p.tipo === 'uscita').reduce((s, p) => s + p.importo, 0)
  const totDaIncassare = pagamenti.filter(p => p.stato === 'da_pagare' && p.tipo === 'entrata').reduce((s, p) => s + p.importo, 0)
  const scaduti = pagamenti.filter(p => p.stato !== 'pagato' && p.stato !== 'annullato' && p.data_scadenza && new Date(p.data_scadenza) < new Date()).length

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--gray)' }}>Caricamento...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4 }}>
            Fornitori & Clienti
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 300 }}>{fornitori.length} soggetti · {pagamenti.length} movimenti</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setPagFornitore(''); setPagForm(EMPTY_PAG); setEditPag(null); setPagModal(true) }}
            className="btn btn-secondary btn-sm"
          >
            + Movimento
          </button>
          <button onClick={openNuovo} className="btn btn-primary btn-sm">
            + Nuovo
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Fornitori',    v: fornitori.filter(f => f.tipo !== 'cliente').length, color: 'var(--accent)' },
          { label: 'Clienti',      v: fornitori.filter(f => f.tipo !== 'fornitore').length, color: 'var(--verde)' },
          { label: 'Da pagare',    v: formatEuro(totDaPagare), color: 'var(--rosso)' },
          { label: 'Da incassare', v: formatEuro(totDaIncassare), color: 'var(--verde)' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className="stat-label">{k.label}</div>
            <div className="stat-value" style={{ color: k.color, fontSize: 20 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {scaduti > 0 && (
        <div style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: 13, color: 'var(--rosso)', marginBottom: 16 }}>
          ⚠ {scaduti} pagament{scaduti === 1 ? 'o scaduto' : 'i scaduti'} — verificare la prima nota
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-solid)', marginBottom: 16 }}>
        {(['fornitori', 'pagamenti'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 20px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            color: tab === t ? 'var(--accent)' : 'var(--gray)', fontSize: 13, fontWeight: tab === t ? 700 : 400,
            textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', transition: 'color 0.15s',
          }}>
            {t === 'fornitori' ? `Soggetti (${fornitori.length})` : `Movimenti (${pagamenti.length})`}
          </button>
        ))}
      </div>

      {tab === 'fornitori' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..." style={{ maxWidth: 220 }} />
            {(['tutti', 'fornitore', 'cliente', 'entrambi'] as const).map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)} style={{
                padding: '6px 12px', borderRadius: 2, fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid',
                background:   filtroTipo === t ? 'var(--accent)' : 'transparent',
                borderColor:  filtroTipo === t ? 'var(--accent)' : 'var(--border-solid)',
                color:        filtroTipo === t ? '#000' : 'var(--gray)',
              }}>
                {t === 'tutti' ? 'Tutti' : TIPO_LABEL[t]}
              </button>
            ))}
          </div>

          {filtratiF.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 6 }}>Nessun soggetto</div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>Aggiungi il primo fornitore o cliente.</div>
              <button onClick={openNuovo} className="btn btn-primary btn-sm">+ Aggiungi</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtratiF.map(f => {
              const pag = pagamenti.filter(p => p.fornitore_id === f.id)
              const daPagare = pag.filter(p => p.stato === 'da_pagare').reduce((s, p) => s + (p.tipo === 'uscita' ? p.importo : -p.importo), 0)
              return (
                <div key={f.id} style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 2, background: 'rgba(200,240,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: 'var(--accent)', flexShrink: 0 }}>
                    {f.nome[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)' }}>{f.nome}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: TIPO_COLOR[f.tipo], background: `${TIPO_COLOR[f.tipo]}18`, padding: '2px 6px', borderRadius: 2 }}>
                        {TIPO_LABEL[f.tipo]}
                      </span>
                      {f.categoria && f.categoria !== 'altro' && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--gray)' }}>
                          {CATEGORIE_FORNITORE.find(c => c.key === f.categoria)?.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {f.email && <span>✉ {f.email}</span>}
                      {f.telefono && <span>📞 {f.telefono}</span>}
                      {f.citta && <span>📍 {f.citta}</span>}
                    </div>
                  </div>
                  {daPagare !== 0 && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: daPagare > 0 ? 'var(--rosso)' : 'var(--verde)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {daPagare > 0 ? '−' : '+'}{formatEuro(Math.abs(daPagare))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { setSelected(selected?.id === f.id ? null : f) }} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, cursor: 'pointer' }}>
                      {selected?.id === f.id ? '▲' : '▼'}
                    </button>
                    <button onClick={() => openModifica(f)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, cursor: 'pointer' }}>
                      Modifica
                    </button>
                    <button onClick={() => archivia(f.id)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, cursor: 'pointer' }}>
                      Archivia
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Expandable detail del fornitore selezionato */}
          {selected && (
            <div style={{ marginTop: 16, background: '#0d0d0d', border: '1px solid var(--accent)', borderRadius: 2, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: 'var(--accent)' }}>
                  {selected.nome} — Movimenti
                </div>
                <button
                  onClick={() => { setPagFornitore(selected.id); setPagForm(EMPTY_PAG); setEditPag(null); setPagModal(true) }}
                  style={{ padding: '6px 14px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 2, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Movimento
                </button>
              </div>
              {pagFiltrati.length === 0 && <div style={{ fontSize: 13, color: 'var(--gray)' }}>Nessun movimento registrato.</div>}
              {pagFiltrati.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-solid)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATO_COLOR[p.stato], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--white)' }}>{p.descrizione}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                      {p.numero_fattura && `Fatt. ${p.numero_fattura} · `}
                      {p.data_scadenza && `Scad. ${new Date(p.data_scadenza).toLocaleDateString('it-IT')}`}
                      {p.data_pagamento && ` · Pag. ${new Date(p.data_pagamento).toLocaleDateString('it-IT')}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.tipo === 'uscita' ? 'var(--rosso)' : 'var(--verde)', fontFamily: 'var(--font-mono)' }}>
                    {p.tipo === 'uscita' ? '−' : '+'}{formatEuro(p.importo)}
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: STATO_COLOR[p.stato], background: `${STATO_COLOR[p.stato]}18`, padding: '2px 8px', borderRadius: 2 }}>
                    {STATO_LABEL[p.stato]}
                  </span>
                  <button
                    onClick={async () => {
                      const newStato = p.stato === 'da_pagare' ? 'pagato' : 'da_pagare'
                      const updates: Record<string, unknown> = { stato: newStato }
                      if (newStato === 'pagato') updates.data_pagamento = new Date().toISOString().split('T')[0]
                      await supabase.from('pagamenti_fornitore').update(updates).eq('id', p.id).eq('club_id', clubId)
                      if (clubId) await reload(clubId)
                    }}
                    style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                  >
                    {p.stato === 'pagato' ? 'Riapri' : '✓ Paga'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'pagamenti' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pagamenti.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 6 }}>Nessun movimento</div>
              </div>
            )}
            {pagamenti.map(p => {
              const f = fornitori.find(x => x.id === p.fornitore_id)
              return (
                <div key={p.id} style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATO_COLOR[p.stato], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--white)' }}>{p.descrizione}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                      {f && <span style={{ marginRight: 8 }}>{f.nome}</span>}
                      {p.data_scadenza && `Scad. ${new Date(p.data_scadenza).toLocaleDateString('it-IT')}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.tipo === 'uscita' ? 'var(--rosso)' : 'var(--verde)', fontFamily: 'var(--font-mono)' }}>
                    {p.tipo === 'uscita' ? '−' : '+'}{formatEuro(p.importo)}
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: STATO_COLOR[p.stato], background: `${STATO_COLOR[p.stato]}18`, padding: '2px 8px', borderRadius: 2 }}>
                    {STATO_LABEL[p.stato]}
                  </span>
                  <button
                    onClick={() => { setPagFornitore(p.fornitore_id); setPagForm({ descrizione: p.descrizione, importo: p.importo, tipo: p.tipo, data_scadenza: p.data_scadenza, data_pagamento: p.data_pagamento, stato: p.stato, numero_fattura: p.numero_fattura, note: p.note }); setEditPag(p.id); setPagModal(true) }}
                    style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 10, cursor: 'pointer' }}
                  >
                    Modifica
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Drawer Fornitore */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 900, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setDrawerOpen(false)}>
          <div style={{ width: 420, background: '#111', borderLeft: '1px solid var(--border-solid)', height: '100%', overflowY: 'auto', padding: '24px 24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--white)' }}>
                {drawerMode === 'nuovo' ? 'Nuovo Soggetto' : 'Modifica'}
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <F label="Tipo *">
              <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as any }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                <option value="fornitore">Fornitore</option>
                <option value="cliente">Cliente</option>
                <option value="entrambi">Entrambi (F+C)</option>
              </select>
            </F>
            <F label="Nome / Denominazione *">
              <input className="input" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome o ragione sociale" />
            </F>
            <F label="Ragione sociale">
              <input className="input" value={form.ragione_sociale ?? ''} onChange={e => setForm(p => ({ ...p, ragione_sociale: e.target.value || null }))} />
            </F>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="P.IVA"><input className="input" value={form.piva ?? ''} onChange={e => setForm(p => ({ ...p, piva: e.target.value || null }))} /></F>
              <F label="Cod. Fiscale"><input className="input" value={form.codice_fiscale ?? ''} onChange={e => setForm(p => ({ ...p, codice_fiscale: e.target.value || null }))} /></F>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Email"><input className="input" type="email" value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value || null }))} /></F>
              <F label="Telefono"><input className="input" value={form.telefono ?? ''} onChange={e => setForm(p => ({ ...p, telefono: e.target.value || null }))} /></F>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="PEC"><input className="input" value={form.pec ?? ''} onChange={e => setForm(p => ({ ...p, pec: e.target.value || null }))} /></F>
              <F label="SDI/CodDest"><input className="input" value={form.sdi ?? ''} onChange={e => setForm(p => ({ ...p, sdi: e.target.value || null }))} /></F>
            </div>
            <F label="Categoria">
              <select className="input" value={form.categoria ?? 'altro'} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                {CATEGORIE_FORNITORE.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </F>
            <F label="Indirizzo"><input className="input" value={form.indirizzo ?? ''} onChange={e => setForm(p => ({ ...p, indirizzo: e.target.value || null }))} /></F>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
              <F label="Città"><input className="input" value={form.citta ?? ''} onChange={e => setForm(p => ({ ...p, citta: e.target.value || null }))} /></F>
              <F label="CAP"><input className="input" value={form.cap ?? ''} onChange={e => setForm(p => ({ ...p, cap: e.target.value || null }))} /></F>
              <F label="Prov."><input className="input" value={form.provincia ?? ''} maxLength={2} onChange={e => setForm(p => ({ ...p, provincia: e.target.value.toUpperCase() || null }))} /></F>
            </div>
            <F label="IBAN"><input className="input" value={form.iban ?? ''} onChange={e => setForm(p => ({ ...p, iban: e.target.value || null }))} /></F>
            <F label="Note"><textarea className="input" rows={2} value={form.note ?? ''} onChange={e => setForm(p => ({ ...p, note: e.target.value || null }))} /></F>

            {saveError && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 2, fontSize: 12, color: 'var(--rosso)', fontFamily: 'var(--font-mono)' }}>
                Errore: {saveError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setDrawerOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Annulla</button>
              <button onClick={salva} disabled={saving || !form.nome.trim()} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {pagModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, width: '100%', maxWidth: 480 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)' }}>
                {editPag ? 'Modifica Movimento' : 'Nuovo Movimento'}
              </div>
              <button onClick={() => { setPagModal(false); setEditPag(null) }} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '18px 20px' }}>
              {!editPag && (
                <F label="Fornitore/Cliente *">
                  <select className="input" value={pagFornitore} onChange={e => setPagFornitore(e.target.value)} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                    <option value="">— Seleziona —</option>
                    {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </F>
              )}
              <F label="Descrizione *">
                <input className="input" value={pagForm.descrizione} onChange={e => setPagForm(p => ({ ...p, descrizione: e.target.value }))} placeholder="es. Fattura materiale sportivo" />
              </F>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Importo €">
                  <input className="input" type="number" min="0" step="0.01" value={pagForm.importo || ''} onChange={e => setPagForm(p => ({ ...p, importo: parseFloat(e.target.value) || 0 }))} />
                </F>
                <F label="Tipo">
                  <select className="input" value={pagForm.tipo} onChange={e => setPagForm(p => ({ ...p, tipo: e.target.value as any }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                    <option value="uscita">Uscita (da pagare)</option>
                    <option value="entrata">Entrata (da incassare)</option>
                  </select>
                </F>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Scadenza">
                  <input className="input" type="date" value={pagForm.data_scadenza ?? ''} onChange={e => setPagForm(p => ({ ...p, data_scadenza: e.target.value || null }))} />
                </F>
                <F label="Stato">
                  <select className="input" value={pagForm.stato} onChange={e => setPagForm(p => ({ ...p, stato: e.target.value as any }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                    {Object.entries(STATO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </F>
              </div>
              {pagForm.stato === 'pagato' && (
                <F label="Data pagamento">
                  <input className="input" type="date" value={pagForm.data_pagamento ?? ''} onChange={e => setPagForm(p => ({ ...p, data_pagamento: e.target.value || null }))} />
                </F>
              )}
              <F label="N. Fattura">
                <input className="input" value={pagForm.numero_fattura ?? ''} onChange={e => setPagForm(p => ({ ...p, numero_fattura: e.target.value || null }))} placeholder="es. 2024/001" />
              </F>
              <F label="Note">
                <textarea className="input" rows={2} value={pagForm.note ?? ''} onChange={e => setPagForm(p => ({ ...p, note: e.target.value || null }))} />
              </F>
              {saveError && (
                <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 2, fontSize: 12, color: 'var(--rosso)', fontFamily: 'var(--font-mono)' }}>
                  Errore: {saveError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => { setPagModal(false); setEditPag(null) }} className="btn btn-secondary" style={{ flex: 1 }}>Annulla</button>
                <button onClick={salvaPagamento} disabled={saving || !pagForm.descrizione.trim() || !pagFornitore} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
