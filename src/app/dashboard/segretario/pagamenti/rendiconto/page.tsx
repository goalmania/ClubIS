'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui'

// ── Tipi ──────────────────────────────────────────────────────────────────────
interface MeseData {
  label: string
  anno: number
  mese: number
  /** Rate attese (tutte le rate non annullate, per scadenza del mese) */
  previsto: number
  /** Rate pagate in quel mese + prima_nota entrate del mese */
  entrate: number
  /** prima_nota uscite del mese */
  uscite: number
}

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// ── SVG Bar Chart (3 barre: previsto / entrate / uscite) ─────────────────────
function BarChart({ dati }: { dati: MeseData[] }) {
  const W = 660
  const H = 260
  const padL = 64
  const padB = 36
  const padT = 16
  const plotW = W - padL - 8
  const plotH = H - padB - padT

  const maxVal = Math.max(...dati.flatMap(d => [d.previsto, d.entrate, d.uscite]), 1)
  const nMesi = dati.length
  const groupW = plotW / nMesi
  const barW = Math.min(18, groupW * 0.28)
  const gap = 3

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f))
  const scaleY = (v: number) => padT + plotH - (v / maxVal) * plotH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: 260, overflow: 'visible' }}>
      {ticks.map((t, i) => {
        const y = scaleY(t)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - 8} y2={y} stroke="var(--grigio-5)" strokeWidth="1"
              strokeDasharray={i === 0 ? '0' : '4,3'} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--grigio-4)">
              {t >= 1000 ? `${Math.round(t / 1000)}k` : t}
            </text>
          </g>
        )
      })}

      {dati.map((d, i) => {
        const cx = padL + i * groupW + groupW / 2
        const x1 = cx - barW * 1.5 - gap
        const x2 = cx - barW / 2
        const x3 = cx + barW / 2 + gap

        return (
          <g key={i}>
            {/* Previsto (blu) */}
            <rect x={x1} y={scaleY(d.previsto)} width={barW} height={(d.previsto / maxVal) * plotH}
              fill="#3b82f6" opacity={0.8} rx={2}>
              <title>Previsto {d.label}: {fmt(d.previsto)}</title>
            </rect>
            {/* Entrate (verde) */}
            <rect x={x2} y={scaleY(d.entrate)} width={barW} height={(d.entrate / maxVal) * plotH}
              fill="#22c55e" opacity={0.9} rx={2}>
              <title>Entrate {d.label}: {fmt(d.entrate)}</title>
            </rect>
            {/* Uscite (rosso) */}
            <rect x={x3} y={scaleY(d.uscite)} width={barW} height={(d.uscite / maxVal) * plotH}
              fill="#ef4444" opacity={0.8} rx={2}>
              <title>Uscite {d.label}: {fmt(d.uscite)}</title>
            </rect>
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--grigio-4)">
              {d.label}
            </text>
          </g>
        )
      })}

      {/* Legenda */}
      <rect x={padL}       y={H - padB + 20} width={10} height={10} fill="#3b82f6" rx={2} />
      <text x={padL + 14}  y={H - padB + 29} fontSize="10" fill="var(--grigio-3)">Previsto (rate)</text>
      <rect x={padL + 100} y={H - padB + 20} width={10} height={10} fill="#22c55e" rx={2} />
      <text x={padL + 114} y={H - padB + 29} fontSize="10" fill="var(--grigio-3)">Entrate reali</text>
      <rect x={padL + 210} y={H - padB + 20} width={10} height={10} fill="#ef4444" rx={2} />
      <text x={padL + 224} y={H - padB + 29} fontSize="10" fill="var(--grigio-3)">Uscite</text>
    </svg>
  )
}

// ── Pagina ────────────────────────────────────────────────────────────────────
export default function RendicontoPage() {
  const supabase = createClient()
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [dati, setDati] = useState<MeseData[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)

  // Risolvi club_id una volta sola
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('utenti').select('club_id').eq('id', user.id).single()
        .then(({ data }) => { if (data) setClubId(data.club_id) })
    })
  }, [])

  // Ricarica quando anno o clubId cambiano
  useEffect(() => { if (clubId) load(clubId) }, [anno, clubId])

  // ── Realtime: ascolta rate_pagamento, prima_nota e piani_pagamento ──────────
  // Ogni modifica (da qualsiasi ruolo) triggera il reload immediato.
  useEffect(() => {
    if (!clubId) return
    const channel = supabase
      .channel(`rendiconto:${clubId}:${anno}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rate_pagamento',
        filter: `club_id=eq.${clubId}`,
      }, () => load(clubId))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'prima_nota',
        filter: `club_id=eq.${clubId}`,
      }, () => load(clubId))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'piani_pagamento',
        filter: `club_id=eq.${clubId}`,
      }, () => load(clubId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId, anno])

  // ── Carica dati da entrambe le fonti ─────────────────────────────────────────
  async function load(cid: string) {
    setLoading(true)

    const [{ data: rate }, { data: movimenti }] = await Promise.all([
      // 1. Piani di pagamento: rate attese e pagate
      supabase
        .from('rate_pagamento')
        .select('importo, scadenza, stato, data_pagamento')
        .eq('club_id', cid)
        .neq('stato', 'annullata')
        .gte('scadenza', `${anno}-01-01`)
        .lte('scadenza', `${anno}-12-31`),

      // 2. Prima nota: entrate e uscite manuali registrate da qualsiasi ruolo
      supabase
        .from('prima_nota')
        .select('tipo, importo, data, stornato')
        .eq('club_id', cid)
        .eq('stornato', false)
        .gte('data', `${anno}-01-01`)
        .lte('data', `${anno}-12-31`),
    ])

    const mensili: MeseData[] = Array.from({ length: 12 }, (_, m) => ({
      label: MESI[m], anno, mese: m, previsto: 0, entrate: 0, uscite: 0,
    }))

    // ── Contributo rate_pagamento ─────────────────────────────────────────────
    for (const r of rate ?? []) {
      // "Previsto" = tutte le rate attese per scadenza (pagate o no)
      const mScad = new Date(r.scadenza).getMonth()
      mensili[mScad].previsto += Number(r.importo)

      // "Entrate reali" = solo le rate effettivamente pagate, per mese di pagamento
      if (r.stato === 'pagata' && r.data_pagamento) {
        const dPag = new Date(r.data_pagamento)
        if (dPag.getFullYear() === anno) {
          mensili[dPag.getMonth()].entrate += Number(r.importo)
        }
      }
    }

    // ── Contributo prima_nota ─────────────────────────────────────────────────
    // Registrazioni manuali di qualsiasi ruolo (segretario, presidente, ecc.)
    for (const m of movimenti ?? []) {
      const mese = new Date(m.data).getMonth()
      if (m.tipo === 'entrata') {
        mensili[mese].entrate += Number(m.importo)
      } else if (m.tipo === 'uscita') {
        mensili[mese].uscite += Number(m.importo)
      }
    }

    setDati(mensili)
    setLoading(false)
  }

  const totPrevisto  = dati.reduce((s, d) => s + d.previsto,  0)
  const totEntrate   = dati.reduce((s, d) => s + d.entrate,   0)
  const totUscite    = dati.reduce((s, d) => s + d.uscite,    0)
  const saldo        = totEntrate - totUscite
  const deltaPrevist = totEntrate - totPrevisto

  return (
    <div>
      <PageHeader
        title="Rendiconto finanziario"
        subtitle="Rate attese · Entrate reali · Uscite — aggiornamento in tempo reale"
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select className="input" style={{ width: 120 }} value={anno}
              onChange={e => setAnno(parseInt(e.target.value))}>
              {[anno - 1, anno, anno + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
              Stampa / PDF
            </button>
          </div>
        }
      />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Rate attese {anno}</div>
          <div className="stat-value" style={{ color: '#3b82f6', fontSize: 22 }}>{fmt(totPrevisto)}</div>
          <div className="stat-sub">da piani di pagamento</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Entrate reali {anno}</div>
          <div className="stat-value" style={{ color: 'var(--verde)', fontSize: 22 }}>{fmt(totEntrate)}</div>
          <div className="stat-sub">rate pagate + prima nota</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uscite {anno}</div>
          <div className="stat-value" style={{ color: 'var(--rosso)', fontSize: 22 }}>{fmt(totUscite)}</div>
          <div className="stat-sub">da prima nota</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Saldo netto</div>
          <div className="stat-value" style={{ color: saldo >= 0 ? 'var(--verde)' : 'var(--rosso)', fontSize: 22 }}>
            {saldo >= 0 ? '+' : ''}{fmt(saldo)}
          </div>
          <div className="stat-sub" style={{ color: deltaPrevist >= 0 ? 'var(--verde)' : 'var(--rosso)' }}>
            {deltaPrevist >= 0 ? '+' : ''}{fmt(deltaPrevist)} vs atteso
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
      ) : (
        <>
          {/* Grafico */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              Andamento mensile {anno}
            </div>
            <BarChart dati={dati} />
          </div>

          {/* Tabella */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--grigio-5)', fontSize: 13, fontWeight: 600 }}>
              Riepilogo per mese
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th style={{ textAlign: 'right' }}>Rate attese</th>
                    <th style={{ textAlign: 'right' }}>Entrate reali</th>
                    <th style={{ textAlign: 'right' }}>Uscite</th>
                    <th style={{ textAlign: 'right' }}>Saldo netto</th>
                    <th>Incasso vs atteso</th>
                  </tr>
                </thead>
                <tbody>
                  {dati.map((d, i) => {
                    const saldoMese = d.entrate - d.uscite
                    const delta = d.entrate - d.previsto
                    const pct = d.previsto > 0 ? Math.min(100, Math.round((d.entrate / d.previsto) * 100)) : (d.entrate > 0 ? 100 : 0)
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{d.label} {anno}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {fmt(d.previsto)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--verde)' }}>
                          {fmt(d.entrate)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: d.uscite > 0 ? 'var(--rosso)' : undefined }}>
                          {d.uscite > 0 ? `−${fmt(d.uscite)}` : fmt(0)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: saldoMese >= 0 ? 'var(--verde)' : 'var(--rosso)' }}>
                          {saldoMese >= 0 ? '+' : ''}{fmt(saldoMese)}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, background: 'var(--grigio-5)', borderRadius: 4, height: 6 }}>
                              <div style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? 'var(--verde)' : '#3b82f6',
                                height: 6, borderRadius: 4, transition: 'width 0.3s',
                              }} />
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', width: 32 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: 'var(--grigio-6)', fontWeight: 700 }}>
                    <td>Totale</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(totPrevisto)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--verde)' }}>{fmt(totEntrate)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--rosso)' }}>
                      {totUscite > 0 ? `−${fmt(totUscite)}` : fmt(0)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: saldo >= 0 ? 'var(--verde)' : 'var(--rosso)' }}>
                      {saldo >= 0 ? '+' : ''}{fmt(saldo)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
    </div>
  )
}
