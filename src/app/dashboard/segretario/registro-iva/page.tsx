'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import { useSharedData } from '@/hooks/useSharedData'

type TipoFiltro = 'tutti' | 'entrata' | 'uscita'

interface RegistroRow {
  id: string
  numero_progressivo: string
  data_operazione: string
  tipo: 'entrata' | 'uscita'
  natura: string
  controparte: string | null
  imponibile: number
  iva: number
  totale: number
  regime: string
  note: string | null
}

const REGIME_LABEL: Record<string, string> = {
  esente_art10: 'Esente art. 10',
  imponibile:   'Imponibile',
  fuori_campo:  'Fuori campo',
}

const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

const fmt = (n: number) =>
  Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

function RegimeBadge({ regime }: { regime: string }) {
  const cls = regime === 'imponibile' ? 'badge-ambra' : regime === 'fuori_campo' ? 'badge-grigio' : 'badge-verde'
  return <span className={`badge ${cls}`}>{REGIME_LABEL[regime] ?? regime}</span>
}

export default function RegistroIvaPage() {
  const supabase = createClient()
  const [righe, setRighe] = useState<RegistroRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sincronizzando, setSincronizzando] = useState(false)
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [meseFiltro, setMeseFiltro] = useState<number | null>(null) // 1-12
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('tutti')
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  useSharedData(async () => { await load() })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const clubId = utente!.club_id

    const { data } = await supabase
      .from('registro_iva')
      .select('id, numero_progressivo, data_operazione, tipo, natura, controparte, imponibile, iva, totale, regime, note')
      .eq('club_id', clubId)
      .gte('data_operazione', `${anno}-01-01`)
      .lte('data_operazione', `${anno}-12-31`)
      .order('numero_progressivo')

    setRighe(data ?? [])
    setLoading(false)
  }

  async function sincronizza() {
    setSincronizzando(true)
    try {
      const res = await fetch('/api/registro-iva/sincronizza', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore sincronizzazione')
      setToast({ msg: `${json.created} registrazioni create`, tipo: 'success' })
      await load()
    } catch (e: any) {
      setToast({ msg: e.message, tipo: 'error' })
    } finally {
      setSincronizzando(false)
    }
  }

  const righeFiltrate = useMemo(() => righe.filter(r => {
    if (tipoFiltro !== 'tutti' && r.tipo !== tipoFiltro) return false
    if (meseFiltro !== null) {
      const mese = new Date(r.data_operazione).getMonth() + 1
      if (mese !== meseFiltro) return false
    }
    return true
  }), [righe, tipoFiltro, meseFiltro])

  const totali = useMemo(() => {
    const byRegime: Record<string, number> = {}
    let totEntrate = 0, totUscite = 0
    for (const r of righeFiltrate) {
      byRegime[r.regime] = (byRegime[r.regime] ?? 0) + Number(r.totale)
      if (r.tipo === 'entrata') totEntrate += Number(r.totale)
      else totUscite += Number(r.totale)
    }
    return { byRegime, totEntrate, totUscite }
  }, [righeFiltrate])

  const exportCsv = () => {
    const params = new URLSearchParams({ anno: String(anno) })
    if (meseFiltro) params.set('mese', String(meseFiltro))
    if (tipoFiltro !== 'tutti') params.set('tipo', tipoFiltro)
    window.open(`/api/registro-iva/export-csv?${params}`, '_blank')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>

  return (
    <div>
      <PageHeader
        title="Registro IVA"
        subtitle={`Anno ${anno} — operazioni rilevanti ai fini IVA`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={sincronizza}
              disabled={sincronizzando}
            >
              {sincronizzando ? 'Sincronizzazione...' : 'Sincronizza pagamenti'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        }
      />

      {/* Banner normativo */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        padding: '12px 18px',
        marginBottom: 20,
        fontSize: 13,
        color: '#1e40af',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ</span>
        <span>
          <strong>Questo registro soddisfa gli obblighi di registrazione operazioni esenti IVA</strong>{' '}
          previsti dalla riforma 2026 (art. 10 DPR 633/72). Le operazioni esenti art. 10 non espongono
          IVA ma devono essere registrate con numero progressivo annuale.
        </span>
      </div>

      {/* Selezione anno + filtri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          className="input"
          style={{ width: 100 }}
          value={anno}
          onChange={e => { setAnno(Number(e.target.value)); setTimeout(load, 0) }}
        >
          {[2024, 2025, 2026, 2027].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ width: 140 }}
          value={meseFiltro ?? ''}
          onChange={e => setMeseFiltro(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Tutti i mesi</option>
          {MESI.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>

        {(['tutti', 'entrata', 'uscita'] as TipoFiltro[]).map(t => (
          <button
            key={t}
            className={`btn btn-sm ${tipoFiltro === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTipoFiltro(t)}
          >
            {{ tutti: 'Tutti', entrata: 'Entrate', uscita: 'Uscite' }[t]}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--grigio-4)' }}>
          {righeFiltrate.length} operazioni
        </div>
      </div>

      {/* Riepilogo per regime */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(totali.byRegime).map(([regime, tot]) => (
          <div key={regime} className="stat-card" style={{ flex: '0 0 auto', minWidth: 180 }}>
            <div className="stat-label">{REGIME_LABEL[regime] ?? regime}</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(tot)}</div>
          </div>
        ))}
        <div className="stat-card" style={{ flex: '0 0 auto', minWidth: 180 }}>
          <div className="stat-label">Totale entrate</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--verde)' }}>{fmt(totali.totEntrate)}</div>
        </div>
        <div className="stat-card" style={{ flex: '0 0 auto', minWidth: 180 }}>
          <div className="stat-label">Totale uscite</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--rosso)' }}>{fmt(totali.totUscite)}</div>
        </div>
      </div>

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N. Progressivo</th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Natura</th>
                <th>Controparte</th>
                <th style={{ textAlign: 'right' }}>Imponibile</th>
                <th style={{ textAlign: 'right' }}>IVA</th>
                <th style={{ textAlign: 'right' }}>Totale</th>
                <th>Regime</th>
              </tr>
            </thead>
            <tbody>
              {righeFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--grigio-4)' }}>
                    Nessuna operazione registrata per i filtri selezionati.{' '}
                    Usa <strong>Sincronizza pagamenti</strong> per importare i pagamenti esistenti.
                  </td>
                </tr>
              ) : righeFiltrate.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                    {r.numero_progressivo}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {new Date(r.data_operazione).toLocaleDateString('it-IT')}
                  </td>
                  <td>
                    <span className={`badge ${r.tipo === 'entrata' ? 'badge-verde' : 'badge-rosso'}`}>
                      {r.tipo === 'entrata' ? 'Entrata' : 'Uscita'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <div>{r.natura}</div>
                    {r.note && <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>{r.note}</div>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{r.controparte ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {fmt(Number(r.imponibile))}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {fmt(Number(r.iva))}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                    {fmt(Number(r.totale))}
                  </td>
                  <td><RegimeBadge regime={r.regime} /></td>
                </tr>
              ))}
            </tbody>
            {righeFiltrate.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, background: 'var(--grigio-6)' }}>
                  <td colSpan={5} style={{ fontSize: 12, padding: '10px' }}>Totale ({righeFiltrate.length} operazioni)</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '10px' }}>
                    {fmt(righeFiltrate.reduce((s, r) => s + Number(r.imponibile), 0))}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '10px' }}>
                    {fmt(righeFiltrate.reduce((s, r) => s + Number(r.iva), 0))}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, padding: '10px' }}>
                    {fmt(righeFiltrate.reduce((s, r) => s + Number(r.totale), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
