'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Toast, StatCard } from '@/components/ui'

type TrasfertaRow = {
  id: string
  destinazione: string
  data_partenza: string
  data_rientro: string | null
  mezzo: string | null
  costo_stimato: number | null
  costo_effettivo: number | null
  partita_id: string | null
  competizione?: string
  stagione?: string
}

type PartitaRow = {
  id: string
  competizione: string | null
  squadra_id: string
}

type SquadraRow = {
  id: string
  stagione: string
}

function toISODateInput(d: Date) {
  return d.toISOString().split('T')[0]
}

function fmtEuro(v: number) {
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function computeDelta(stimato: number | null, reale: number | null) {
  const s = stimato ?? 0
  const e = reale ?? 0
  return e - s
}

function toCsvCell(v: unknown) {
  const s = v == null ? '' : String(v)
  const escaped = s.replace(/"/g, '""')
  return `"${escaped}"`
}

export default function CostiTrasferteStagioneCard() {
  const supabase = useMemo(() => createClient(), [])

  const today = useMemo(() => new Date(), [])
  const defaultStart = useMemo(() => new Date(Date.now() - 180 * 86400000), [])

  const [startDate, setStartDate] = useState<string>(toISODateInput(defaultStart))
  const [endDate, setEndDate] = useState<string>(toISODateInput(today))

  const [competizione, setCompetizione] = useState<string>('tutte')

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)

  const [clubId, setClubId] = useState<string | null>(null)
  const [rows, setRows] = useState<TrasfertaRow[]>([])

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (utente?.club_id) setClubId(utente.club_id)
    })()
  }, [supabase])

  const load = async (s: string, e: string) => {
    if (!clubId) return
    setLoading(true)
    try {
      const [squadreRes, partiteRes, trasferteRes] = await Promise.all([
        supabase.from('squadre').select('id, stagione').eq('club_id', clubId),
        supabase
          .from('partite')
          .select('id, competizione, squadra_id')
          .eq('club_id', clubId)
          .gte('data_ora', new Date(s).toISOString())
          .lte('data_ora', new Date(e).toISOString()),
        supabase
          .from('trasferte')
          .select('id, destinazione, data_partenza, data_rientro, mezzo, costo_stimato, costo_effettivo, partita_id')
          .eq('club_id', clubId)
          .lte('data_partenza', e)
          .gte('data_rientro', s),
      ])

      const squadre = (squadreRes.data ?? []) as SquadraRow[]
      const partite = (partiteRes.data ?? []) as PartitaRow[]
      const trasferte = (trasferteRes.data ?? []) as any[]

      const squadreMap = new Map(squadre.map(x => [x.id, x.stagione]))
      const partiteMap = new Map(partite.map(p => [p.id, p]))

      const enriched: TrasfertaRow[] = trasferte.map(t => {
        const p = t.partita_id ? partiteMap.get(t.partita_id) : undefined
        return {
          id: t.id,
          destinazione: t.destinazione,
          data_partenza: t.data_partenza,
          data_rientro: t.data_rientro,
          mezzo: t.mezzo,
          costo_stimato: t.costo_stimato ?? null,
          costo_effettivo: t.costo_effettivo ?? null,
          partita_id: t.partita_id ?? null,
          competizione: p?.competizione ?? undefined,
          stagione: p ? squadreMap.get(p.squadra_id) : undefined,
        }
      })

      setRows(enriched)

      const comps = Array.from(new Set(enriched.map(r => r.competizione).filter(Boolean))) as string[]
      if (!comps.includes(competizione) && competizione !== 'tutte') setCompetizione('tutte')
    } catch (e: any) {
      setToast({ msg: e?.message ?? 'Errore caricamento costi trasferte', tipo: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clubId) return
    void load(startDate, endDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, startDate, endDate])

  const availableCompetizioni = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      if (r.competizione) set.add(r.competizione)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'))
  }, [rows])

  const filtered = useMemo(() => {
    if (competizione === 'tutte') return rows
    return rows.filter(r => r.competizione === competizione)
  }, [rows, competizione])

  const latestSeason = useMemo(() => {
    if (filtered.length === 0) return null
    const sorted = [...filtered].sort((a, b) => new Date(b.data_partenza).getTime() - new Date(a.data_partenza).getTime())
    return sorted[0].stagione ?? null
  }, [filtered])

  const filteredForSeason = useMemo(() => {
    if (!latestSeason) return filtered
    return filtered.filter(r => (r.stagione ?? null) === latestSeason)
  }, [filtered, latestSeason])

  const totals = useMemo(() => {
    const totalStimato = filteredForSeason.reduce((s, r) => s + (r.costo_stimato ?? 0), 0)
    const totalReale = filteredForSeason.reduce((s, r) => s + (r.costo_effettivo ?? 0), 0)
    const delta = totalReale - totalStimato
    return { totalStimato, totalReale, delta }
  }, [filteredForSeason])

  const downloadCsv = () => {
    const header = [
      'id',
      'destinazione',
      'data_partenza',
      'data_rientro',
      'competizione',
      'mezzo',
      'costo_stimato',
      'costo_effettivo',
      'delta',
      'stagione',
    ]
    const lines = filtered.map(r => {
      const delta = computeDelta(r.costo_stimato, r.costo_effettivo)
      return [
        r.id,
        r.destinazione,
        r.data_partenza,
        r.data_rientro ?? '',
        r.competizione ?? '',
        r.mezzo ?? '',
        r.costo_stimato ?? '',
        r.costo_effettivo ?? '',
        delta,
        r.stagione ?? '',
      ]
    })

    const csv = [header, ...lines]
      .map(row => row.map(toCsvCell).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `costi-trasferte-stagione_${startDate}_to_${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {toast && (
        <Toast
          msg={toast.msg}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}

      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Costi Trasferte Stagione</span>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {latestSeason ? `Stagione: ${latestSeason}` : 'Nessun dato'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadCsv} disabled={filtered.length === 0}>
            Esporta CSV
          </button>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 14, marginBottom: 16 }}>
          <div>
            <div className="label">Periodo - inizio</div>
            <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <div className="label">Periodo - fine</div>
            <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <div className="label">Competizione</div>
            <select className="input" value={competizione} onChange={e => setCompetizione(e.target.value)}>
              <option value="tutte">Tutte</option>
              {availableCompetizioni.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '26px 0', color: 'var(--text-muted)', textAlign: 'center' }}>Caricamento…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
              <StatCard label="Totale stimato" value={fmtEuro(totals.totalStimato)} color="var(--accent-orange)" />
              <StatCard label="Totale reale" value={fmtEuro(totals.totalReale)} color="var(--accent-green)" />
              <StatCard
                label="Delta"
                value={`${totals.delta >= 0 ? '+' : ''}${fmtEuro(totals.delta)}`}
                color={totals.delta <= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                sub={totals.delta <= 0 ? 'Risparmio' : 'Sforamento'}
              />
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nessuna trasferta nel periodo selezionato
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(t => {
                  const stimato = t.costo_stimato ?? 0
                  const reale = t.costo_effettivo ?? 0
                  const delta = reale - stimato
                  const max = Math.max(stimato, reale, 1)

                  return (
                    <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-card)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.destinazione}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {new Date(t.data_partenza).toLocaleDateString('it-IT')}
                            {t.data_rientro ? ` → ${new Date(t.data_rientro).toLocaleDateString('it-IT')}` : ''}
                            {t.competizione ? ` · ${t.competizione}` : ''}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: delta <= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
                          {delta >= 0 ? '+' : ''}{fmtEuro(delta)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                            <span>Stimato</span>
                            <span>{t.costo_stimato != null ? fmtEuro(stimato) : '—'}</span>
                          </div>
                          <div className="progress" aria-hidden>
                            <div className="progress-fill" style={{ width: `${(stimato / max) * 100}%`, background: 'var(--accent-orange)' }} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                            <span>Reale</span>
                            <span>{t.costo_effettivo != null ? fmtEuro(reale) : '—'}</span>
                          </div>
                          <div className="progress" aria-hidden>
                            <div className="progress-fill" style={{ width: `${(reale / max) * 100}%`, background: 'var(--accent-green)' }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                        Mezzo: {t.mezzo ?? '—'} · Stagione: {t.stagione ?? '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

