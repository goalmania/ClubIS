'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader, Toast } from '@/components/ui'
import { validaIBAN, formattaIBAN } from '@/lib/sepa/sepa-generator'

/* ─── Costanti ─────────────────────────────────────────────── */

const RUOLI = [
  'Allenatore', 'Allenatore in seconda', 'Preparatore atletico',
  'Dirigente', 'Accompagnatore', 'Medico Sociale',
  'Fisioterapista', 'Massaggiatore', 'Osservatore', 'Altro',
]

const TIPI_RIMBORSO = [
  { value: 'forfetario_volontario', label: 'Rimborso forfetario volontario' },
  { value: 'spese_documentate',     label: 'Rimborso spese documentate' },
]

// Scadenza caricamento trimestrale sul portale RASD
const SCADENZE: Record<number, { mese: number; giorno: number; label: string }> = {
  1: { mese: 3,  giorno: 30, label: '30 aprile'   },
  2: { mese: 6,  giorno: 31, label: '31 luglio'   },
  3: { mese: 9,  giorno: 31, label: '31 ottobre'  },
  4: { mese: 0,  giorno: 31, label: '31 gennaio'  }, // anno successivo
}

const now = new Date()

/* ─── Tipi ─────────────────────────────────────────────────── */

interface RimborsoRas {
  id: string
  soggetto_nome: string
  soggetto_cognome: string
  codice_fiscale: string
  ruolo: string
  tipo_rimborso: string
  importo: number
  data_erogazione: string
  trimestre: number
  anno: number
  causale: string | null
  note: string | null
}

interface DatoBancario {
  codice_fiscale: string
  iban: string
  intestatario: string
  bic: string | null
}

interface DistintaSepa {
  id: string
  message_id: string
  data_generazione: string
  data_esecuzione: string
  numero_transazioni: number
  importo_totale: number
  stato: string
  rimborsi_ids: string[]
}

type Tab       = 'ras' | 'sepa' | 'storico'
type SepaStep  = 'select' | 'iban' | 'preview' | 'done'

const EMPTY_FORM = {
  soggetto_nome: '', soggetto_cognome: '', codice_fiscale: '',
  ruolo: RUOLI[0], tipo_rimborso: 'forfetario_volontario',
  importo: '', data_erogazione: now.toISOString().split('T')[0],
  causale: '', note: '',
}

/* ─── Helper ────────────────────────────────────────────────── */

const fmtEur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('it-IT') : '—'
const maskCF  = (cf: string) => cf ? cf.slice(0, 8) + '****' : '—'

function prossimaDead(trimestre: number, anno: number): Date {
  const s = SCADENZE[trimestre]
  const annoD = trimestre === 4 ? anno + 1 : anno
  return new Date(annoD, s.mese, s.giorno)
}

function calcolaTrimestre(dateStr: string) {
  const d = new Date(dateStr)
  return Math.ceil((d.getMonth() + 1) / 3)
}

function nextWorkday(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

/* ─── Componente ─────────────────────────────────────────────── */

export default function RimborsiPage() {
  const [tab, setTab]           = useState<Tab>('ras')
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const ok  = (msg: string) => setToast({ msg, tipo: 'success' })
  const err = (msg: string) => setToast({ msg, tipo: 'error' })

  /* ── Dati ─────────────────────────────────────────────────── */
  const [rimborsi,  setRimborsi]  = useState<RimborsoRas[]>([])
  const [distinte,  setDistinte]  = useState<DistintaSepa[]>([])
  const [datiBanc,  setDatiBanc]  = useState<DatoBancario[]>([])

  /* ── Filtri RAS ───────────────────────────────────────────── */
  const [filtroAnno,  setFiltroAnno]  = useState(now.getFullYear())
  const [filtroTrim,  setFiltroTrim]  = useState(calcolaTrimestre(now.toISOString()))

  /* ── Form add/edit RAS ───────────────────────────────────── */
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [form,     setForm]     = useState({ ...EMPTY_FORM })
  const [saving,   setSaving]   = useState(false)
  const [formErr,  setFormErr]  = useState<Record<string, string>>({})

  /* ── SEPA ─────────────────────────────────────────────────── */
  const [sepaStep,    setSepaStep]    = useState<SepaStep>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sepaFiltroT, setSepaFiltroT] = useState(calcolaTrimestre(now.toISOString()))
  const [sepaFiltroA, setSepaFiltroA] = useState(now.getFullYear())
  const [dataEsec,    setDataEsec]    = useState(nextWorkday())
  const [causaleBatch, setCausaleBatch] = useState('')
  const [ibanMancanti, setIbanMancanti] = useState<{ cf: string; nome: string }[]>([])
  const [nuoviIban,    setNuoviIban]    = useState<Record<string, { iban: string; intestatario: string }>>({})
  const [generando,    setGenerando]    = useState(false)
  const [distintaId,   setDistintaId]   = useState<string | null>(null)

  /* ── Load ─────────────────────────────────────────────────── */

  const loadRas = useCallback(async (anno?: number, trim?: number) => {
    const params = new URLSearchParams()
    if (anno) params.set('anno', String(anno))
    if (trim) params.set('trimestre', String(trim))
    const res = await fetch(`/api/rimborsi-ras?${params}`)
    if (res.ok) setRimborsi(await res.json())
  }, [])

  const loadDistinte = useCallback(async () => {
    const res = await fetch('/api/sepa/distinte')
    if (res.ok) setDistinte(await res.json())
  }, [])

  useEffect(() => {
    Promise.all([loadRas(filtroAnno, filtroTrim), loadDistinte()])
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadRas(filtroAnno, filtroTrim) }, [filtroAnno, filtroTrim, loadRas])

  /* ── Alert scadenze ──────────────────────────────────────── */

  const alertScadenza = useMemo(() => {
    for (const [trim, s] of Object.entries(SCADENZE)) {
      const t   = parseInt(trim)
      const d   = prossimaDead(t, t === 4 ? now.getFullYear() : now.getFullYear())
      const gg  = Math.ceil((d.getTime() - now.getTime()) / 86400000)
      if (gg >= 0 && gg <= 15) return { trimestre: t, giorni: gg, label: s.label }
    }
    return null
  }, [])

  /* ── Validazione form RAS ─────────────────────────────────── */

  const validaForm = () => {
    const e: Record<string, string> = {}
    if (!form.soggetto_nome.trim())    e.nome    = 'Obbligatorio'
    if (!form.soggetto_cognome.trim()) e.cognome  = 'Obbligatorio'
    const cf = form.codice_fiscale.trim().toUpperCase()
    if (!cf) e.cf = 'Obbligatorio'
    else if (!/^[A-Z0-9]{16}$/.test(cf)) e.cf = 'Formato non valido (16 caratteri alfanumerici)'
    if (!form.importo || parseFloat(form.importo) <= 0) e.importo = 'Importo deve essere > 0'
    if (!form.data_erogazione) e.data = 'Obbligatoria'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  /* ── Salva rimborso ───────────────────────────────────────── */

  const salvaRimborso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validaForm()) return
    setSaving(true)
    try {
      const method = editId ? 'PATCH' : 'POST'
      const url    = editId ? `/api/rimborsi-ras/${editId}` : '/api/rimborsi-ras'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soggetto_nome:    form.soggetto_nome,
          soggetto_cognome: form.soggetto_cognome,
          codice_fiscale:   form.codice_fiscale.toUpperCase(),
          ruolo:            form.ruolo,
          tipo_rimborso:    form.tipo_rimborso,
          importo:          form.importo,
          data_erogazione:  form.data_erogazione,
          causale:          form.causale,
          note:             form.note,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore salvataggio')
      ok(editId ? 'Rimborso aggiornato' : 'Rimborso aggiunto')
      setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM })
      await loadRas(filtroAnno, filtroTrim)
    } catch (ex: any) {
      err(ex.message)
    } finally {
      setSaving(false)
    }
  }

  /* ── Elimina rimborso ─────────────────────────────────────── */

  const eliminaRimborso = async (id: string) => {
    if (!confirm('Eliminare questo rimborso?')) return
    const res = await fetch(`/api/rimborsi-ras/${id}`, { method: 'DELETE' })
    if (res.ok) { ok('Rimborso eliminato'); await loadRas(filtroAnno, filtroTrim) }
    else err('Errore eliminazione')
  }

  /* ── Report RASD CSV ─────────────────────────────────────── */

  const exportRasd = () => {
    const dead = prossimaDead(filtroTrim, filtroAnno)
    const deadLabel = SCADENZE[filtroTrim].label
    const header = [
      `# Report RASD - Q${filtroTrim} ${filtroAnno} - Da caricare sul portale RASD entro ${deadLabel} ${filtroTrim === 4 ? filtroAnno + 1 : filtroAnno}`,
      'Codice Fiscale,Cognome,Nome,Ruolo,Importo Totale Trimestre,N. Prestazioni',
    ]
    const byPerson: Record<string, { r: RimborsoRas; tot: number; n: number }> = {}
    for (const r of rimborsi) {
      const k = r.codice_fiscale
      if (!byPerson[k]) byPerson[k] = { r, tot: 0, n: 0 }
      byPerson[k].tot += Number(r.importo)
      byPerson[k].n++
    }
    const rows = Object.values(byPerson).map(({ r, tot, n }) =>
      `${r.codice_fiscale},${r.soggetto_cognome},${r.soggetto_nome},${r.ruolo},${tot.toFixed(2)},${n}`
    )
    const csv  = [...header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `RASD_Q${filtroTrim}_${filtroAnno}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  /* ── SEPA: lista rimborsi filtrata ───────────────────────── */

  const rimborsiSepa = useMemo(() =>
    rimborsi.filter(r => r.trimestre === sepaFiltroT && r.anno === sepaFiltroA),
    [rimborsi, sepaFiltroT, sepaFiltroA]
  )

  const rimborsiSelezionati = useMemo(() =>
    rimborsiSepa.filter(r => selectedIds.has(r.id)),
    [rimborsiSepa, selectedIds]
  )

  const totaleSepa = useMemo(() =>
    rimborsiSelezionati.reduce((s, r) => s + Number(r.importo), 0),
    [rimborsiSelezionati]
  )

  /* ── SEPA: carica rimborsi del trimestre SEPA ────────────── */

  useEffect(() => {
    if (tab === 'sepa') loadRas(sepaFiltroA, sepaFiltroT)
  }, [tab, sepaFiltroA, sepaFiltroT, loadRas])

  /* ── SEPA: verifica IBAN + vai a preview ──────────────────── */

  const verificaIban = useCallback(async () => {
    if (selectedIds.size === 0) { err('Seleziona almeno un rimborso'); return }
    const cfs = [...new Set(rimborsiSelezionati.map(r => r.codice_fiscale))]
    const qs  = cfs.map(cf => `cf=${cf}`).join('&')
    const res = await fetch(`/api/dati-bancari?${qs}`)
    const dati: DatoBancario[] = res.ok ? await res.json() : []
    setDatiBanc(dati)
    const have = new Set(dati.map(d => d.codice_fiscale.toUpperCase()))
    const miss  = rimborsiSelezionati
      .filter(r => !have.has(r.codice_fiscale.toUpperCase()))
      .map(r => ({ cf: r.codice_fiscale, nome: `${r.soggetto_cognome} ${r.soggetto_nome}` }))
    setIbanMancanti(miss)
    setSepaStep(miss.length > 0 ? 'iban' : 'preview')
  }, [selectedIds, rimborsiSelezionati])

  /* ── SEPA: genera XML ────────────────────────────────────── */

  const generaSepa = useCallback(async () => {
    setGenerando(true)
    try {
      // Raccogli nuovi IBAN inseriti
      const nuoviArr = Object.entries(nuoviIban)
        .filter(([, v]) => v.iban && v.intestatario)
        .map(([cf, v]) => ({ codice_fiscale: cf, ...v }))

      const res  = await fetch('/api/sepa/genera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rimborsi_ids:   [...selectedIds],
          data_esecuzione: dataEsec,
          causale_batch:  causaleBatch,
          nuovi_iban:     nuoviArr,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.mancanti) { setIbanMancanti(json.mancanti); setSepaStep('iban') }
        else err(json.error ?? 'Errore generazione')
        return
      }

      // Download
      const blob = new Blob([json.xml], { type: 'application/xml;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), { href: url, download: json.filename })
      a.click(); URL.revokeObjectURL(url)

      setDistintaId(json.distinta_id)
      setSepaStep('done')
      await loadDistinte()
    } catch (ex: any) {
      err(ex.message)
    } finally {
      setGenerando(false)
    }
  }, [selectedIds, dataEsec, causaleBatch, nuoviIban, loadDistinte])

  /* ── SEPA: aggiorna stato distinta ──────────────────────── */

  const aggiornaStato = async (id: string, stato: string) => {
    const res = await fetch(`/api/sepa/distinte/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    if (res.ok) { ok('Stato aggiornato'); await loadDistinte() }
    else err('Errore aggiornamento stato')
  }

  /* ── Render ─────────────────────────────────────────────── */

  const annoOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
      Caricamento rimborsi…
    </div>
  )

  return (
    <FeatureGate feature="rimborso_sepa" featureLabel="Rimborsi & RAS">
      <>
        {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

        <PageHeader
          title="Rimborsi & RAS"
          subtitle="Gestisci i rimborsi ai volontari sportivi, il registro RASD e le distinte SEPA"
        />

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {([['ras', 'Registro RAS'], ['sepa', 'Genera SEPA'], ['storico', 'Storico distinte']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.78rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: tab === t ? 'var(--accent)' : 'var(--grigio-3)',
              fontWeight: tab === t ? 700 : 500,
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {/* ═══ TAB: REGISTRO RAS ═══════════════════════════════════ */}
        {tab === 'ras' && (
          <div>
            {/* Alert scadenza */}
            {alertScadenza && (
              <div style={{
                background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.4)',
                borderRadius: 6, padding: '12px 16px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 18 }}>⚠</span>
                <div style={{ fontSize: 13, color: 'var(--ambra)' }}>
                  <strong>Scadenza RASD Q{alertScadenza.trimestre}:</strong> mancano {alertScadenza.giorni} giorni
                  per caricare i dati sul portale RASD (entro {alertScadenza.label}).
                </div>
              </div>
            )}

            {/* Filtri + azioni */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <select className="input" style={{ width: 130 }} value={filtroTrim} onChange={e => setFiltroTrim(+e.target.value)}>
                {[1, 2, 3, 4].map(t => <option key={t} value={t}>Q{t}</option>)}
              </select>
              <select className="input" style={{ width: 100 }} value={filtroAnno} onChange={e => setFiltroAnno(+e.target.value)}>
                {annoOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-4)', flex: 1 }}>
                {rimborsi.length} rimborsi — {fmtEur(rimborsi.reduce((s, r) => s + Number(r.importo), 0))} totale
              </span>
              <button className="btn btn-secondary btn-sm" onClick={exportRasd} disabled={rimborsi.length === 0}>
                ↓ Report RASD CSV
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY_FORM }) }}>
                {showForm ? '✕ Annulla' : '+ Aggiungi rimborso'}
              </button>
            </div>

            {/* Form add/edit */}
            {showForm && (
              <div className="card" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 16 }}>
                  {editId ? 'Modifica rimborso' : 'Nuovo rimborso'}
                </div>
                <form onSubmit={salvaRimborso}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={lbStyle}>Cognome *</label>
                      <input className="input" style={errBorder(formErr.cognome)} value={form.soggetto_cognome}
                        onChange={e => setForm(f => ({ ...f, soggetto_cognome: e.target.value }))} placeholder="Rossi" />
                      {formErr.cognome && <small style={errStyle}>{formErr.cognome}</small>}
                    </div>
                    <div>
                      <label style={lbStyle}>Nome *</label>
                      <input className="input" style={errBorder(formErr.nome)} value={form.soggetto_nome}
                        onChange={e => setForm(f => ({ ...f, soggetto_nome: e.target.value }))} placeholder="Mario" />
                      {formErr.nome && <small style={errStyle}>{formErr.nome}</small>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={lbStyle}>Codice Fiscale *</label>
                      <input className="input" style={{ ...errBorder(formErr.cf), fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                        value={form.codice_fiscale} maxLength={16}
                        onChange={e => setForm(f => ({ ...f, codice_fiscale: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                        placeholder="RSSMRA80A01H501Z" />
                      {formErr.cf && <small style={errStyle}>{formErr.cf}</small>}
                    </div>
                    <div>
                      <label style={lbStyle}>Ruolo *</label>
                      <select className="input" value={form.ruolo} onChange={e => setForm(f => ({ ...f, ruolo: e.target.value }))}>
                        {RUOLI.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbStyle}>Tipo rimborso *</label>
                      <select className="input" value={form.tipo_rimborso} onChange={e => setForm(f => ({ ...f, tipo_rimborso: e.target.value }))}>
                        {TIPI_RIMBORSO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 160px 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={lbStyle}>Importo (€) *</label>
                      <input className="input" type="number" min="0.01" step="0.01" style={errBorder(formErr.importo)}
                        value={form.importo} onChange={e => setForm(f => ({ ...f, importo: e.target.value }))} placeholder="0,00" />
                      {formErr.importo && <small style={errStyle}>{formErr.importo}</small>}
                    </div>
                    <div>
                      <label style={lbStyle}>Data erogazione *</label>
                      <input className="input" type="date" style={errBorder(formErr.data)} value={form.data_erogazione}
                        onChange={e => setForm(f => ({ ...f, data_erogazione: e.target.value }))} />
                      {form.data_erogazione && (
                        <small style={{ fontSize: 10, color: 'var(--grigio-4)', display: 'block', marginTop: 3 }}>
                          Q{calcolaTrimestre(form.data_erogazione)} {new Date(form.data_erogazione).getFullYear()}
                        </small>
                      )}
                    </div>
                    <div>
                      <label style={lbStyle}>Causale</label>
                      <input className="input" value={form.causale}
                        onChange={e => setForm(f => ({ ...f, causale: e.target.value }))}
                        placeholder="Trasferta gara del 12/04/2025" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={lbStyle}>Note</label>
                    <textarea className="input" rows={2} value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                      {saving ? 'Salvataggio…' : editId ? 'Aggiorna' : 'Salva rimborso'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditId(null) }}>
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tabella rimborsi */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {rimborsi.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
                  Nessun rimborso per Q{filtroTrim} {filtroAnno}.
                  <br /><button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}
                    onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_FORM }) }}>
                    Aggiungi il primo →
                  </button>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome / Cognome</th>
                        <th>CF</th>
                        <th>Ruolo</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: 'right' }}>Importo</th>
                        <th>Data</th>
                        <th>Causale</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rimborsi.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.soggetto_cognome} {r.soggetto_nome}</td>
                          <td>
                            <span title={r.codice_fiscale} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-3)' }}>
                              {maskCF(r.codice_fiscale)}
                            </span>
                          </td>
                          <td><span className="badge badge-grigio" style={{ fontSize: 11 }}>{r.ruolo}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>
                            {r.tipo_rimborso === 'forfetario_volontario' ? 'Forfetario' : 'Documentato'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                            {fmtEur(Number(r.importo))}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--grigio-3)', fontFamily: 'var(--font-mono)' }}>
                            {fmtDate(r.data_erogazione)}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--grigio-3)', maxWidth: 180 }}>
                            {r.causale ? (r.causale.length > 30 ? r.causale.slice(0, 30) + '…' : r.causale) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
                                setEditId(r.id)
                                setForm({
                                  soggetto_nome:    r.soggetto_nome,
                                  soggetto_cognome: r.soggetto_cognome,
                                  codice_fiscale:   r.codice_fiscale,
                                  ruolo:            r.ruolo,
                                  tipo_rimborso:    r.tipo_rimborso,
                                  importo:          String(r.importo),
                                  data_erogazione:  r.data_erogazione,
                                  causale:          r.causale ?? '',
                                  note:             r.note ?? '',
                                })
                                setShowForm(true)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}>Modifica</button>
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--rosso)' }}
                                onClick={() => eliminaRimborso(r.id)}>Elimina</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {rimborsi.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginTop: 16 }}>
                {[
                  ['TOTALE Q' + filtroTrim, fmtEur(rimborsi.reduce((s, r) => s + Number(r.importo), 0))],
                  ['N. SOGGETTI', String(new Set(rimborsi.map(r => r.codice_fiscale)).size)],
                  ['N. RIMBORSI', String(rimborsi.length)],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'var(--gray-light)', padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grigio-4)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--white)' }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: GENERA SEPA ════════════════════════════════════ */}
        {tab === 'sepa' && (
          <div>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
              {(['select', 'iban', 'preview', 'done'] as SepaStep[]).map((step, i) => {
                const labels = ['Selezione', 'IBAN', 'Preview', 'Fine']
                const active = sepaStep === step
                const done   = ['select', 'iban', 'preview', 'done'].indexOf(sepaStep) > i
                return (
                  <div key={step} style={{
                    padding: '8px 20px', fontFamily: 'var(--font-mono)', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: active ? 'var(--accent)' : done ? 'var(--verde)' : 'var(--grigio-4)',
                    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: -1,
                  }}>
                    {i + 1}. {labels[i]}
                  </div>
                )
              })}
            </div>

            {/* Step 1: Selezione */}
            {sepaStep === 'select' && (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                  <select className="input" style={{ width: 130 }} value={sepaFiltroT} onChange={e => { setSepaFiltroT(+e.target.value); setSelectedIds(new Set()) }}>
                    {[1, 2, 3, 4].map(t => <option key={t} value={t}>Q{t}</option>)}
                  </select>
                  <select className="input" style={{ width: 100 }} value={sepaFiltroA} onChange={e => { setSepaFiltroA(+e.target.value); setSelectedIds(new Set()) }}>
                    {annoOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-3)' }}>
                    <input type="checkbox"
                      checked={rimborsiSepa.length > 0 && rimborsiSepa.every(r => selectedIds.has(r.id))}
                      onChange={e => setSelectedIds(e.target.checked ? new Set(rimborsiSepa.map(r => r.id)) : new Set())}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    Seleziona tutti
                  </label>
                </div>

                {rimborsiSepa.length === 0 ? (
                  <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
                    Nessun rimborso in Q{sepaFiltroT} {sepaFiltroA}. Aggiungili nel tab Registro RAS.
                  </div>
                ) : (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}></th>
                            <th>Nome</th>
                            <th>CF</th>
                            <th>Ruolo</th>
                            <th style={{ textAlign: 'right' }}>Importo</th>
                            <th>Data</th>
                            <th>Causale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rimborsiSepa.map(r => (
                            <tr key={r.id} style={{ background: selectedIds.has(r.id) ? 'rgba(200,240,0,0.04)' : undefined }}>
                              <td>
                                <input type="checkbox" checked={selectedIds.has(r.id)}
                                  onChange={e => {
                                    const s = new Set(selectedIds)
                                    e.target.checked ? s.add(r.id) : s.delete(r.id)
                                    setSelectedIds(s)
                                  }}
                                  style={{ accentColor: 'var(--accent)' }}
                                />
                              </td>
                              <td style={{ fontWeight: 600 }}>{r.soggetto_cognome} {r.soggetto_nome}</td>
                              <td><span title={r.codice_fiscale} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-3)' }}>{maskCF(r.codice_fiscale)}</span></td>
                              <td><span className="badge badge-grigio" style={{ fontSize: 11 }}>{r.ruolo}</span></td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmtEur(Number(r.importo))}</td>
                              <td style={{ fontSize: 12, color: 'var(--grigio-3)', fontFamily: 'var(--font-mono)' }}>{fmtDate(r.data_erogazione)}</td>
                              <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.causale ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--gray-light)', border: '1px solid var(--border)', borderRadius: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)' }}>
                    {selectedIds.size} selezionati — {fmtEur(totaleSepa)}
                  </span>
                  <button className="btn btn-primary" onClick={verificaIban} disabled={selectedIds.size === 0}>
                    Avanti: verifica IBAN →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: IBAN mancanti */}
            {sepaStep === 'iban' && (
              <div>
                <div className="card" style={{ padding: '20px 24px', marginBottom: 20, borderLeft: '3px solid var(--ambra)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ambra)', marginBottom: 14 }}>
                    ⚠ IBAN mancanti — inserisci i dati bancari per procedere
                  </div>
                  {ibanMancanti.map(({ cf, nome }) => (
                    <div key={cf} style={{ marginBottom: 16, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{nome} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-4)', fontWeight: 400 }}>({cf})</span></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={lbStyle}>IBAN</label>
                          <input className="input" placeholder="IT60 X054 2811 1010 0000 0123 456"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                            value={nuoviIban[cf]?.iban ?? ''}
                            onChange={e => setNuoviIban(prev => ({ ...prev, [cf]: { ...prev[cf], iban: e.target.value.toUpperCase() } }))}
                          />
                          {nuoviIban[cf]?.iban && nuoviIban[cf].iban.replace(/\s/g,'').length >= 5 && (
                            <small style={{ fontSize: 10, color: validaIBAN(nuoviIban[cf].iban) ? 'var(--verde)' : 'var(--rosso)', display: 'block', marginTop: 3 }}>
                              {validaIBAN(nuoviIban[cf].iban) ? `✓ ${formattaIBAN(nuoviIban[cf].iban)}` : '✗ IBAN non valido (formato: IT60 X054 2811 1010 0000 0123 456)'}
                            </small>
                          )}
                        </div>
                        <div>
                          <label style={lbStyle}>Intestatario conto</label>
                          <input className="input" placeholder="Rossi Mario"
                            value={nuoviIban[cf]?.intestatario ?? ''}
                            onChange={e => setNuoviIban(prev => ({ ...prev, [cf]: { ...prev[cf], intestatario: e.target.value } }))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {ibanMancanti.some(({ cf }) => !nuoviIban[cf]?.iban || !nuoviIban[cf]?.intestatario || !validaIBAN(nuoviIban[cf]?.iban ?? '')) && (
                  <div style={{ fontSize: 12, color: 'var(--rosso)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                    ✗ Inserisci un IBAN valido e il nome intestatario per tutti i collaboratori prima di procedere.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setSepaStep('select')}>← Indietro</button>
                  <button className="btn btn-primary"
                    disabled={ibanMancanti.some(({ cf }) => !nuoviIban[cf]?.iban || !nuoviIban[cf]?.intestatario || !validaIBAN(nuoviIban[cf]?.iban ?? ''))}
                    onClick={() => setSepaStep('preview')}>
                    Avanti: preview →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview + config */}
            {sepaStep === 'preview' && (
              <div>
                <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-4)', marginBottom: 14 }}>Configurazione distinta</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
                    <div>
                      <label style={lbStyle}>Data esecuzione</label>
                      <input className="input" type="date" value={dataEsec} onChange={e => setDataEsec(e.target.value)} />
                    </div>
                    <div>
                      <label style={lbStyle}>Causale batch (se non specificata per singolo rimborso)</label>
                      <input className="input" placeholder="Rimborsi collaboratori sportivi Q1 2025" maxLength={140}
                        value={causaleBatch} onChange={e => setCausaleBatch(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Nome</th><th>IBAN (mascherato)</th><th style={{ textAlign: 'right' }}>Importo</th><th>Causale</th></tr>
                      </thead>
                      <tbody>
                        {rimborsiSelezionati.map(r => {
                          const cf   = r.codice_fiscale.toUpperCase()
                          const dato = datiBanc.find(d => d.codice_fiscale.toUpperCase() === cf) || { iban: nuoviIban[cf]?.iban ?? '' }
                          const iban = dato.iban.replace(/\s/g, '')
                          const ibanMask = iban.length > 8 ? iban.slice(0, 4) + '****' + iban.slice(-4) : iban
                          return (
                            <tr key={r.id}>
                              <td style={{ fontWeight: 600 }}>{r.soggetto_cognome} {r.soggetto_nome}</td>
                              <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ibanMask}</span></td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmtEur(Number(r.importo))}</td>
                              <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{(r.causale || causaleBatch || `Rimborso ${r.soggetto_cognome}`).slice(0, 50)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setSepaStep(ibanMancanti.length > 0 ? 'iban' : 'select')}>← Indietro</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--accent)' }}>{fmtEur(totaleSepa)}</span>
                    <button className="btn btn-primary" onClick={generaSepa} disabled={generando}>
                      {generando ? 'Generazione…' : `↓ Scarica XML SEPA (${rimborsiSelezionati.length} bonifici)`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {sepaStep === 'done' && (
              <div className="card" style={{ padding: '28px 32px', borderLeft: '3px solid var(--verde)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: 'var(--verde)', marginBottom: 12 }}>
                  ✓ File SEPA scaricato
                </div>
                <ol style={{ margin: '12px 0 20px', paddingLeft: 22, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)', lineHeight: 2.2 }}>
                  <li>Accedi alla home banking della tua banca</li>
                  <li>Cerca <em>Bonifici SEPA</em>, <em>Disposizioni massive</em> o <em>Import XML</em></li>
                  <li>Carica il file <strong style={{ color: 'var(--white)' }}>SEPA_*.xml</strong> appena scaricato</li>
                  <li>Verifica l'elenco e conferma</li>
                  <li>I bonifici saranno accreditati entro 1–2 giorni lavorativi</li>
                </ol>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {distintaId && (
                    <button className="btn btn-secondary btn-sm" onClick={() => aggiornaStato(distintaId, 'inviata_banca')}>
                      ✓ Segna distinta come inviata alla banca
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    setSepaStep('select'); setSelectedIds(new Set())
                    setNuoviIban({}); setIbanMancanti([]); setDistintaId(null)
                  }}>
                    Nuova distinta
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: STORICO DISTINTE ═══════════════════════════════ */}
        {tab === 'storico' && (
          <div>
            {distinte.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
                Nessuna distinta SEPA generata ancora.
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID Messaggio</th>
                        <th>Generata il</th>
                        <th>Data esecuzione</th>
                        <th style={{ textAlign: 'right' }}>N. bonifici</th>
                        <th style={{ textAlign: 'right' }}>Totale</th>
                        <th>Stato</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {distinte.map(d => {
                        const statoColor = d.stato === 'eseguita' ? 'badge-verde' : d.stato === 'inviata_banca' ? 'badge-ambra' : 'badge-grigio'
                        const statoLabel = d.stato === 'eseguita' ? 'Eseguita' : d.stato === 'inviata_banca' ? 'Inviata banca' : 'Generata'
                        return (
                          <tr key={d.id}>
                            <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{d.message_id}</span></td>
                            <td style={{ fontSize: 12, color: 'var(--grigio-3)', fontFamily: 'var(--font-mono)' }}>{fmtDate(d.data_generazione)}</td>
                            <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{fmtDate(d.data_esecuzione)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{d.numero_transazioni}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{fmtEur(Number(d.importo_totale))}</td>
                            <td><span className={`badge ${statoColor}`} style={{ fontSize: 11 }}>{statoLabel}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {d.stato === 'generata' && (
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => aggiornaStato(d.id, 'inviata_banca')}>
                                    Segna inviata
                                  </button>
                                )}
                                {d.stato === 'inviata_banca' && (
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--verde)' }} onClick={() => aggiornaStato(d.id, 'eseguita')}>
                                    Segna eseguita
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
              </div>
            )}
          </div>
        )}
      </>
    </FeatureGate>
  )
}

/* ─── Stili inline helpers ──────────────────────────────────── */
const lbStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5,
  fontFamily: 'var(--font-mono)', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-4)',
}
const errStyle: React.CSSProperties = { color: 'var(--rosso)', fontSize: 11, display: 'block', marginTop: 3 }
const errBorder = (e?: string): React.CSSProperties => e ? { borderColor: 'var(--rosso)' } : {}
