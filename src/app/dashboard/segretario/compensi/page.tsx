'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, TabBar, Toast, Drawer, StatCard } from '@/components/ui'
import { calcolaCompenso, type CalcoloCompenso } from '@/lib/compensi'

type Compenso = Record<string, any>
type Utente = { id: string; nome: string; cognome: string; codice_fiscale?: string }
type ViewTab = 'lista' | 'report'

export default function CompensiPage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [compensi, setCompensi] = useState<Compenso[]>([])
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [tab, setTab] = useState<ViewTab>('lista')

  // Filtri
  const annoCorrente = new Date().getFullYear()
  const [filtroAnno, setFiltroAnno] = useState(String(annoCorrente))
  const [filtroCollab, setFiltroCollab] = useState('')

  // Drawer nuovo compenso
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collabId, setCollabId] = useState('')
  const [nomeEsterno, setNomeEsterno] = useState('')
  const [cfEsterno, setCfEsterno] = useState('')
  const [importoLordo, setImportoLordo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [mese, setMese] = useState(String(new Date().getMonth() + 1))
  const [anno, setAnno] = useState(String(annoCorrente))
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])
  const [metodo, setMetodo] = useState('bonifico')

  // Calcolo live
  const [calcolo, setCalcolo] = useState<CalcoloCompenso | null>(null)

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const cid = u!.club_id as string
    setClubId(cid)
    const { data: uts } = await supabase.from('utenti').select('id, nome, cognome').eq('club_id', cid).eq('attivo', true)
    setUtenti(uts ?? [])
    return cid
  }, [supabase])

  const load = useCallback(async (cid: string) => {
    setLoading(true)
    const { data } = await supabase.from('compensi')
      .select('*')
      .eq('club_id', cid)
      .order('created_at', { ascending: false })
    setCompensi(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { init().then(cid => load(cid)) }, [init, load])

  // Calcola precedenti + live quando cambiano importo/collab/anno
  useEffect(() => {
    if (!importoLordo || isNaN(parseFloat(importoLordo))) { setCalcolo(null); return }
    const lordo = parseFloat(importoLordo)
    const annoNum = parseInt(anno)
    const precedenti = compensi
      .filter(c => {
        if (c.anno !== annoNum) return false
        if (collabId) return c.collaboratore_id === collabId
        if (cfEsterno) return c.cf_esterno === cfEsterno
        return false
      })
      .reduce((s, c) => s + Number(c.importo_lordo), 0)
    setCalcolo(calcolaCompenso(lordo, precedenti))
  }, [importoLordo, collabId, cfEsterno, anno, compensi])

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId || !calcolo) return
    if (!importoLordo || !descrizione.trim()) {
      setToast({ msg: 'Importo e descrizione obbligatori', tipo: 'error' }); return
    }
    setSaving(true)

    const payload: Record<string, any> = {
      club_id: clubId,
      anno: parseInt(anno),
      importo_lordo: calcolo.importo_lordo,
      importo_precedente: calcolo.importo_precedente,
      supera_soglia: calcolo.supera_soglia,
      importo_esente: calcolo.importo_esente,
      importo_imponibile: calcolo.importo_imponibile,
      ritenuta: calcolo.ritenuta,
      importo_netto: calcolo.importo_netto,
      descrizione: descrizione.trim(),
      mese: parseInt(mese),
      data_pagamento: dataPagamento,
      metodo,
    }
    if (collabId) { payload.collaboratore_id = collabId }
    else { payload.nome_esterno = nomeEsterno.trim(); payload.cf_esterno = cfEsterno.trim() || null }

    const { data: newComp, error } = await supabase.from('compensi').insert(payload).select('id').single()
    if (error) { setToast({ msg: `Errore: ${error.message}`, tipo: 'error' }); setSaving(false); return }

    // Registra in prima_nota
    await supabase.from('prima_nota').insert({
      club_id: clubId,
      tipo: 'uscita',
      categoria: 'compensi_staff',
      importo: calcolo.importo_netto,
      data: dataPagamento,
      descrizione: `Compenso: ${descrizione.trim()}`,
      note: `Lordo €${calcolo.importo_lordo.toFixed(2)} — Ritenuta €${calcolo.ritenuta.toFixed(2)}`,
    })

    setSaving(false)
    setToast({ msg: `Compenso registrato. Genera autocertificazione?`, tipo: 'success' })
    setDrawerOpen(false)
    resetForm()
    load(clubId)

    // Apri autocertificazione in nuova scheda
    if (newComp?.id) {
      setTimeout(() => {
        if (confirm('Aprire l\'autocertificazione in una nuova scheda?')) {
          window.open(`/api/compensi/autocertificazione/${newComp.id}`, '_blank')
        }
      }, 300)
    }
  }

  const resetForm = () => {
    setCollabId(''); setNomeEsterno(''); setCfEsterno(''); setImportoLordo('')
    setDescrizione(''); setMese(String(new Date().getMonth() + 1))
    setAnno(String(annoCorrente)); setDataPagamento(new Date().toISOString().split('T')[0])
    setMetodo('bonifico'); setCalcolo(null)
  }

  const filtrati = compensi.filter(c => {
    if (filtroAnno && c.anno !== parseInt(filtroAnno)) return false
    if (filtroCollab && c.collaboratore_id !== filtroCollab) return false
    return true
  })

  // KPI
  const compAnno = compensi.filter(c => c.anno === annoCorrente)
  const totLordo = compAnno.reduce((s, c) => s + Number(c.importo_lordo), 0)
  const totRitenuta = compAnno.reduce((s, c) => s + Number(c.ritenuta), 0)
  const collaboratoriUnici = new Set(compAnno.map(c => c.collaboratore_id ?? c.cf_esterno)).size
  const nAutocert = compAnno.filter(c => c.autocertificazione_generata).length
  const sopraSoglia = compAnno.filter(c => c.supera_soglia).length

  // Report per collaboratore
  type ReportRow = { nome: string; lordo: number; esente: number; imponibile: number; ritenuta: number; netto: number }
  const report: ReportRow[] = []
  if (tab === 'report') {
    const gruppi: Record<string, Compenso[]> = {}
    compensi.filter(c => c.anno === parseInt(filtroAnno)).forEach(c => {
      const key = c.collaboratore_id ?? c.cf_esterno ?? 'esterno'
      if (!gruppi[key]) gruppi[key] = []
      gruppi[key].push(c)
    })
    Object.entries(gruppi).forEach(([, rows]) => {
      const first = rows[0]
      const collab = utenti.find(u => u.id === first.collaboratore_id)
      report.push({
        nome: collab ? `${collab.cognome} ${collab.nome}` : (first.nome_esterno ?? 'Esterno'),
        lordo: rows.reduce((s, c) => s + Number(c.importo_lordo), 0),
        esente: rows.reduce((s, c) => s + Number(c.importo_esente), 0),
        imponibile: rows.reduce((s, c) => s + Number(c.importo_imponibile), 0),
        ritenuta: rows.reduce((s, c) => s + Number(c.ritenuta), 0),
        netto: rows.reduce((s, c) => s + Number(c.importo_netto), 0),
      })
    })
  }

  const fmt = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div>
      <PageHeader
        title="Compensi collaboratori"
        subtitle={`Gestione compensi sportivi — Riforma Sport D.Lgs. 36/2021 — Anno ${annoCorrente}`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => setDrawerOpen(true)}>+ Nuovo compenso</button>}
      />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label={`Totale lordo ${annoCorrente}`} value={fmt(totLordo)} />
        <StatCard label="Ritenute versate" value={fmt(totRitenuta)} color="var(--rosso)" />
        <StatCard label="Collaboratori" value={collaboratoriUnici} />
        <StatCard label="Sopra soglia €5k" value={sopraSoglia} color={sopraSoglia > 0 ? 'var(--accent-orange)' : undefined} />
        <StatCard label="Autocertificazioni" value={nAutocert} />
      </div>

      {/* Tab lista / report */}
      <TabBar
        tabs={[{ key: 'lista', label: 'Lista compensi' }, { key: 'report', label: 'Report annuale' }]}
        active={tab}
        onChange={v => setTab(v as ViewTab)}
      />

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 110 }} value={filtroAnno} onChange={e => setFiltroAnno(e.target.value)}>
          {[annoCorrente, annoCorrente - 1, annoCorrente - 2].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input" style={{ width: 200 }} value={filtroCollab} onChange={e => setFiltroCollab(e.target.value)}>
          <option value="">Tutti i collaboratori</option>
          {utenti.map(u => <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>)}
        </select>
      </div>

      {tab === 'lista' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['Collaboratore', 'Descrizione', 'Anno/Mese', 'Lordo', 'Ritenuta', 'Netto', 'Soglia', 'Autocert.'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--grigio-4)' }}>Caricamento...</td></tr>
                ) : filtrati.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--grigio-4)' }}>Nessun compenso registrato</td></tr>
                ) : filtrati.map(c => {
                  const collab = utenti.find(u => u.id === c.collaboratore_id)
                  const nomeCollab = collab ? `${collab.cognome} ${collab.nome}` : (c.nome_esterno ?? 'Esterno')
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{nomeCollab}
                        {c.cf_esterno && <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--grigio-3)' }}>{c.cf_esterno}</div>}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 220, wordBreak: 'break-word' }}>{c.descrizione}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.anno}{c.mese ? `/${String(c.mese).padStart(2,'0')}` : ''}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(Number(c.importo_lordo))}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: Number(c.ritenuta) > 0 ? 'var(--rosso)' : 'var(--grigio-3)' }}>
                        {Number(c.ritenuta) > 0 ? `−${fmt(Number(c.ritenuta))}` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--verde)' }}>{fmt(Number(c.importo_netto))}</td>
                      <td>
                        {c.supera_soglia
                          ? <span className="badge badge-rosso">Sopra soglia</span>
                          : <span className="badge badge-verde">Esente</span>}
                      </td>
                      <td>
                        <a href={`/api/compensi/autocertificazione/${c.id}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                          📄 Genera
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'report' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-solid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Report per collaboratore — {filtroAnno}
            </span>
            <button className="btn btn-sm" onClick={() => exportCSV(report, filtroAnno)} style={{ fontSize: 11 }}>
              Export CSV
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['Collaboratore', 'Totale lordo', 'Quota esente', 'Quota imponibile', 'Ritenuta totale', 'Totale netto'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--grigio-4)' }}>Nessun dato</td></tr>
                ) : report.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.nome}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(r.lordo)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--verde)' }}>{fmt(r.esente)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: r.imponibile > 0 ? 'var(--accent-orange)' : 'var(--grigio-3)' }}>{fmt(r.imponibile)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: r.ritenuta > 0 ? 'var(--rosso)' : 'var(--grigio-3)', fontWeight: 700 }}>
                      {r.ritenuta > 0 ? `−${fmt(r.ritenuta)}` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--verde)' }}>{fmt(r.netto)}</td>
                  </tr>
                ))}
                {report.length > 0 && (
                  <tr style={{ background: 'var(--grigio-mid)', borderTop: '2px solid var(--border-solid)' }}>
                    <td style={{ fontWeight: 700 }}>TOTALI</td>
                    {(['lordo','esente','imponibile','ritenuta','netto'] as const).map(k => (
                      <td key={k} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(report.reduce((s,r) => s + r[k], 0))}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer nuovo compenso */}
      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); resetForm() }} title="Nuovo compenso" width={600}>
        <form onSubmit={salva}>
          <Section title="Collaboratore">
            <Field label="Collaboratore (interno)">
              <select className="input" value={collabId} onChange={e => setCollabId(e.target.value)}>
                <option value="">— Seleziona o inserisci esterno —</option>
                {utenti.map(u => <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>)}
              </select>
            </Field>
            {!collabId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                <Field label="Nome e cognome (esterno)">
                  <input className="input" value={nomeEsterno} onChange={e => setNomeEsterno(e.target.value)} placeholder="Mario Rossi" />
                </Field>
                <Field label="Codice fiscale (esterno)">
                  <input className="input" style={{ textTransform: 'uppercase' }} value={cfEsterno}
                    onChange={e => setCfEsterno(e.target.value.toUpperCase())} placeholder="RSSMRA70A01H501Z" maxLength={16} />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Compenso">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Anno">
                <select className="input" value={anno} onChange={e => setAnno(e.target.value)}>
                  {[annoCorrente, annoCorrente - 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Mese">
                <select className="input" value={mese} onChange={e => setMese(e.target.value)}>
                  {['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].map((m,i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Importo lordo (€) *">
              <input className="input" type="number" min={0} step="0.01" value={importoLordo}
                onChange={e => setImportoLordo(e.target.value)} placeholder="500,00" required />
            </Field>
            <Field label="Descrizione *">
              <input className="input" value={descrizione} onChange={e => setDescrizione(e.target.value)}
                placeholder="Rimborso allenamenti marzo 2024" required />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Data pagamento">
                <input className="input" type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
              </Field>
              <Field label="Metodo">
                <select className="input" value={metodo} onChange={e => setMetodo(e.target.value)}>
                  <option value="bonifico">Bonifico</option>
                  <option value="contanti">Contanti</option>
                  <option value="assegno">Assegno</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Calcolo live */}
          {calcolo && (
            <div style={{ background: '#0d1a00', border: '1px solid var(--accent)', borderRadius: 4, padding: '14px 18px', marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 10 }}>
                Calcolo fiscale live
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', lineHeight: 1.7 }}>
                <span style={{ color: 'var(--grigio-3)' }}>Compensi precedenti {anno}:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>€ {calcolo.importo_precedente.toFixed(2)}</span>
                <span style={{ color: 'var(--grigio-3)' }}>Questo compenso:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>€ {calcolo.importo_lordo.toFixed(2)}</span>
                <span style={{ color: 'var(--grigio-3)' }}>Totale anno {anno}:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>€ {(calcolo.importo_precedente + calcolo.importo_lordo).toFixed(2)}</span>
              </div>
              <div style={{ height: 1, background: '#1a2d00', margin: '10px 0' }} />
              {!calcolo.supera_soglia ? (
                <div style={{ color: 'var(--verde)', fontWeight: 600 }}>
                  ✓ Nessuna ritenuta — tutto esente (sotto €5.000)
                  <br /><span style={{ fontSize: 12, fontWeight: 400, color: 'var(--grigio-3)' }}>
                    Residuo soglia: € {calcolo.soglia_residua.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', lineHeight: 1.7 }}>
                  <span style={{ color: 'var(--grigio-3)' }}>Quota esente:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--verde)' }}>€ {calcolo.importo_esente.toFixed(2)}</span>
                  <span style={{ color: 'var(--grigio-3)' }}>Quota imponibile:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>€ {calcolo.importo_imponibile.toFixed(2)}</span>
                  <span style={{ color: 'var(--grigio-3)' }}>Ritenuta 23%:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--rosso)', fontWeight: 700 }}>−€ {calcolo.ritenuta.toFixed(2)}</span>
                  <span style={{ fontWeight: 700 }}>Netto da pagare:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--verde)', fontSize: 15 }}>€ {calcolo.importo_netto.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => { setDrawerOpen(false); resetForm() }}>Annulla</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !calcolo}>
              {saving ? '...' : 'Registra compenso'}
            </button>
          </div>
        </form>
      </Drawer>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

function exportCSV(report: any[], anno: string) {
  const header = 'Collaboratore,Lordo,Esente,Imponibile,Ritenuta,Netto\n'
  const rows = report.map(r =>
    `"${r.nome}",${r.lordo.toFixed(2)},${r.esente.toFixed(2)},${r.imponibile.toFixed(2)},${r.ritenuta.toFixed(2)},${r.netto.toFixed(2)}`
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `compensi_${anno}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', paddingBottom: 8, borderBottom: '1px solid var(--border-solid)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <FeatureGate feature="compensi_staff" featureLabel="Compensi Staff">
        <div style={{ marginBottom: 14 }}>
          <label className="label">{label}</label>
          {children}
        </div>
    </FeatureGate>
  )
}
