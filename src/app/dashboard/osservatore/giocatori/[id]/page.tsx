'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { potenzialeColore, esitoColore, formatData, formatEuro } from '@/lib/helpers'
import { Drawer } from '@/components/ui'
import RadarChart from '@/components/ui/RadarChart'

type StoricoCluEntry = { club: string; stagione: string; campionato: string; presenze: number; gol: number; assist: number }
type StatStagione = { presenze?: number; gol?: number; assist?: number; ammonizioni?: number; espulsioni?: number; minuti?: number }

type Osservazione = {
  id: string
  data_osservazione: string
  partita_contesto?: string
  tecnica?: number
  fisico?: number
  tattica?: number
  mentalita?: number
  velocita?: number
  note?: string
  video_link?: string
}

type Report = {
  id: string
  club_id?: string
  nome_giocatore_ext?: string
  club_attuale_ext?: string
  data_osservazione: string
  partita_osservata?: string
  tecnica?: number
  tattica?: number
  fisico?: number
  mentale?: number
  velocita?: number
  voto_globale?: number
  potenziale: string
  esito: string
  punti_forza?: string
  punti_debolezza?: string
  note_libere?: string
  valore_mercato_stimato?: number
  storico_club?: StoricoCluEntry[]
  statistiche_stagione?: StatStagione
  piede_preferito?: string
  altezza_cm?: number
  peso_kg?: number
  nazionalita?: string
  fonte_dati?: string
  stato_pipeline?: string
  ruolo?: string
  data_nascita?: string
  regione_provenienza?: string
  nazione_provenienza?: string
}

const PIPELINE_LABELS: Record<string, string> = {
  in_osservazione: 'In Osservazione',
  interessante: 'Interessante',
  da_contattare: 'Da Contattare',
  archiviato: 'Archiviato',
}

const PIPELINE_COLORE: Record<string, string> = {
  in_osservazione: 'badge-blu',
  interessante: 'badge-verde',
  da_contattare: 'badge-ambra',
  archiviato: 'badge-grigio',
}

function ratingColor(v?: number) {
  if (!v) return 'var(--text-muted, #6e7681)'
  if (v >= 7) return 'var(--accent-green, #3fb950)'
  if (v >= 5) return 'var(--accent-orange, #d29922)'
  return 'var(--accent-red, #f85149)'
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

function RatingBadge({ label, value }: { label: string; value?: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      background: 'var(--bg-input, #21262d)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: ratingColor(value) }}>
        {value ?? '—'}
      </span>
    </span>
  )
}

export default function ProfiloGiocatoreScoutingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [report, setReport] = useState<Report | null>(null)
  const [osservazioni, setOsservazioni] = useState<Osservazione[]>([])
  const [loading, setLoading] = useState(true)

  // Drawer modifica report
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Report>>({})
  const [saving, setSaving] = useState(false)

  // Drawer nuova osservazione
  const [obsOpen, setObsOpen] = useState(false)
  const [obsForm, setObsForm] = useState<Partial<Osservazione>>({})
  const [obsSaving, setObsSaving] = useState(false)

  // Note espanse
  const [expandedObs, setExpandedObs] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const { data: r } = await supabase.from('report_scouting').select('*').eq('id', id).single()
    const { data: obs } = await supabase
      .from('osservazioni_scouting')
      .select('*')
      .eq('report_id', id)
      .order('data_osservazione', { ascending: false })
    setReport(r)
    setOsservazioni(obs ?? [])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { load() }, [load])

  async function saveReport() {
    setSaving(true)
    await supabase.from('report_scouting').update(editForm).eq('id', id).eq('club_id', report!.club_id!)
    await load()
    setSaving(false)
    setEditOpen(false)
  }

  async function saveOsservazione() {
    setObsSaving(true)
    await supabase.from('osservazioni_scouting').insert({ ...obsForm, report_id: id })
    await load()
    setObsSaving(false)
    setObsOpen(false)
    setObsForm({})
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</div>
  if (!report) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Report non trovato.</div>

  const stat: StatStagione = report.statistiche_stagione ?? {}
  const storico: StoricoCluEntry[] = report.storico_club ?? []

  // Radar datasets
  const radarLabels = ['Tecnica', 'Fisico', 'Tattica', 'Mentalità', 'Velocità']
  const radarDatasets = (() => {
    const ds = []
    if (osservazioni.length >= 2) {
      const last = osservazioni[0]
      ds.push({
        label: 'Ultima',
        color: '#388bfd',
        values: [last.tecnica ?? 0, last.fisico ?? 0, last.tattica ?? 0, last.mentalita ?? 0, last.velocita ?? 0],
      })
      const avg = (key: keyof Osservazione) => {
        const vals = osservazioni.map(o => (o[key] as number | undefined) ?? 0)
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      }
      ds.push({
        label: 'Media',
        color: '#3fb950',
        values: [avg('tecnica'), avg('fisico'), avg('tattica'), avg('mentalita'), avg('velocita')],
      })
    } else if (osservazioni.length === 1) {
      const o = osservazioni[0]
      ds.push({
        label: 'Osservazione',
        color: '#388bfd',
        values: [o.tecnica ?? 0, o.fisico ?? 0, o.tattica ?? 0, o.mentalita ?? 0, o.velocita ?? 0],
      })
    } else {
      ds.push({
        label: 'Report',
        color: '#388bfd',
        values: [report.tecnica ?? 0, report.fisico ?? 0, report.tattica ?? 0, report.mentale ?? 0, report.velocita ?? 0],
      })
    }
    return ds
  })()

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      {/* Back */}
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
        ← Indietro
      </button>

      {/* Header */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 8 }}>
              {report.nome_giocatore_ext ?? 'Giocatore sconosciuto'}
            </h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              {report.data_nascita && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {new Date().getFullYear() - new Date(report.data_nascita).getFullYear()} anni
                </span>
              )}
              {report.nazionalita && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>· {report.nazionalita}</span>
              )}
              {report.regione_provenienza && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📍 {report.regione_provenienza}</span>
              )}
              {report.nazione_provenienza && report.nazione_provenienza !== 'Italia' && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🌍 {report.nazione_provenienza}</span>
              )}
              {report.ruolo && (
                <span className="badge badge-blu" style={{ fontSize: 11 }}>{report.ruolo.replace('_', ' ')}</span>
              )}
              {report.piede_preferito && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Piede: {report.piede_preferito}</span>
              )}
              {report.altezza_cm && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{report.altezza_cm} cm</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${PIPELINE_COLORE[report.stato_pipeline ?? 'in_osservazione'] ?? 'badge-grigio'}`}>
                {PIPELINE_LABELS[report.stato_pipeline ?? 'in_osservazione'] ?? report.stato_pipeline}
              </span>
              <span className={`badge ${potenzialeColore[report.potenziale] ?? 'badge-grigio'}`}>
                Potenziale: {report.potenziale}
              </span>
              <span className={`badge ${esitoColore[report.esito] ?? 'badge-grigio'}`}>
                {report.esito?.replace('_', ' ')}
              </span>
              {report.valore_mercato_stimato && (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)' }}>
                  {formatEuro(report.valore_mercato_stimato)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={`/api/scouting/profilo/${id}/pdf`}
              target="_blank"
              className="btn btn-secondary btn-sm"
            >
              Esporta PDF
            </a>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setEditForm(report); setEditOpen(true) }}
            >
              Modifica
            </button>
          </div>
        </div>
      </div>

      {/* KPI Statistiche stagione */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Statistiche stagione
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          <KpiCard label="Presenze" value={stat.presenze ?? '—'} />
          <KpiCard label="Gol" value={stat.gol ?? '—'} />
          <KpiCard label="Assist" value={stat.assist ?? '—'} />
          <KpiCard label="Ammonizioni" value={stat.ammonizioni ?? '—'} />
          <KpiCard label="Espulsioni" value={stat.espulsioni ?? '—'} />
          <KpiCard label="Minuti" value={stat.minuti ?? '—'} />
        </div>
      </div>

      {/* Radar + Storico club */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Radar */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Profilo tecnico
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart labels={radarLabels} datasets={radarDatasets} size={220} />
          </div>
        </div>

        {/* Storico club */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Storico club
          </div>
          {storico.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Nessun dato</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Club', 'Stagione', 'Camp.', 'Pres.', 'Gol', 'Assist'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, borderBottom: '1px solid var(--border-light)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storico.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.club}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{row.stagione}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{row.campionato}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{row.presenze}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{row.gol}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{row.assist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Storico osservazioni */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Storico osservazioni ({osservazioni.length})
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setObsForm({ data_osservazione: new Date().toISOString().slice(0, 10) }); setObsOpen(true) }}>
            + Aggiungi osservazione
          </button>
        </div>
        {osservazioni.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            Nessuna osservazione registrata
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {osservazioni.map(obs => {
              const expanded = expandedObs.has(obs.id)
              return (
                <div key={obs.id} style={{ background: 'var(--bg-input, #21262d)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                        {formatData(obs.data_osservazione)}
                      </span>
                      {obs.partita_contesto && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{obs.partita_contesto}</span>
                      )}
                    </div>
                    {obs.video_link && (
                      <a href={obs.video_link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                        ▶ Video
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <RatingBadge label="Tec" value={obs.tecnica} />
                    <RatingBadge label="Fis" value={obs.fisico} />
                    <RatingBadge label="Tat" value={obs.tattica} />
                    <RatingBadge label="Men" value={obs.mentalita} />
                    <RatingBadge label="Vel" value={obs.velocita} />
                  </div>
                  {obs.note && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {expanded ? obs.note : obs.note.slice(0, 80)}{!expanded && obs.note.length > 80 && (
                        <button
                          onClick={() => setExpandedObs(prev => new Set(prev).add(obs.id))}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 12, marginLeft: 4 }}
                        >
                          leggi di più
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Note libere */}
      {(report.punti_forza || report.punti_debolezza || report.note_libere) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {report.punti_forza && (
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: 6 }}>Punti di forza</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.punti_forza}</div>
            </div>
          )}
          {report.punti_debolezza && (
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-red)', textTransform: 'uppercase', marginBottom: 6 }}>Punti deboli</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.punti_debolezza}</div>
            </div>
          )}
        </div>
      )}
      {report.note_libere && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Note libere</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{report.note_libere}</div>
        </div>
      )}

      {/* Drawer modifica */}
      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifica report">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {([
            ['nome_giocatore_ext', 'Nome giocatore', 'text'],
            ['club_attuale_ext', 'Club attuale', 'text'],
            ['ruolo', 'Ruolo', 'text'],
            ['data_nascita', 'Data nascita', 'date'],
            ['nazionalita', 'Nazionalità', 'text'],
            ['altezza_cm', 'Altezza (cm)', 'number'],
            ['peso_kg', 'Peso (kg)', 'number'],
            ['piede_preferito', 'Piede preferito', 'text'],
            ['valore_mercato_stimato', 'Valore di mercato (€)', 'number'],
            ['fonte_dati', 'Fonte dati', 'text'],
            ['regione_provenienza', 'Regione di provenienza', 'regione'],
            ['nazione_provenienza', 'Nazione', 'text'],
            ['punti_forza', 'Punti di forza', 'textarea'],
            ['punti_debolezza', 'Punti deboli', 'textarea'],
            ['note_libere', 'Note libere', 'textarea'],
          ] as [keyof Report, string, string][]).map(([field, label, type]) => (
            <div key={field}>
              <label className="label">{label}</label>
              {type === 'textarea' ? (
                <textarea
                  className="input"
                  rows={3}
                  value={(editForm[field] as string) ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              ) : type === 'regione' ? (
                <select
                  className="input"
                  value={(editForm[field] as string) ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value || null }))}
                  style={{ width: '100%' }}
                >
                  <option value="">— Non specificata —</option>
                  {["Valle d'Aosta",'Piemonte','Lombardia','Trentino-Alto Adige','Veneto','Friuli-Venezia Giulia','Liguria','Emilia-Romagna','Toscana','Umbria','Marche','Lazio','Abruzzo','Molise','Campania','Puglia','Basilicata','Calabria','Sicilia','Sardegna'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={type}
                  value={(editForm[field] as string | number) ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width: '100%' }}
                />
              )}
            </div>
          ))}
          <div>
            <label className="label">Stato pipeline</label>
            <select
              className="input"
              value={editForm.stato_pipeline ?? 'in_osservazione'}
              onChange={e => setEditForm(p => ({ ...p, stato_pipeline: e.target.value }))}
              style={{ width: '100%' }}
            >
              {Object.entries(PIPELINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Potenziale</label>
            <select
              className="input"
              value={editForm.potenziale ?? ''}
              onChange={e => setEditForm(p => ({ ...p, potenziale: e.target.value }))}
              style={{ width: '100%' }}
            >
              {['basso', 'medio', 'alto', 'eccezionale'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveReport} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </Drawer>

      {/* Drawer nuova osservazione */}
      <Drawer open={obsOpen} onClose={() => setObsOpen(false)} title="Nuova osservazione">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Data osservazione</label>
            <input className="input" type="date" value={obsForm.data_osservazione ?? ''} onChange={e => setObsForm(p => ({ ...p, data_osservazione: e.target.value }))} style={{ width: '100%' }} />
          </div>
          <div>
            <label className="label">Partita / Contesto</label>
            <input className="input" type="text" value={obsForm.partita_contesto ?? ''} onChange={e => setObsForm(p => ({ ...p, partita_contesto: e.target.value }))} style={{ width: '100%' }} />
          </div>
          {(['tecnica', 'fisico', 'tattica', 'mentalita', 'velocita'] as const).map(attr => (
            <div key={attr}>
              <label className="label">{attr.charAt(0).toUpperCase() + attr.slice(1)} (1-10)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={10}
                value={(obsForm[attr as keyof Osservazione] as number) ?? ''}
                onChange={e => setObsForm(p => ({ ...p, [attr]: Number(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>
          ))}
          <div>
            <label className="label">Note</label>
            <textarea className="input" rows={3} value={obsForm.note ?? ''} onChange={e => setObsForm(p => ({ ...p, note: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <label className="label">Link video</label>
            <input className="input" type="url" value={obsForm.video_link ?? ''} onChange={e => setObsForm(p => ({ ...p, video_link: e.target.value }))} style={{ width: '100%' }} />
          </div>
          <button className="btn btn-primary" onClick={saveOsservazione} disabled={obsSaving}>
            {obsSaving ? 'Salvataggio...' : 'Aggiungi osservazione'}
          </button>
        </div>
      </Drawer>
    </div>
  )
}
