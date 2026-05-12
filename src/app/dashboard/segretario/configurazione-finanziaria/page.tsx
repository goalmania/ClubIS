'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatEuro } from '@/lib/helpers'

type Conto = {
  id: string
  nome: string
  iban: string | null
  intestatario: string | null
  banca: string | null
  filiale: string | null
  bic: string | null
  predefinito: boolean
  saldo_iniziale: number
  attivo: boolean
}

type Causale = {
  id: string
  codice: string
  descrizione: string
  tipo: 'entrata' | 'uscita' | 'entrambi'
  categoria_contabile: string | null
  attivo: boolean
}

type Categoria = {
  id: string
  codice: string
  descrizione: string
  tipo: 'entrata' | 'uscita'
  is_sistema: boolean
  attivo: boolean
}

type PrimaNota = {
  tipo: 'entrata' | 'uscita'
  importo: number
  categoria: string | null
  data: string
  stornato: boolean | null
}

const EMPTY_CONTO: Omit<Conto, 'id' | 'attivo'> = { nome: '', iban: null, intestatario: null, banca: null, filiale: null, bic: null, predefinito: false, saldo_iniziale: 0 }
const EMPTY_CAUSALE: Omit<Causale, 'id' | 'attivo'> = { codice: '', descrizione: '', tipo: 'entrambi', categoria_contabile: null }

// ── Componente field wrapper ── definito a livello modulo per evitare
// che venga ricreato come nuovo tipo ad ogni re-render del parent,
// il che causerebbe la perdita di focus sugli input durante la digitazione.
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function ConfigurazioneFinanziariaPage() {
  const supabase = createClient()
  const [clubId,     setClubId]     = useState<string | null>(null)
  const [tab,        setTab]        = useState<'conti' | 'causali' | 'categorie' | 'report'>('conti')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [errore,     setErrore]     = useState<string | null>(null)

  const [conti,      setConti]      = useState<Conto[]>([])
  const [causali,    setCausali]    = useState<Causale[]>([])
  const [categorie,  setCategorie]  = useState<Categoria[]>([])
  const [primaNota,  setPrimaNota]  = useState<PrimaNota[]>([])

  // Drawer / Modal state
  const [contoOpen,   setContoOpen]   = useState(false)
  const [contoMode,   setContoMode]   = useState<'nuovo' | 'modifica'>('nuovo')
  const [contoForm,   setContoForm]   = useState<Omit<Conto, 'id' | 'attivo'>>(EMPTY_CONTO)
  const [contoId,     setContoId]     = useState<string | null>(null)

  const [causaleOpen,  setCausaleOpen]  = useState(false)
  const [causaleMode,  setCausaleMode]  = useState<'nuovo' | 'modifica'>('nuovo')
  const [causaleForm,  setCausaleForm]  = useState<Omit<Causale, 'id' | 'attivo'>>(EMPTY_CAUSALE)
  const [causaleId,    setCausaleId]    = useState<string | null>(null)

  // Report filters
  const [reportAnno,  setReportAnno]  = useState(new Date().getFullYear().toString())
  const [reportTipo,  setReportTipo]  = useState<'entrambi' | 'entrata' | 'uscita'>('entrambi')

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
    const [{ data: cn }, { data: ca }, { data: cat }, { data: pn }] = await Promise.all([
      supabase.from('conti_corrente').select('*').eq('club_id', cid).eq('attivo', true).order('predefinito', { ascending: false }),
      supabase.from('causali_pagamento').select('*').eq('club_id', cid).eq('attivo', true).order('codice'),
      supabase.from('categorie_contabili').select('*').or(`club_id.is.null,club_id.eq.${cid}`).eq('attivo', true).order('ordine'),
      supabase.from('prima_nota').select('tipo, importo, categoria, data, stornato').eq('club_id', cid),
    ])
    setConti(cn ?? [])
    setCausali(ca ?? [])
    setCategorie(cat ?? [])
    setPrimaNota(pn ?? [])
  }

  // ── Conti ──
  const salvaConto = async () => {
    if (!clubId || !contoForm.nome.trim()) return
    setSaving(true)
    setErrore(null)
    let err: { message: string } | null = null

    if (contoMode === 'nuovo') {
      if (contoForm.predefinito) await supabase.from('conti_corrente').update({ predefinito: false }).eq('club_id', clubId)
      const { error } = await supabase.from('conti_corrente').insert({ ...contoForm, club_id: clubId, attivo: true })
      err = error
    } else if (contoId) {
      if (contoForm.predefinito) await supabase.from('conti_corrente').update({ predefinito: false }).eq('club_id', clubId)
      const { error } = await supabase.from('conti_corrente').update(contoForm).eq('id', contoId)
      err = error
    }

    if (err) {
      setErrore(err.message)
      setSaving(false)
      return
    }

    await reload(clubId)
    setSaving(false)
    setContoOpen(false)
  }

  const eliminaConto = async (id: string) => {
    if (!clubId || !confirm('Eliminare questo conto corrente?')) return
    await supabase.from('conti_corrente').update({ attivo: false }).eq('id', id)
    await reload(clubId)
  }

  // ── Causali ──
  const salvaCausale = async () => {
    if (!clubId || !causaleForm.codice.trim() || !causaleForm.descrizione.trim()) return
    setSaving(true)
    setErrore(null)
    let err: { message: string } | null = null

    if (causaleMode === 'nuovo') {
      const { error } = await supabase.from('causali_pagamento').insert({ ...causaleForm, club_id: clubId, attivo: true })
      err = error
    } else if (causaleId) {
      const { error } = await supabase.from('causali_pagamento').update(causaleForm).eq('id', causaleId)
      err = error
    }

    if (err) {
      setErrore(err.message)
      setSaving(false)
      return
    }

    await reload(clubId)
    setSaving(false)
    setCausaleOpen(false)
  }

  const eliminaCausale = async (id: string) => {
    if (!clubId || !confirm('Eliminare questa causale?')) return
    await supabase.from('causali_pagamento').update({ attivo: false }).eq('id', id)
    await reload(clubId)
  }

  // ── Report ──
  const pnAnno = primaNota.filter(p => !p.stornato && p.data?.startsWith(reportAnno))
  const pnFiltered = reportTipo === 'entrambi' ? pnAnno : pnAnno.filter(p => p.tipo === reportTipo)

  const entratePerCat = categorie.filter(c => c.tipo === 'entrata').map(cat => ({
    cat,
    totale: pnAnno.filter(p => p.tipo === 'entrata' && p.categoria === cat.codice).reduce((s, p) => s + p.importo, 0),
  })).filter(x => x.totale > 0)

  const uscitePerCat = categorie.filter(c => c.tipo === 'uscita').map(cat => ({
    cat,
    totale: pnAnno.filter(p => p.tipo === 'uscita' && p.categoria === cat.codice).reduce((s, p) => s + p.importo, 0),
  })).filter(x => x.totale > 0)

  const totEntrate = pnAnno.filter(p => p.tipo === 'entrata').reduce((s, p) => s + p.importo, 0)
  const totUscite  = pnAnno.filter(p => p.tipo === 'uscita').reduce((s, p) => s + p.importo, 0)
  const saldo      = totEntrate - totUscite

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--gray)' }}>Caricamento...</div>

  const anni = Array.from(new Set(primaNota.map(p => p.data?.split('-')[0]).filter(Boolean))).sort().reverse()
  if (!anni.includes(reportAnno)) anni.unshift(reportAnno)

  return (
    <FeatureGate feature="configurazione_finanziaria" featureLabel="Configurazione Finanziaria">
        <div>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4 }}>
              Configurazione Finanziaria
            </h1>
            <p style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 300 }}>
              Conti correnti, causali di pagamento, categorie contabili e report
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-solid)', marginBottom: 20 }}>
            {([
              { key: 'conti',      label: `Conti (${conti.length})` },
              { key: 'causali',    label: `Causali (${causali.length})` },
              { key: 'categorie',  label: `Categorie (${categorie.length})` },
              { key: 'report',     label: 'Report saldo' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '9px 20px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
                color: tab === t.key ? 'var(--accent)' : 'var(--gray)', fontSize: 13,
                fontWeight: tab === t.key ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.06em',
                fontFamily: 'var(--font-mono)', transition: 'color 0.15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB CONTI ── */}
          {tab === 'conti' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button onClick={() => { setContoForm(EMPTY_CONTO); setContoMode('nuovo'); setContoId(null); setContoOpen(true) }} className="btn btn-primary btn-sm">
                  + Nuovo conto
                </button>
              </div>
              {conti.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🏦</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 6 }}>Nessun conto configurato</div>
                  <div style={{ fontSize: 13 }}>Aggiungi il conto corrente del club.</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {conti.map(c => (
                  <div key={c.id} style={{ background: '#111', border: `1px solid ${c.predefinito ? 'var(--accent)' : 'var(--border-solid)'}`, borderLeft: `3px solid ${c.predefinito ? 'var(--accent)' : 'var(--border-solid)'}`, borderRadius: 2, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 24 }}>🏦</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--white)' }}>{c.nome}</span>
                        {c.predefinito && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'rgba(200,240,0,0.1)', padding: '2px 6px', borderRadius: 2 }}>PREDEFINITO</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {c.banca && <span>{c.banca}</span>}
                        {c.iban && <span style={{ fontFamily: 'var(--font-mono)' }}>{c.iban}</span>}
                        {c.intestatario && <span>{c.intestatario}</span>}
                      </div>
                    </div>
                    {c.saldo_iniziale !== 0 && (
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: c.saldo_iniziale >= 0 ? 'var(--verde)' : 'var(--rosso)' }}>
                        {formatEuro(c.saldo_iniziale)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { const { id, attivo, ...rest } = c; setContoForm(rest); setContoMode('modifica'); setContoId(id); setContoOpen(true) }} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, cursor: 'pointer' }}>Modifica</button>
                      <button onClick={() => eliminaConto(c.id)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── TAB CAUSALI ── */}
          {tab === 'causali' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button onClick={() => { setCausaleForm(EMPTY_CAUSALE); setCausaleMode('nuovo'); setCausaleId(null); setCausaleOpen(true) }} className="btn btn-primary btn-sm">
                  + Nuova causale
                </button>
              </div>
              {causali.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🏷</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 6 }}>Nessuna causale</div>
                  <div style={{ fontSize: 13 }}>Crea le causali da usare nella prima nota.</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {causali.map(c => (
                  <div key={c.id} style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(200,240,0,0.1)', padding: '3px 8px', borderRadius: 2, flexShrink: 0 }}>{c.codice}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: 'var(--white)' }}>{c.descrizione}</span>
                      {c.categoria_contabile && (
                        <span style={{ fontSize: 10, color: 'var(--gray)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>→ {c.categoria_contabile}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: c.tipo === 'entrata' ? 'var(--verde)' : c.tipo === 'uscita' ? 'var(--rosso)' : 'var(--gray)', background: c.tipo === 'entrata' ? 'rgba(0,200,100,0.1)' : c.tipo === 'uscita' ? 'rgba(255,60,60,0.1)' : '#1a1a1a', padding: '2px 8px', borderRadius: 2 }}>
                      {c.tipo}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { const { id, attivo, ...rest } = c; setCausaleForm(rest); setCausaleMode('modifica'); setCausaleId(id); setCausaleOpen(true) }} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, cursor: 'pointer' }}>Modifica</button>
                      <button onClick={() => eliminaCausale(c.id)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: 2, color: 'var(--gray)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── TAB CATEGORIE ── */}
          {tab === 'categorie' && (
            <>
              <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
                Le categorie contabili di sistema (A.01–A.10 entrate, B.01–B.11 uscite) seguono lo standard per ASD italiane.
              </p>
              {(['entrata', 'uscita'] as const).map(tipo => {
                const list = categorie.filter(c => c.tipo === tipo)
                if (list.length === 0) return null
                return (
                  <div key={tipo} style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: tipo === 'entrata' ? 'var(--verde)' : 'var(--rosso)', marginBottom: 10 }}>
                      {tipo === 'entrata' ? '▲ Entrate (A)' : '▼ Uscite (B)'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {list.map(cat => (
                        <div key={cat.id} style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: tipo === 'entrata' ? 'var(--verde)' : 'var(--rosso)', width: 40, flexShrink: 0 }}>{cat.codice}</span>
                          <span style={{ fontSize: 13, color: 'var(--white)', flex: 1 }}>{cat.descrizione}</span>
                          {cat.is_sistema && (
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', background: '#1a1a1a', padding: '2px 6px', borderRadius: 2 }}>SISTEMA</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ── TAB REPORT ── */}
          {tab === 'report' && (
            <>
              {/* Filtri */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <label className="label">Anno</label>
                  <select className="input" value={reportAnno} onChange={e => setReportAnno(e.target.value)} style={{ background: '#1a1a1a', color: 'var(--white)', width: 100 }}>
                    {anni.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={reportTipo} onChange={e => setReportTipo(e.target.value as any)} style={{ background: '#1a1a1a', color: 'var(--white)', width: 140 }}>
                    <option value="entrambi">Tutti</option>
                    <option value="entrata">Solo entrate</option>
                    <option value="uscita">Solo uscite</option>
                  </select>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button
                    onClick={() => {
                      const html = generaHTMLReport(reportAnno, entratePerCat, uscitePerCat, totEntrate, totUscite, saldo)
                      const w = window.open('', '_blank', 'width=900,height=700')
                      if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400) }
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    🖨 Stampa report
                  </button>
                </div>
              </div>

              {/* Saldo cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                <div className="stat-card">
                  <div className="stat-label">Totale entrate {reportAnno}</div>
                  <div className="stat-value" style={{ color: 'var(--verde)', fontSize: 20 }}>{formatEuro(totEntrate)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Totale uscite {reportAnno}</div>
                  <div className="stat-value" style={{ color: 'var(--rosso)', fontSize: 20 }}>{formatEuro(totUscite)}</div>
                </div>
                <div className="stat-card" style={{ border: `1px solid ${saldo >= 0 ? 'var(--verde)' : 'var(--rosso)'}` }}>
                  <div className="stat-label">Saldo {reportAnno}</div>
                  <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--verde)' : 'var(--rosso)', fontSize: 22, fontWeight: 900 }}>
                    {saldo >= 0 ? '+' : ''}{formatEuro(saldo)}
                  </div>
                </div>
              </div>

              {/* Breakdown per categoria */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Entrate */}
                {(reportTipo === 'entrambi' || reportTipo === 'entrata') && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--verde)', marginBottom: 10 }}>▲ Entrate per categoria</div>
                    {entratePerCat.length === 0 && <div style={{ fontSize: 12, color: 'var(--gray)' }}>Nessun dato</div>}
                    {entratePerCat.map(({ cat, totale }) => (
                      <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-solid)' }}>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--verde)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>{cat.codice}</span>
                          <span style={{ fontSize: 12, color: 'var(--white)' }}>{cat.descrizione}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--verde)', fontFamily: 'var(--font-mono)' }}>+{formatEuro(totale)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Uscite */}
                {(reportTipo === 'entrambi' || reportTipo === 'uscita') && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--rosso)', marginBottom: 10 }}>▼ Uscite per categoria</div>
                    {uscitePerCat.length === 0 && <div style={{ fontSize: 12, color: 'var(--gray)' }}>Nessun dato</div>}
                    {uscitePerCat.map(({ cat, totale }) => (
                      <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-solid)' }}>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--rosso)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>{cat.codice}</span>
                          <span style={{ fontSize: 12, color: 'var(--white)' }}>{cat.descrizione}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rosso)', fontFamily: 'var(--font-mono)' }}>-{formatEuro(totale)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Banner errore globale ── */}
          {errore && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--rosso)', color: '#fff', padding: '12px 20px',
              borderRadius: 6, fontSize: 13, fontWeight: 600, zIndex: 2000,
              maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
              ⚠️ {errore}
              <button onClick={() => setErrore(null)} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          )}

          {/* ── Modal Conto ── */}
          {contoOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, width: '100%', maxWidth: 480 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)' }}>
                    {contoMode === 'nuovo' ? 'Nuovo Conto Corrente' : 'Modifica Conto'}
                  </div>
                  <button onClick={() => setContoOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <F label="Nome conto *">
                    <input className="input" value={contoForm.nome} onChange={e => setContoForm(p => ({ ...p, nome: e.target.value }))} placeholder="es. Conto principale Banca X" />
                  </F>
                  <F label="Intestatario">
                    <input className="input" value={contoForm.intestatario ?? ''} onChange={e => setContoForm(p => ({ ...p, intestatario: e.target.value || null }))} />
                  </F>
                  <F label="IBAN">
                    <input className="input" value={contoForm.iban ?? ''} onChange={e => setContoForm(p => ({ ...p, iban: e.target.value || null }))} placeholder="IT00 X000 0000 0000 0000 0000 000" />
                  </F>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <F label="Banca"><input className="input" value={contoForm.banca ?? ''} onChange={e => setContoForm(p => ({ ...p, banca: e.target.value || null }))} /></F>
                    <F label="Filiale"><input className="input" value={contoForm.filiale ?? ''} onChange={e => setContoForm(p => ({ ...p, filiale: e.target.value || null }))} /></F>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <F label="BIC/SWIFT"><input className="input" value={contoForm.bic ?? ''} onChange={e => setContoForm(p => ({ ...p, bic: e.target.value || null }))} /></F>
                    <F label="Saldo iniziale €"><input className="input" type="number" step="0.01" value={contoForm.saldo_iniziale || ''} onChange={e => setContoForm(p => ({ ...p, saldo_iniziale: parseFloat(e.target.value) || 0 }))} /></F>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <input type="checkbox" checked={contoForm.predefinito} onChange={e => setContoForm(p => ({ ...p, predefinito: e.target.checked }))} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                    <label style={{ fontSize: 13, color: 'var(--white)', cursor: 'pointer' }}>Conto predefinito</label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={() => setContoOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Annulla</button>
                    <button onClick={salvaConto} disabled={saving || !contoForm.nome.trim()} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                      {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal Causale ── */}
          {causaleOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: '#111', border: '1px solid var(--border-solid)', borderRadius: 2, width: '100%', maxWidth: 420 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, textTransform: 'uppercase', color: 'var(--white)' }}>
                    {causaleMode === 'nuovo' ? 'Nuova Causale' : 'Modifica Causale'}
                  </div>
                  <button onClick={() => setCausaleOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 22, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
                    <F label="Codice *">
                      <input className="input" value={causaleForm.codice} onChange={e => setCausaleForm(p => ({ ...p, codice: e.target.value.toUpperCase() }))} placeholder="es. QUOT" maxLength={10} />
                    </F>
                    <F label="Tipo *">
                      <select className="input" value={causaleForm.tipo} onChange={e => setCausaleForm(p => ({ ...p, tipo: e.target.value as any }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                        <option value="entrata">Entrata</option>
                        <option value="uscita">Uscita</option>
                        <option value="entrambi">Entrambi</option>
                      </select>
                    </F>
                  </div>
                  <F label="Descrizione *">
                    <input className="input" value={causaleForm.descrizione} onChange={e => setCausaleForm(p => ({ ...p, descrizione: e.target.value }))} placeholder="es. Quote associative stagionali" />
                  </F>
                  <F label="Categoria contabile">
                    <select className="input" value={causaleForm.categoria_contabile ?? ''} onChange={e => setCausaleForm(p => ({ ...p, categoria_contabile: e.target.value || null }))} style={{ background: '#1a1a1a', color: 'var(--white)' }}>
                      <option value="">— Nessuna —</option>
                      {categorie.map(c => <option key={c.id} value={c.codice}>{c.codice} – {c.descrizione}</option>)}
                    </select>
                  </F>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={() => setCausaleOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Annulla</button>
                    <button onClick={salvaCausale} disabled={saving || !causaleForm.codice.trim() || !causaleForm.descrizione.trim()} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                      {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </FeatureGate>
  )
}

function generaHTMLReport(
  anno: string,
  entratePerCat: { cat: Categoria; totale: number }[],
  uscitePerCat: { cat: Categoria; totale: number }[],
  totEntrate: number,
  totUscite: number,
  saldo: number,
): string {
  const fmt = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const oggi = new Date().toLocaleDateString('it-IT')
  const rows = (list: { cat: Categoria; totale: number }[], col: string) =>
    list.map(({ cat, totale }) => `<tr><td style="font-family:monospace;width:60px">${cat.codice}</td><td>${cat.descrizione}</td><td style="text-align:right;color:${col};font-weight:bold">€ ${fmt(totale)}</td></tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:11pt;margin:40px}h1{font-size:14pt}h2{font-size:12pt;margin-top:24px}table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#f0f0f0;padding:6px 10px;text-align:left;font-size:10pt}td{padding:5px 10px;border-bottom:1px solid #e0e0e0;font-size:11pt}.tot{font-weight:bold;font-size:12pt}.saldo{font-size:14pt;font-weight:bold;margin-top:16px}</style></head><body>
<h1>REPORT FINANZIARIO — ${anno}</h1>
<p>Generato il: ${oggi}</p>
<h2 style="color:green">ENTRATE</h2>
<table><thead><tr><th>Cod.</th><th>Categoria</th><th style="text-align:right">Importo</th></tr></thead><tbody>${rows(entratePerCat, 'green')}</tbody></table>
<p class="tot" style="color:green">TOTALE ENTRATE: € ${fmt(totEntrate)}</p>
<h2 style="color:red">USCITE</h2>
<table><thead><tr><th>Cod.</th><th>Categoria</th><th style="text-align:right">Importo</th></tr></thead><tbody>${rows(uscitePerCat, 'red')}</tbody></table>
<p class="tot" style="color:red">TOTALE USCITE: € ${fmt(totUscite)}</p>
<hr><p class="saldo" style="color:${saldo >= 0 ? 'green' : 'red'}">SALDO: ${saldo >= 0 ? '+' : ''}€ ${fmt(saldo)}</p>
</body></html>`
}


