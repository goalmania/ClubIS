'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ─── Costanti ───────────────────────────────────────────────────── */

const STAGIONI = ['2024-25', '2025-26', '2026-27', '2027-28']

const categoriaLabel: Record<string, string> = {
  ingaggi: 'Ingaggi',
  rimborsi_giocatori: 'Rimborsi Giocatori',
  staff_tecnico: 'Staff Tecnico',
  trasferte: 'Trasferte',
  affiliazioni: 'Affiliazioni FIGC',
  arbitraggi: 'Arbitraggi',
  materiale: 'Materiale Sportivo',
  strutture: 'Strutture / Campo',
  altro_uscite: 'Altro (Uscite)',
  quote_famiglie: 'Quote Famiglie',
  sponsorizzazioni: 'Sponsorizzazioni',
  contributi: 'Contributi',
  botteghino: 'Botteghino',
  cessioni: 'Cessioni',
  altro_entrate: 'Altro (Entrate)',
}

const USCITE_COLORS = [
  '#c8f000', '#00c8a0', '#ffaa00', '#ff8844',
  '#ff4444', '#8844ff', '#44aaff', '#ff44aa', '#aaaaff',
]

const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

/* ─── Tipi ───────────────────────────────────────────────────────── */

interface BudgetItem {
  id: string
  categoria: string
  tipo: 'entrata' | 'uscita'
  budget_annuo: number
  speso_ytd: number
  note: string | null
}

interface MeseData {
  label: string
  entrate: number
  uscite: number
}

/* ─── DonutChart ─────────────────────────────────────────────────── */

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 200
  const radius = 80
  const circumference = 2 * Math.PI * radius

  let offset = 0
  const segments = data
    .filter(d => d.value > 0)
    .map(d => {
      const dash = total > 0 ? (d.value / total) * circumference : 0
      const seg = { ...d, dash, gap: circumference - dash, offset }
      offset += dash
      return seg
    })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {segments.length === 0 ? (
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--grigio-5)" strokeWidth={28} />
      ) : segments.map((s, i) => (
        <circle key={i}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={28}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }}
        />
      ))}
      <circle cx={size / 2} cy={size / 2} r={60} fill="var(--gray-light)" />
    </svg>
  )
}

/* ─── BudgetBars ─────────────────────────────────────────────────── */

function BudgetBars({ items }: { items: BudgetItem[] }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 100) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map(item => {
        const perc = item.budget_annuo > 0 ? (item.speso_ytd / item.budget_annuo) * 100 : 0
        const overBudget = item.speso_ytd > item.budget_annuo && item.budget_annuo > 0
        const barColor = overBudget ? 'var(--rosso)' : perc > 70 ? 'var(--ambra)' : 'var(--accent)'
        return (
          <div key={item.categoria}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontSize: 11, color: 'var(--grigio-2)',
              }}>
                {categoriaLabel[item.categoria] ?? item.categoria}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: overBudget ? 'var(--rosso)' : 'var(--grigio-3)' }}>
                {fmt(item.speso_ytd)} / {fmt(item.budget_annuo)}
              </span>
            </div>
            <div style={{ position: 'relative', height: 8, background: 'var(--grigio-5)' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                height: '100%',
                width: animated ? `${Math.min(100, perc)}%` : '0%',
                background: barColor,
                transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── LineChart ──────────────────────────────────────────────────── */

function LineChart({ mesi }: { mesi: MeseData[] }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 200) }, [])

  const W = 560, H = 160
  const maxVal = Math.max(...mesi.flatMap(m => [m.entrate, m.uscite]), 1)
  const xStep = mesi.length > 1 ? W / (mesi.length - 1) : W
  const toY = (v: number) => H - (v / maxVal) * (H - 20) - 10
  const toX = (i: number) => i * xStep

  const pathEntrate = mesi.map((m, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(m.entrate).toFixed(1)}`).join(' ')
  const pathUscite  = mesi.map((m, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(m.uscite).toFixed(1)}`).join(' ')
  const pathLen = 2000

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H + 30} viewBox={`0 0 ${W} ${H + 30}`}>
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={0} x2={W} y1={toY(maxVal * p)} y2={toY(maxVal * p)}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        <path d={pathEntrate} fill="none" stroke="var(--accent)" strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={animated ? 0 : pathLen}
          style={{ transition: 'stroke-dashoffset 1.5s ease' }}
        />
        <path d={pathUscite} fill="none" stroke="var(--rosso)" strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={animated ? 0 : pathLen}
          style={{ transition: 'stroke-dashoffset 1.5s ease 0.3s' }}
        />
        {mesi.map((m, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(m.entrate)} r={3} fill="var(--accent)" />
            <circle cx={toX(i)} cy={toY(m.uscite)} r={3} fill="var(--rosso)" />
            <text x={toX(i)} y={H + 20} textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#555' }}>
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 11, fontFamily: 'var(--font-display)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 2, background: 'var(--accent)' }} />
          <span style={{ color: 'var(--grigio-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entrate</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 2, background: 'var(--rosso)' }} />
          <span style={{ color: 'var(--grigio-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Uscite</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Pagina principale ──────────────────────────────────────────── */

export default function BudgetPage() {
  const supabase = createClient()

  const [clubId, setClubId]       = useState<string | null>(null)
  const [stagione, setStagione]   = useState('2026-27')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [editValues, setEditValues]   = useState<Record<string, number>>({})
  const [mesiData, setMesiData]   = useState<MeseData[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('utenti').select('club_id').eq('id', user.id).single()
        .then(({ data }) => { if (data) setClubId(data.club_id) })
    })
  }, [])

  useEffect(() => {
    if (!clubId) return
    setLoading(true)
    supabase
      .from('budget_societario')
      .select('*')
      .eq('club_id', clubId)
      .eq('stagione', stagione)
      .then(({ data }) => {
        const items = (data ?? []) as BudgetItem[]
        setBudgetItems(items)
        const evs: Record<string, number> = {}
        items.forEach(i => { evs[i.id] = i.budget_annuo })
        setEditValues(evs)
        setLoading(false)
      })
  }, [clubId, stagione])

  useEffect(() => {
    if (!clubId) return
    const anno = parseInt(stagione.slice(0, 4))
    supabase
      .from('prima_nota')
      .select('tipo, importo, data')
      .eq('club_id', clubId)
      .gte('data', `${anno}-01-01`)
      .lte('data', `${anno}-12-31`)
      .then(({ data: pnData }) => {
        const mesi = Array.from({ length: 12 }, (_, i) => {
          const mese = String(i + 1).padStart(2, '0')
          const filtrati = pnData?.filter(r => r.data.startsWith(`${anno}-${mese}`)) ?? []
          return {
            label: new Date(anno, i).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase(),
            entrate: filtrati.filter(r => r.tipo === 'entrata').reduce((s, r) => s + Number(r.importo), 0),
            uscite:  filtrati.filter(r => r.tipo === 'uscita').reduce((s, r) => s + Number(r.importo), 0),
          }
        })
        setMesiData(mesi)
      })
  }, [clubId, stagione])

  async function salvaBudget(id: string) {
    const val = editValues[id] ?? 0
    setSaving(id)
    await supabase.from('budget_societario').update({ budget_annuo: val }).eq('id', id)
    setBudgetItems(prev => prev.map(i => i.id === id ? { ...i, budget_annuo: val } : i))
    setSaving(null)
  }

  const uscite  = budgetItems.filter(i => i.tipo === 'uscita')
  const entrate = budgetItems.filter(i => i.tipo === 'entrata')

  const totBudgetUscite  = uscite.reduce((s, i) => s + i.budget_annuo, 0)
  const totSpesoUscite   = uscite.reduce((s, i) => s + i.speso_ytd, 0)
  const totBudgetEntrate = entrate.reduce((s, i) => s + i.budget_annuo, 0)
  const percUtilizzato   = totBudgetUscite > 0 ? Math.round((totSpesoUscite / totBudgetUscite) * 100) : 0
  const residuo          = totBudgetUscite - totSpesoUscite

  // FPF
  const saldoFPF       = totBudgetEntrate - totBudgetUscite
  const ingaggiTot     = uscite.find(i => i.categoria === 'ingaggi')?.budget_annuo ?? 0
  const coperturaPct   = totBudgetEntrate > 0 ? Math.round((ingaggiTot / totBudgetEntrate) * 100) : 0
  const indiceStab     = totBudgetEntrate > 0 ? saldoFPF / totBudgetEntrate : 0
  const statusFPF      = indiceStab > 0.1 ? 'verde' : indiceStab > 0 ? 'ambra' : 'rosso'
  const statusColor    = statusFPF === 'verde' ? 'var(--verde)' : statusFPF === 'ambra' ? 'var(--ambra)' : 'var(--rosso)'

  const donutData = uscite
    .filter(i => i.budget_annuo > 0)
    .map((i, idx) => ({
      label: categoriaLabel[i.categoria] ?? i.categoria,
      value: i.budget_annuo,
      color: USCITE_COLORS[idx % USCITE_COLORS.length],
    }))

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-3)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      Caricamento…
    </div>
  )

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Budget Societario
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            Pianificazione finanziaria & Fair Play Finanziario
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STAGIONI.map(s => (
            <button key={s} onClick={() => setStagione(s)} style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              background: stagione === s ? 'var(--accent)' : 'var(--grigio-5)',
              color: stagione === s ? 'var(--black)' : 'var(--grigio-2)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: stagione === s ? 700 : 400,
              letterSpacing: '0.05em',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* KPI uscite */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Budget Uscite</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--rosso)', marginTop: 4 }}>{fmt(totBudgetUscite)}</div>
          <div className="stat-sub">totale pianificato</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Speso YTD</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ambra)', marginTop: 4 }}>{fmt(totSpesoUscite)}</div>
          <div className="stat-sub">anno in corso</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Budget Utilizzato</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: percUtilizzato > 90 ? 'var(--rosso)' : percUtilizzato > 70 ? 'var(--ambra)' : 'var(--accent)', marginTop: 4 }}>
            {percUtilizzato}%
          </div>
          <div className="stat-sub">su budget totale</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Budget Residuo</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: residuo < 0 ? 'var(--rosso)' : 'var(--verde)', marginTop: 4 }}>
            {fmt(residuo)}
          </div>
          <div className="stat-sub">{residuo < 0 ? '⚠ sforato' : 'disponibile'}</div>
        </div>
      </div>

      {/* Grafici: donut + barre */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', marginBottom: 12 }}>
            Distribuzione Uscite
          </div>
          <DonutChart data={donutData} />
          <div style={{ marginTop: 12, width: '100%' }}>
            {donutData.slice(0, 5).map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--grigio-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', marginBottom: 16 }}>
            Budget vs Speso per Categoria
          </div>
          <BudgetBars items={uscite} />
        </div>
      </div>

      {/* Line chart mensile */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', marginBottom: 16 }}>
          Entrate vs Uscite Mensili — {stagione.slice(0, 4)}
        </div>
        <LineChart mesi={mesiData} />
      </div>

      {/* Tabella uscite con editing */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--white)' }}>
            Dettaglio Uscite
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-3)' }}>
            Modifica budget → salva con TAB o clic fuori
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--grigio-5)' }}>
              {['Categoria', 'Budget Annuo', 'Speso YTD', 'Avanzamento', 'Residuo'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uscite.map(item => {
              const perc = item.budget_annuo > 0 ? Math.round((item.speso_ytd / item.budget_annuo) * 100) : 0
              const barColor = perc > 90 ? 'var(--rosso)' : perc > 70 ? 'var(--ambra)' : 'var(--accent)'
              const res = item.budget_annuo - item.speso_ytd
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--grigio-6)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, color: 'var(--grigio-2)' }}>
                    {categoriaLabel[item.categoria] ?? item.categoria}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number"
                      value={editValues[item.id] ?? item.budget_annuo}
                      onChange={e => setEditValues(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                      onBlur={() => salvaBudget(item.id)}
                      style={{
                        width: 120,
                        background: 'var(--grigio-6)',
                        border: `1px solid ${saving === item.id ? 'var(--accent)' : 'var(--grigio-5)'}`,
                        color: 'var(--white)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        padding: '5px 8px',
                        outline: 'none',
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>
                    {fmt(item.speso_ytd)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--grigio-5)' }}>
                        <div style={{ width: `${Math.min(100, perc)}%`, height: '100%', background: barColor, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 35, color: barColor }}>
                        {perc}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: res < 0 ? 'var(--rosso)' : 'var(--grigio-3)' }}>
                    {fmt(res)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid var(--grigio-5)', background: 'var(--grigio-6)' }}>
              <td style={{ padding: '11px 16px', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-2)' }}>Totale</td>
              <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>{fmt(totBudgetUscite)}</td>
              <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--ambra)' }}>{fmt(totSpesoUscite)}</td>
              <td style={{ padding: '11px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--grigio-5)' }}>
                    <div style={{ width: `${Math.min(100, percUtilizzato)}%`, height: '100%', background: percUtilizzato > 90 ? 'var(--rosso)' : percUtilizzato > 70 ? 'var(--ambra)' : 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 35 }}>{percUtilizzato}%</span>
                </div>
              </td>
              <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: residuo < 0 ? 'var(--rosso)' : 'var(--verde)' }}>{fmt(residuo)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tabella entrate con editing */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 40 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--verde)' }}>
            Entrate Previste
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--verde)' }}>
            {fmt(totBudgetEntrate)}
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--grigio-5)' }}>
              {['Categoria', 'Budget Annuo', 'Incassato YTD', 'Da Incassare'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grigio-3)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entrate.map(item => {
              const res = item.budget_annuo - item.speso_ytd
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--grigio-6)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, color: 'var(--grigio-2)' }}>
                    {categoriaLabel[item.categoria] ?? item.categoria}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number"
                      value={editValues[item.id] ?? item.budget_annuo}
                      onChange={e => setEditValues(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                      onBlur={() => salvaBudget(item.id)}
                      style={{
                        width: 120,
                        background: 'var(--grigio-6)',
                        border: `1px solid ${saving === item.id ? 'var(--accent)' : 'var(--grigio-5)'}`,
                        color: 'var(--white)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        padding: '5px 8px',
                        outline: 'none',
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--verde)' }}>
                    {fmt(item.speso_ytd)}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: res < 0 ? 'var(--ambra)' : 'var(--grigio-3)' }}>
                    {fmt(res)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Fair Play Finanziario ─────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--white)', marginBottom: 4 }}>
          Fair Play Finanziario
        </h2>
        <p style={{ fontSize: 13, color: 'var(--grigio-3)' }}>
          Indicatori di sostenibilità economica per categorie dilettantistiche
        </p>
      </div>

      {/* Banner status */}
      <div style={{
        padding: '12px 16px',
        marginBottom: 20,
        background: statusFPF === 'verde' ? 'rgba(0,200,100,0.08)' : statusFPF === 'ambra' ? 'rgba(255,170,0,0.08)' : 'rgba(255,68,68,0.08)',
        border: `1px solid ${statusColor}`,
        fontSize: 12,
        color: statusColor,
        fontFamily: 'var(--font-display)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {statusFPF === 'verde' && '✓ Situazione sostenibile — entrate coprono le uscite con margine positivo'}
        {statusFPF === 'ambra' && '⚠ Situazione in equilibrio — monitorare le uscite straordinarie'}
        {statusFPF === 'rosso' && '✗ Attenzione: le uscite previste superano le entrate pianificate'}
      </div>

      {/* KPI FPF */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="stat-card">
          <div className="stat-label">Saldo Stagionale</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: saldoFPF >= 0 ? 'var(--verde)' : 'var(--rosso)', marginTop: 4 }}>
            {saldoFPF >= 0 ? '+' : ''}{fmt(saldoFPF)}
          </div>
          <div className="stat-sub">entrate − uscite previste</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Copertura Ingaggi</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: coperturaPct > 70 ? 'var(--rosso)' : coperturaPct > 50 ? 'var(--ambra)' : 'var(--verde)', marginTop: 4 }}>
            {coperturaPct}%
          </div>
          <div className="stat-sub" style={{ color: coperturaPct > 70 ? 'var(--rosso)' : undefined }}>
            {coperturaPct > 70 ? '⚠ soglia 70% superata' : 'ingaggi / entrate'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Indice Liquidità</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--grigio-3)', marginTop: 4 }}>—</div>
          <div className="stat-sub">configura cassa disponibile</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status FPF</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: statusColor, marginTop: 4, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ● {statusFPF === 'verde' ? 'Verde' : statusFPF === 'ambra' ? 'Ambra' : 'Rosso'}
          </div>
          <div className="stat-sub">{(indiceStab * 100).toFixed(1)}% margine</div>
        </div>
      </div>

    </div>
  )
}
