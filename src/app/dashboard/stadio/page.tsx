'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui'
import FeatureGate from '@/components/FeatureGate'

type Settore = {
  id?: string
  nome: string
  capienza: number
  colore: string
  ordine: number
}

type ConfigStadio = {
  id: string
  nome: string
  indirizzo: string
  capienza_totale: number
}

type Partita = {
  id: string
  avversario: string
  data_ora: string
}

type BiglietteriaRow = {
  id?: string
  partita_id: string
  settore_id: string
  prezzo: number
  venduti: number
}

const ALLOWED_ROLES = new Set(['presidente', 'segretario', 'team_manager', 'ds'])

export default function StadioPage() {
  const supabase = useMemo(() => createClient(), [])
  const [clubId, setClubId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savingBiglietteria, setSavingBiglietteria] = useState(false)
  const [savingSettore, setSavingSettore] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)

  const [config, setConfig] = useState<ConfigStadio | null>(null)
  const [nomeStadio, setNomeStadio] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [capienzaTotale, setCapienzaTotale] = useState(0)
  const [settori, setSettori] = useState<Settore[]>([])
  const [deletedSettoriIds, setDeletedSettoriIds] = useState<string[]>([])

  const [partite, setPartite] = useState<Partita[]>([])
  const [partitaSel, setPartitaSel] = useState('')
  const [biglietteria, setBiglietteria] = useState<Record<string, { prezzo: number; venduti: number; rowId?: string }>>({})
  const [storico, setStorico] = useState<BiglietteriaRow[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: utente, error: utenteError } = await supabase
        .from('utenti')
        .select('id, club_id, ruolo')
        .eq('id', user.id)
        .single()

      if (utenteError || !utente) {
        window.location.href = '/auth/errore'
        return
      }
      if (!ALLOWED_ROLES.has(utente.ruolo)) {
        window.location.href = '/dashboard'
        return
      }

      setClubId(utente.club_id)
      const oggi = new Date().toISOString()

      const { data: sqData } = await supabase.from('squadre').select('id').eq('club_id', utente.club_id)
      const sqIds = sqData?.map(s => s.id) ?? []
      const sqFilter = sqIds.length ? sqIds : ['00000000-0000-0000-0000-000000000000']

      const [{ data: cfg }, { data: pp }, { data: bb }] = await Promise.all([
        supabase.from('stadio_configurazioni').select('id, nome, indirizzo, capienza_totale, stadio_settori(id, nome, capienza, colore, ordine)').eq('club_id', utente.club_id).maybeSingle(),
        supabase.from('partite').select('id, avversario, data_ora').in('squadra_id', sqFilter).gte('data_ora', oggi).order('data_ora').limit(30),
        supabase.from('stadio_biglietteria_partita').select('id, partita_id, settore_id, prezzo, venduti').eq('club_id', utente.club_id),
      ])

      if (cfg) {
        setConfig({ id: cfg.id, nome: cfg.nome, indirizzo: cfg.indirizzo, capienza_totale: cfg.capienza_totale })
        setNomeStadio(cfg.nome)
        setIndirizzo(cfg.indirizzo ?? '')
        setCapienzaTotale(cfg.capienza_totale ?? 0)
        const ss = ((cfg as any).stadio_settori ?? []) as any[]
        setSettori(ss.sort((a, b) => a.ordine - b.ordine))
      } else {
        setSettori([
          { nome: 'Tribuna', capienza: 500, colore: '#3b82f6', ordine: 1 },
          { nome: 'Curva Nord', capienza: 800, colore: '#22c55e', ordine: 2 },
          { nome: 'Curva Sud', capienza: 700, colore: '#f59e0b', ordine: 3 },
        ])
      }

      setPartite((pp ?? []) as Partita[])
      setStorico((bb ?? []) as BiglietteriaRow[])
      setLoading(false)
    }
    load()
  }, [supabase])

  useEffect(() => {
    if (!partitaSel) return
    const rows = storico.filter(r => r.partita_id === partitaSel)
    const map: Record<string, { prezzo: number; venduti: number; rowId?: string }> = {}
    for (const s of settori) {
      const found = rows.find(r => r.settore_id === s.id)
      map[s.id ?? `tmp-${s.ordine}`] = { prezzo: Number(found?.prezzo ?? 0), venduti: Number(found?.venduti ?? 0), rowId: found?.id }
    }
    setBiglietteria(map)
  }, [partitaSel, storico, settori])

  const addSettore = () => {
    setSettori(prev => [
      ...prev,
      { nome: `Settore ${prev.length + 1}`, capienza: 100, colore: '#64748b', ordine: prev.length + 1 },
    ])
  }

  const removeSettore = (idx: number) => {
    setSettori(prev => {
      const curr = prev[idx]
      if (curr?.id) setDeletedSettoriIds(ids => [...ids, curr.id!])
      const next = prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordine: i + 1 }))
      return next
    })
  }

  const saveConfigurazione = async () => {
    if (!nomeStadio.trim()) {
      setToast({ msg: 'Inserisci il nome dello stadio', tipo: 'error' })
      return
    }
    setSavingConfig(true)

    let cfgId = config?.id
    if (!cfgId) {
      const { data, error } = await supabase
        .from('stadio_configurazioni')
        .insert({
          club_id: clubId,
          nome: nomeStadio.trim(),
          indirizzo: indirizzo.trim(),
          capienza_totale: capienzaTotale || 0,
        })
        .select('id')
        .single()
      if (error || !data) {
        setSavingConfig(false)
        setToast({ msg: error?.message ?? 'Errore salvataggio configurazione', tipo: 'error' })
        return
      }
      cfgId = data.id
      setConfig({ id: cfgId!, nome: nomeStadio.trim(), indirizzo: indirizzo.trim(), capienza_totale: capienzaTotale || 0 })
    } else {
      const { error } = await supabase
        .from('stadio_configurazioni')
        .update({ nome: nomeStadio.trim(), indirizzo: indirizzo.trim(), capienza_totale: capienzaTotale || 0 })
        .eq('id', cfgId)
      if (error) {
        setSavingConfig(false)
        setToast({ msg: error.message, tipo: 'error' })
        return
      }
    }

    if (deletedSettoriIds.length > 0) {
      await supabase.from('stadio_settori').delete().in('id', deletedSettoriIds)
      setDeletedSettoriIds([])
    }

    for (const s of settori) {
      if (s.id) {
        await supabase
          .from('stadio_settori')
          .update({ nome: s.nome, capienza: s.capienza, colore: s.colore, ordine: s.ordine })
          .eq('id', s.id)
      } else {
        await supabase
          .from('stadio_settori')
          .insert({ configurazione_id: cfgId, nome: s.nome, capienza: s.capienza, colore: s.colore, ordine: s.ordine })
      }
    }

    const { data: reloaded } = await supabase
      .from('stadio_settori')
      .select('id, nome, capienza, colore, ordine')
      .eq('configurazione_id', cfgId!)
      .order('ordine')
    setSettori((reloaded ?? []) as Settore[])
    setSavingConfig(false)
    setToast({ msg: 'Configurazione stadio salvata', tipo: 'success' })
  }

  const saveBiglietteria = async () => {
    if (!partitaSel) {
      setToast({ msg: 'Seleziona una partita', tipo: 'error' })
      return
    }
    setSavingBiglietteria(true)

    const payload = settori
      .filter(s => s.id)
      .map(s => {
        const key = s.id!
        const rowId = biglietteria[key]?.rowId
        return {
          ...(rowId ? { id: rowId } : {}),
          club_id: clubId,
          partita_id: partitaSel,
          settore_id: key,
          prezzo: Number(biglietteria[key]?.prezzo ?? 0),
          venduti: Number(biglietteria[key]?.venduti ?? 0),
        }
      })

    const { error } = await supabase.from('stadio_biglietteria_partita').upsert(payload, { onConflict: 'partita_id,settore_id' })
    if (error) {
      setSavingBiglietteria(false)
      setToast({ msg: error.message, tipo: 'error' })
      return
    }

    const { data: bb } = await supabase
      .from('stadio_biglietteria_partita')
      .select('id, partita_id, settore_id, prezzo, venduti')
      .eq('club_id', clubId)
    setStorico((bb ?? []) as BiglietteriaRow[])
    setSavingBiglietteria(false)
    setToast({ msg: 'Biglietteria salvata', tipo: 'success' })
  }

  const calcSettore = (s: Settore) => {
    const key = s.id ?? `tmp-${s.ordine}`
    const venduti = Number(biglietteria[key]?.venduti ?? 0)
    const prezzo = Number(biglietteria[key]?.prezzo ?? 0)
    const ricavo = venduti * prezzo
    const liberi = Math.max(s.capienza - venduti, 0)
    const riempimento = s.capienza > 0 ? Math.round((venduti / s.capienza) * 100) : 0
    return { venduti, prezzo, ricavo, liberi, riempimento }
  }

  const totaliPartita = settori.reduce(
    (acc, s) => {
      const c = calcSettore(s)
      acc.capienza += s.capienza || 0
      acc.venduti += c.venduti
      acc.ricavo += c.ricavo
      return acc
    },
    { capienza: 0, venduti: 0, ricavo: 0 },
  )
  const riempimentoTot = totaliPartita.capienza > 0 ? Math.round((totaliPartita.venduti / totaliPartita.capienza) * 100) : 0
  const postiLiberiTot = Math.max(totaliPartita.capienza - totaliPartita.venduti, 0)

  const summaryByMatch = partite
    .map(p => {
      const rows = storico.filter(r => r.partita_id === p.id)
      const venduti = rows.reduce((s, r) => s + Number(r.venduti), 0)
      const ricavo = rows.reduce((s, r) => s + Number(r.venduti) * Number(r.prezzo), 0)
      const capienza = settori.reduce((s, x) => s + Number(x.capienza || 0), 0)
      const riemp = capienza > 0 ? Math.round((venduti / capienza) * 100) : 0
      return { partita: p, venduti, ricavo, riemp }
    })
    .filter(r => r.venduti > 0 || r.ricavo > 0)
    .sort((a, b) => (a.partita.data_ora > b.partita.data_ora ? 1 : -1))

  const totaleStagione = summaryByMatch.reduce((s, r) => s + r.ricavo, 0)
  const mediaPerPartita = summaryByMatch.length > 0 ? totaleStagione / summaryByMatch.length : 0
  const topSpettatori = summaryByMatch.reduce((best, r) => (r.venduti > (best?.venduti ?? -1) ? r : best), summaryByMatch[0])
  const mediaSpettatori = summaryByMatch.length > 0 ? summaryByMatch.reduce((s, r) => s + r.venduti, 0) / summaryByMatch.length : 0

  const aggiorna = async (settoreId: string, nuoviVenduti: number, nuovoPrezzo?: number) => {
    if (!partitaSel || !settoreId) return
    const key = settoreId
    const prezzo = nuovoPrezzo ?? Number(biglietteria[key]?.prezzo ?? 0)
    const rowId = biglietteria[key]?.rowId
    setBiglietteria(prev => ({ ...prev, [key]: { ...prev[key], venduti: nuoviVenduti, prezzo } }))
    setSavingSettore(prev => ({ ...prev, [settoreId]: true }))
    await supabase.from('stadio_biglietteria_partita').upsert(
      { ...(rowId ? { id: rowId } : {}), club_id: clubId, partita_id: partitaSel, settore_id: settoreId, venduti: nuoviVenduti, prezzo },
      { onConflict: 'partita_id,settore_id' },
    )
    setSavingSettore(prev => ({ ...prev, [settoreId]: false }))
  }

  const aggiornaPrezzo = (settoreId: string, nuovoPrezzo: number) => {
    const key = settoreId
    setBiglietteria(prev => ({ ...prev, [key]: { ...prev[key], prezzo: nuovoPrezzo } }))
  }

  const exportCsv = () => {
    const header = ['data', 'avversario', 'totale_venduto', 'ricavo', 'riempimento_percent']
    const lines = summaryByMatch.map(r => [
      new Date(r.partita.data_ora).toLocaleDateString('it-IT'),
      r.partita.avversario,
      r.venduti,
      r.ricavo.toFixed(2),
      r.riemp,
    ])
    const csv = [header.join(','), ...lines.map(l => l.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stadio-dashboard-ricavi.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => window.print()

  const graphData = summaryByMatch.map((r, i) => ({ x: i, y: r.ricavo }))
  const maxRicavo = Math.max(...graphData.map(g => g.y), 1)
  const linePoints = graphData
    .map((g, i) => `${(i / Math.max(graphData.length - 1, 1)) * 100},${100 - (g.y / maxRicavo) * 100}`)
    .join(' ')

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Caricamento stadio...</div>

  return (
    <FeatureGate feature="biglietteria_stadio" featureLabel="Biglietteria e Gestione Stadio">
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Stadio</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Configurazione impianto, biglietteria e dashboard ricavi
        </p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={sectionTitle}>Task 1 — Configurazione stadio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: 10, marginBottom: 12 }}>
          <input className="input" placeholder="Nome stadio" value={nomeStadio} onChange={e => setNomeStadio(e.target.value)} />
          <input className="input" placeholder="Indirizzo" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} />
          <input className="input" type="number" placeholder="Capienza totale" value={capienzaTotale} onChange={e => setCapienzaTotale(Number(e.target.value))} />
        </div>

        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Settori</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {settori.map((s, i) => (
            <div key={s.id ?? `new-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 70px', gap: 8 }}>
              <input className="input" value={s.nome} onChange={e => setSettori(prev => prev.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))} />
              <input className="input" type="number" value={s.capienza} onChange={e => setSettori(prev => prev.map((x, idx) => (idx === i ? { ...x, capienza: Number(e.target.value) } : x)))} />
              <input className="input" type="color" value={s.colore} onChange={e => setSettori(prev => prev.map((x, idx) => (idx === i ? { ...x, colore: e.target.value } : x)))} />
              <button className="btn btn-secondary btn-sm" onClick={() => removeSettore(i)} type="button">Rimuovi</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button className="btn btn-secondary btn-sm" type="button" onClick={addSettore}>+ Settore</button>
          <button className="btn btn-primary btn-sm" type="button" onClick={saveConfigurazione} disabled={savingConfig}>
            {savingConfig ? 'Salvataggio...' : 'Salva configurazione'}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <StadioSvg settori={settori} calcSettore={calcSettore} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={sectionTitle}>Task 2 — Biglietteria per partita</h3>
        <div style={{ marginBottom: 10 }}>
          <select className="input" value={partitaSel} onChange={e => setPartitaSel(e.target.value)}>
            <option value="">Seleziona partita...</option>
            {partite.map(p => (
              <option key={p.id} value={p.id}>
                {new Date(p.data_ora).toLocaleDateString('it-IT')} — {p.avversario}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Settore</th>
                <th>Capienza</th>
                <th>Prezzo</th>
                <th>Venduti</th>
                <th>Ricavo</th>
                <th>Posti liberi</th>
                <th>% Riempimento</th>
              </tr>
            </thead>
            <tbody>
              {settori.map((s, i) => {
                const key = s.id ?? `tmp-${s.ordine}`
                const c = calcSettore(s)
                return (
                  <tr key={s.id ?? i}>
                    <td>{s.nome}</td>
                    <td>{s.capienza}</td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step={0.5}
                        disabled={!partitaSel}
                        value={biglietteria[key]?.prezzo ?? 0}
                        onChange={e => aggiornaPrezzo(s.id ?? `tmp-${s.ordine}`, Number(e.target.value))}
                        onBlur={e => { if (s.id) aggiorna(s.id, c.venduti, Number(e.target.value)) }}
                        style={{ width: 80 }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={!partitaSel || !s.id || !!savingSettore[s.id!]}
                          onClick={() => aggiorna(s.id!, Math.max(0, c.venduti - 1))}
                        >−</button>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={s.capienza}
                          disabled={!partitaSel}
                          value={c.venduti}
                          onChange={e => {
                            const v = Math.max(0, Math.min(s.capienza, Number(e.target.value)))
                            setBiglietteria(prev => ({ ...prev, [key]: { ...prev[key], venduti: v } }))
                          }}
                          onBlur={e => { if (s.id) aggiorna(s.id, Number(e.target.value)) }}
                          style={{ width: 70, textAlign: 'center' }}
                        />
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={!partitaSel || !s.id || !!savingSettore[s.id!]}
                          onClick={() => aggiorna(s.id!, Math.min(s.capienza, c.venduti + 1))}
                        >+</button>
                      </div>
                    </td>
                    <td>{fmtEuro(c.ricavo)}</td>
                    <td>{c.liberi}</td>
                    <td>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{c.riempimento}%</div>
                      <div className="progress" style={{ width: 90 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${c.riempimento}%`,
                            background: c.riempimento < 50
                              ? 'var(--accent-green)'
                              : c.riempimento <= 80
                                ? 'var(--accent-orange)'
                                : 'var(--accent-red)',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
          <Kpi label="Ricavo totale partita" value={fmtEuro(totaliPartita.ricavo)} />
          <Kpi label="Posti liberi" value={String(postiLiberiTot)} />
          <Kpi label="% riempimento" value={`${riempimentoTot}%`} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={saveBiglietteria} disabled={savingBiglietteria || !partitaSel}>
              {savingBiglietteria ? 'Salvataggio...' : 'Salva tutto'}
            </button>
          </div>
        </div>
        {partitaSel && riempimentoTot > 80 && (
          <div style={{
            marginTop: 12,
            background: 'rgba(248,81,73,0.12)',
            border: '1px solid var(--accent-red)',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent-red)',
          }}>
            Stadio quasi esaurito ({riempimentoTot}% riempimento)
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={sectionTitle}>Task 3 — Dashboard ricavi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          <Kpi label="Ricavo totale stagione" value={fmtEuro(totaleStagione)} />
          <Kpi label="Media ricavo per partita" value={fmtEuro(mediaPerPartita)} />
          <Kpi label="Partita con piu spettatori" value={topSpettatori ? `${topSpettatori.partita.avversario} (${topSpettatori.venduti})` : '—'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
          <div className="card" style={{ background: 'var(--bg-input)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Andamento ricavi nel tempo</div>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: 180 }}>
              <polyline points={linePoints || '0,100 100,100'} fill="none" stroke="var(--accent-blue)" strokeWidth="2" />
            </svg>
          </div>
          <div className="card" style={{ background: 'var(--bg-input)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Confronto partite (ricavi)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180 }}>
              {summaryByMatch.map((r, i) => (
                <div key={i} title={`${r.partita.avversario}: ${fmtEuro(r.ricavo)}`} style={{ flex: 1, background: 'var(--accent-green)', height: `${(r.ricavo / Math.max(maxRicavo, 1)) * 100}%`, minHeight: 4, borderRadius: 4 }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Media spettatori: {Math.round(mediaSpettatori)}</div>
          </div>
        </div>
        <div className="table-wrap" style={{ marginBottom: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Avversario</th>
                <th>Totale venduto</th>
                <th>Ricavo</th>
                <th>% Riempimento</th>
              </tr>
            </thead>
            <tbody>
              {summaryByMatch.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 22, color: 'var(--text-muted)' }}>Nessun dato biglietteria</td></tr>
              ) : (
                summaryByMatch.map(r => (
                  <tr key={r.partita.id}>
                    <td>{new Date(r.partita.data_ora).toLocaleDateString('it-IT')}</td>
                    <td>{r.partita.avversario}</td>
                    <td>{r.venduti}</td>
                    <td>{fmtEuro(r.ricavo)}</td>
                    <td>{r.riemp}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv}>Esporta CSV</button>
          <button className="btn btn-primary btn-sm" onClick={exportPdf}>Esporta PDF</button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      <style>{`@media print { nav, aside, .btn { display: none !important; } }`}</style>
    </div>
    </FeatureGate>
  )
}

function StadioSvg({
  settori,
  calcSettore,
}: {
  settori: Settore[]
  calcSettore: (s: Settore) => { riempimento: number }
}) {
  const step = 360 / Math.max(settori.length, 1)
  const rOuter = 140
  const rInner = 80
  const center = 160

  const toPoint = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) }
  }

  return (
    <div className="card" style={{ background: 'var(--bg-input)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Visualizzazione stadio (riempimento dinamico)</div>
      <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 520, height: 320 }}>
        <circle cx={center} cy={center} r={50} fill="#e5e7eb" />
        {settori.map((s, i) => {
          const a1 = -90 + i * step
          const a2 = a1 + step - 2
          const p1 = toPoint(a1, rOuter)
          const p2 = toPoint(a2, rOuter)
          const p3 = toPoint(a2, rInner)
          const p4 = toPoint(a1, rInner)
          const largeArc = step > 180 ? 1 : 0
          const fillPct = calcSettore(s).riempimento
          const fill = fillPct < 50 ? '#22c55e' : fillPct <= 80 ? '#f59e0b' : '#ef4444'
          const path = [
            `M ${p1.x} ${p1.y}`,
            `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
            `L ${p3.x} ${p3.y}`,
            `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
            'Z',
          ].join(' ')
          return <path key={s.id ?? i} d={path} fill={fill} stroke="white" strokeWidth="2"><title>{s.nome} - {fillPct}%</title></path>
        })}
      </svg>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 20 }}>{value}</div>
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 10,
}

function fmtEuro(v: number) {
  return Number(v || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}
