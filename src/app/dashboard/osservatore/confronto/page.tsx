'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { potenzialeColore, formatEuro } from '@/lib/helpers'
import RadarChart from '@/components/ui/RadarChart'
import Link from 'next/link'

type Report = {
  id: string
  nome_giocatore_ext: string | null
  club_attuale_ext: string | null
  ruolo_osservato: string | null
  tecnica: number | null
  tattica: number | null
  fisico: number | null
  mentale: number | null
  velocita: number | null
  voto_globale: number | null
  potenziale: string
  esito: string
  stato_pipeline: string | null
  valore_mercato_stimato: number | null
}

const DATASET_COLORS = ['#388bfd', '#3fb950', '#a371f7']
const RADAR_LABELS = ['Tecnica', 'Fisico', 'Tattica', 'Mentalità', 'Velocità']

const ESITO_LABEL: Record<string, string> = {
  in_valutazione: 'In valutazione',
  ingaggiato:     'Ingaggiato',
  rifiutato:      'Rifiutato',
  archiviato:     'Archiviato',
  lista_attesa:   'Lista attesa',
}
const ESITO_COLORE: Record<string, string> = {
  in_valutazione: 'badge-ambra',
  ingaggiato:     'badge-verde',
  rifiutato:      'badge-rosso',
  archiviato:     'badge-grigio',
  lista_attesa:   'badge-blu',
}

const PIPELINE_LABEL: Record<string, string> = {
  in_osservazione: 'In osservazione',
  interessante:    'Interessante',
  da_contattare:   'Da contattare',
  archiviato:      'Archiviato',
}

// Esiti "disponibili" al confronto (esclude rifiutati e archiviati)
const ESITI_DISPONIBILI = ['in_valutazione', 'ingaggiato', 'lista_attesa']

function ratingMedio(r: Report) {
  const vals = [r.tecnica, r.tattica, r.fisico, r.mentale].filter(v => v != null) as number[]
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
}

function best(reports: Report[], field: keyof Report): number | null {
  const vals = reports.map(r => r[field] as number | undefined).filter(v => v != null) as number[]
  return vals.length ? Math.max(...vals) : null
}

function VotoBox({ v, best }: { v: number | null; best: boolean }) {
  if (!v) return <span style={{ color: 'var(--grigio-4)' }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', width: 32, height: 32, borderRadius: 7,
      alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-mono)',
      background: v >= 7 ? 'var(--verde)' : v >= 5 ? 'var(--ambra)' : 'var(--rosso)',
      color: 'white',
      boxShadow: best ? '0 0 0 2px white, 0 0 0 4px var(--verde)' : 'none',
    }}>
      {v}
    </span>
  )
}

export default function ConfrontoPage() {
  const supabase = createClient()
  const [all, setAll]         = useState<Report[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [filtroEsito, setFiltroEsito] = useState<string>('tutti')
  const [cerca, setCerca]     = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: utente } = await supabase
      .from('utenti')
      .select('club_id')
      .eq('id', user.id)
      .single()
    if (!utente) { setLoading(false); return }

    // Query difensiva: seleziona solo colonne sicuramente presenti
    // ruolo_osservato aggiunto da migration fix049 — gestito con fallback
    const { data, error } = await supabase
      .from('report_scouting')
      .select('id, nome_giocatore_ext, club_attuale_ext, tecnica, tattica, fisico, mentale, velocita, voto_globale, potenziale, esito, stato_pipeline, valore_mercato_stimato, ruolo_osservato')
      .eq('club_richiedente_id', utente.club_id)
      .in('esito', ESITI_DISPONIBILI)
      .order('voto_globale', { ascending: false, nullsFirst: false })

    if (error) {
      // fallback senza ruolo_osservato se colonna non esiste ancora
      const { data: fallback } = await supabase
        .from('report_scouting')
        .select('id, nome_giocatore_ext, club_attuale_ext, tecnica, tattica, fisico, mentale, velocita, voto_globale, potenziale, esito, stato_pipeline, valore_mercato_stimato')
        .eq('club_richiedente_id', utente.club_id)
        .in('esito', ESITI_DISPONIBILI)
        .order('voto_globale', { ascending: false, nullsFirst: false })
      setAll((fallback ?? []).map(r => ({ ...r, ruolo_osservato: null })))
    } else {
      setAll(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  // Filtra lista
  const filtered = all.filter(r => {
    if (filtroEsito !== 'tutti' && r.esito !== filtroEsito) return false
    if (cerca.trim()) {
      const q = cerca.toLowerCase()
      if (!(r.nome_giocatore_ext ?? '').toLowerCase().includes(q) &&
          !(r.club_attuale_ext ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const confrontati = selected.map(id => all.find(r => r.id === id)).filter(Boolean) as Report[]

  const rows: { label: string; field: keyof Report; format?: (v: any) => string }[] = [
    { label: 'Club attuale',   field: 'club_attuale_ext', format: v => v ?? '—' },
    { label: 'Ruolo',          field: 'ruolo_osservato',  format: v => v ? String(v).replace(/_/g, ' ') : '—' },
    { label: 'Tecnica',        field: 'tecnica' },
    { label: 'Fisico',         field: 'fisico' },
    { label: 'Tattica',        field: 'tattica' },
    { label: 'Mentale',        field: 'mentale' },
    { label: 'Velocità',       field: 'velocita' },
    { label: 'Voto globale',   field: 'voto_globale' },
    { label: 'Potenziale',     field: 'potenziale' },
    { label: 'Valore mercato', field: 'valore_mercato_stimato', format: v => v ? formatEuro(v) : '—' },
  ]

  const numericFields = new Set(['tecnica','fisico','tattica','mentale','velocita','voto_globale','valore_mercato_stimato'])

  if (loading) return <div style={{ padding: 40, color: 'var(--grigio-4)', fontSize: 13 }}>Caricamento...</div>

  const radarDatasets = confrontati.map((r, i) => ({
    label: r.nome_giocatore_ext ?? `Giocatore ${i + 1}`,
    color: DATASET_COLORS[i],
    values: [r.tecnica ?? 0, r.fisico ?? 0, r.tattica ?? 0, r.mentale ?? 0, r.velocita ?? 0],
  }))

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Confronto giocatori
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Seleziona fino a 3 giocatori dai report del club per confrontarli
        </p>
      </div>

      {/* Pannello selezione */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--grigio-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Giocatori da report ({all.length} disponibili)
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              style={{ fontSize: 11, color: 'var(--grigio-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Deseleziona tutti
            </button>
          )}
        </div>

        {/* Filtri */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Cerca per nome o club..."
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            style={{ width: 220, fontSize: 12 }}
          />
          {['tutti', ...ESITI_DISPONIBILI].map(e => (
            <button
              key={e}
              onClick={() => setFiltroEsito(e)}
              style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                border: filtroEsito === e ? '1.5px solid var(--verde)' : '1px solid var(--grigio-5)',
                background: filtroEsito === e ? 'var(--verde-lt)' : 'var(--grigio-6)',
                color: filtroEsito === e ? 'var(--verde)' : 'var(--grigio-3)',
                fontWeight: filtroEsito === e ? 600 : 400,
              }}
            >
              {e === 'tutti' ? 'Tutti' : ESITO_LABEL[e]}
            </button>
          ))}
        </div>

        {all.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
            Nessun report disponibile.{' '}
            <Link href="/dashboard/osservatore/nuovo-report" style={{ color: 'var(--verde)' }}>
              Crea il primo report →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
            Nessun giocatore corrisponde ai filtri
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filtered.map(r => {
              const idx      = selected.indexOf(r.id)
              const isSel    = idx !== -1
              const color    = isSel ? DATASET_COLORS[idx] : undefined
              const disabled = !isSel && selected.length >= 3
              return (
                <button
                  key={r.id}
                  onClick={() => !disabled && toggleSelect(r.id)}
                  title={disabled ? 'Massimo 3 giocatori selezionabili' : undefined}
                  style={{
                    padding: '7px 13px', borderRadius: 7, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
                    border: isSel ? `2px solid ${color}` : '1px solid var(--grigio-5)',
                    background: isSel ? `${color}22` : disabled ? 'var(--grigio-6)' : 'var(--grigio-6)',
                    color: isSel ? color : disabled ? 'var(--grigio-4)' : 'var(--grigio-2)',
                    fontWeight: isSel ? 700 : 400,
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {isSel && (
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: color, color: 'white',
                      fontSize: 10, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {idx + 1}
                    </span>
                  )}
                  <span>{r.nome_giocatore_ext ?? 'N/D'}</span>
                  {r.voto_globale != null && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      padding: '1px 5px', borderRadius: 4,
                      background: r.voto_globale >= 7 ? 'var(--verde-lt)' : r.voto_globale >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)',
                      color: r.voto_globale >= 7 ? 'var(--verde)' : r.voto_globale >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                    }}>
                      {r.voto_globale}
                    </span>
                  )}
                  {r.ruolo_osservato && (
                    <span style={{ opacity: 0.6, fontSize: 10 }}>
                      {r.ruolo_osservato.replace(/_/g, ' ')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {selected.length > 0 && selected.length < 2 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--grigio-3)' }}>
            Seleziona ancora {2 - selected.length} giocatore{2 - selected.length > 1 ? 'i' : ''} per avviare il confronto
          </div>
        )}
      </div>

      {/* Confronto */}
      {confrontati.length >= 2 && (
        <>
          {/* Tabella comparativa */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--grigio-6)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--grigio-3)', textTransform: 'uppercase', width: 130 }}>
                    Attributo
                  </th>
                  {confrontati.map((r, i) => (
                    <th key={r.id} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: DATASET_COLORS[i] }}>
                      <div>{r.nome_giocatore_ext ?? `G${i + 1}`}</div>
                      <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--grigio-3)', marginTop: 2 }}>
                        {r.club_attuale_ext ?? ''}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const isNum  = numericFields.has(row.field as string)
                  const bestVal = isNum ? best(confrontati, row.field) : null
                  return (
                    <tr key={row.field as string} style={{ borderTop: '1px solid var(--grigio-6)' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--grigio-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {row.label}
                      </td>
                      {confrontati.map((r, i) => {
                        const rawVal = r[row.field]
                        const numVal = isNum ? (rawVal as number | null) : null
                        const isBest = isNum && numVal != null && numVal === bestVal

                        if (row.field === 'potenziale') {
                          return (
                            <td key={r.id} style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`} style={{ fontSize: 11 }}>
                                {r.potenziale}
                              </span>
                            </td>
                          )
                        }

                        if (isNum && row.field !== 'valore_mercato_stimato') {
                          return (
                            <td key={r.id} style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <VotoBox v={numVal} best={isBest} />
                            </td>
                          )
                        }

                        const display = row.format ? row.format(rawVal) : (rawVal ?? '—')
                        return (
                          <td key={r.id} style={{
                            padding: '10px 16px', textAlign: 'center',
                            fontSize: 13, fontWeight: isBest ? 700 : 400,
                            color: isBest ? 'var(--verde)' : 'var(--grigio-2)',
                          }}>
                            {isBest && <span style={{ marginRight: 4 }}>▲</span>}
                            {String(display)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* Riga esito */}
                <tr style={{ borderTop: '1px solid var(--grigio-6)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--grigio-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Esito
                  </td>
                  {confrontati.map(r => (
                    <td key={r.id} style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span className={`badge ${ESITO_COLORE[r.esito] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                        {ESITO_LABEL[r.esito] ?? r.esito}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Riga pipeline */}
                <tr style={{ borderTop: '1px solid var(--grigio-6)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--grigio-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Pipeline
                  </td>
                  {confrontati.map(r => (
                    <td key={r.id} style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span className="badge badge-blu" style={{ fontSize: 10 }}>
                        {PIPELINE_LABEL[r.stato_pipeline ?? 'in_osservazione'] ?? r.stato_pipeline}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Radar */}
          <div className="card" style={{ padding: '16px 20px', display: 'inline-block' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--grigio-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Radar comparativo
            </div>
            <RadarChart labels={RADAR_LABELS} datasets={radarDatasets} size={280} />
            {/* Legenda colori */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {confrontati.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: DATASET_COLORS[i] }} />
                  <span style={{ fontSize: 12, color: 'var(--grigio-2)' }}>{r.nome_giocatore_ext ?? `G${i+1}`}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {confrontati.length < 2 && all.length > 0 && (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Seleziona almeno 2 giocatori per avviare il confronto
        </div>
      )}
    </div>
  )
}
