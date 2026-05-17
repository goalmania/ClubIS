'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'

type Reparto = 'tutti' | 'portiere' | 'difensore' | 'centrocampista' | 'attaccante'
type Formazione = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2'
type Vista = 'lista' | 'tattica'
type CategoriaTab = 'tutti' | 'prima_squadra' | 'settore_giovanile' | 'scuola_calcio'

interface Giocatore {
  id: string
  nome: string
  cognome: string
  data_nascita: string
  nazionalita_paese: string
  ruolo_principale: string | null
  codice_tessera_figc: string | null
  numero_maglia: number | null
  categoria_eta?: string | null
}

const PRIMA_SQ = ['prima_squadra', 'femminile']
const SETTORE_GIO = ['u14', 'u15', 'u16', 'u17', 'u19', 'juniores', 'primavera']

function getCategoria(cat: string | null | undefined): CategoriaTab {
  if (!cat || !PRIMA_SQ.includes(cat) && !SETTORE_GIO.includes(cat)) return 'scuola_calcio'
  if (PRIMA_SQ.includes(cat)) return 'prima_squadra'
  return 'settore_giovanile'
}

const FORMAZIONI: Record<Formazione, { x: number; y: number }[]> = {
  '4-3-3': [
    { x: 300, y: 355 },
    { x: 80, y: 280 }, { x: 200, y: 280 }, { x: 400, y: 280 }, { x: 520, y: 280 },
    { x: 145, y: 190 }, { x: 300, y: 190 }, { x: 455, y: 190 },
    { x: 120, y: 85 }, { x: 300, y: 85 }, { x: 480, y: 85 },
  ],
  '4-4-2': [
    { x: 300, y: 355 },
    { x: 80, y: 280 }, { x: 200, y: 280 }, { x: 400, y: 280 }, { x: 520, y: 280 },
    { x: 80, y: 190 }, { x: 200, y: 190 }, { x: 400, y: 190 }, { x: 520, y: 190 },
    { x: 220, y: 85 }, { x: 380, y: 85 },
  ],
  '3-5-2': [
    { x: 300, y: 355 },
    { x: 150, y: 280 }, { x: 300, y: 280 }, { x: 450, y: 280 },
    { x: 60, y: 190 }, { x: 170, y: 190 }, { x: 300, y: 190 }, { x: 430, y: 190 }, { x: 540, y: 190 },
    { x: 220, y: 85 }, { x: 380, y: 85 },
  ],
  '4-2-3-1': [
    { x: 300, y: 355 },
    { x: 80, y: 290 }, { x: 200, y: 290 }, { x: 400, y: 290 }, { x: 520, y: 290 },
    { x: 200, y: 220 }, { x: 400, y: 220 },
    { x: 100, y: 145 }, { x: 300, y: 145 }, { x: 500, y: 145 },
    { x: 300, y: 70 },
  ],
  '5-3-2': [
    { x: 300, y: 355 },
    { x: 60, y: 280 }, { x: 165, y: 280 }, { x: 300, y: 280 }, { x: 435, y: 280 }, { x: 540, y: 280 },
    { x: 145, y: 185 }, { x: 300, y: 185 }, { x: 455, y: 185 },
    { x: 220, y: 85 }, { x: 380, y: 85 },
  ],
}

function reparto(ruolo: string | null): Reparto {
  if (!ruolo) return 'centrocampista'
  if (ruolo === 'portiere') return 'portiere'
  if (['difensore_centrale', 'terzino'].includes(ruolo)) return 'difensore'
  if (['centrocampista_difensivo', 'centrocampista', 'trequartista', 'ala'].includes(ruolo)) return 'centrocampista'
  if (['seconda_punta', 'centravanti'].includes(ruolo)) return 'attaccante'
  return 'centrocampista'
}

function etaAnni(dataNascita: string): number {
  const oggi = new Date()
  const dn = new Date(dataNascita)
  let eta = oggi.getFullYear() - dn.getFullYear()
  if (oggi.getMonth() < dn.getMonth() || (oggi.getMonth() === dn.getMonth() && oggi.getDate() < dn.getDate())) eta--
  return eta
}

// Campo SVG — half-field top-down view
function CampoSVG({ giocatori, posizioni, onDrag }: {
  giocatori: Giocatore[]
  posizioni: Record<string, { x: number; y: number }>
  onDrag: (id: string, x: number, y: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingRef = useRef<string | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = Math.max(20, Math.min(580, ((e.clientX - rect.left) / rect.width) * 600))
    const y = Math.max(20, Math.min(390, ((e.clientY - rect.top) / rect.height) * 410))
    onDrag(draggingRef.current, x, y)
  }, [onDrag])

  const handleMouseUp = () => { draggingRef.current = null }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 600 410"
      style={{ width: '100%', maxWidth: 600, cursor: 'default', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Fondo campo */}
      <rect x="10" y="5" width="580" height="400" rx="4" fill="#2d7a35" />
      {/* Riga centrocampo */}
      <line x1="10" y1="205" x2="590" y2="205" stroke="white" strokeWidth="1.5" opacity="0.5" />
      {/* Cerchio centrocampo */}
      <circle cx="300" cy="205" r="50" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <circle cx="300" cy="205" r="3" fill="white" opacity="0.5" />
      {/* Area rigore nostra */}
      <rect x="160" y="320" width="280" height="80" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <rect x="225" y="360" width="150" height="45" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
      {/* Area rigore avversaria */}
      <rect x="160" y="10" width="280" height="80" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <rect x="225" y="10" width="150" height="45" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
      {/* Rigori */}
      <circle cx="300" cy="350" r="3" fill="white" opacity="0.5" />
      <circle cx="300" cy="60" r="3" fill="white" opacity="0.5" />

      {/* Giocatori */}
      {giocatori.map((g, i) => {
        const pos = posizioni[g.id] ?? { x: 300, y: 205 }
        const cognomeBreve = g.cognome.length > 7 ? g.cognome.slice(0, 6) + '.' : g.cognome
        return (
          <g
            key={g.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            style={{ cursor: 'grab' }}
            onMouseDown={() => { draggingRef.current = g.id }}
          >
            <circle r="20" fill="#1a56db" stroke="white" strokeWidth="2" />
            <text textAnchor="middle" dy="-4" fill="white" fontSize="11" fontWeight="700">
              {g.numero_maglia ?? (i + 1)}
            </text>
            <text textAnchor="middle" dy="8" fill="white" fontSize="7.5">
              {cognomeBreve.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function RosaFIGCPage() {
  const supabase = createClient()
  const [giocatori, setGiocatori] = useState<Giocatore[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaTab, setCategoriaTab] = useState<CategoriaTab>('tutti')
  const [repSel, setRepSel] = useState<Reparto>('tutti')
  const [vista, setVista] = useState<Vista>('lista')
  const [formazione, setFormazione] = useState<Formazione>('4-3-3')
  const [posizioni, setPosizioni] = useState<Record<string, { x: number; y: number }>>({})
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [club, setClub] = useState<{ nome: string; figc_codice?: string } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const clubId = utente!.club_id

    const [{ data: cl }, { data: tess }] = await Promise.all([
      supabase.from('clubs').select('nome, figc_codice').eq('id', clubId).single(),
      supabase.from('tesseramenti')
        .select('numero_maglia, squadre(categoria_eta), giocatori(id, nome, cognome, data_nascita, nazionalita_paese, ruolo_principale, codice_tessera_figc)')
        .eq('club_id', clubId)
        .eq('stato', 'attivo'),
    ])

    setClub(cl)

    const lista: Giocatore[] = (tess ?? []).map((t: any) => ({
      ...t.giocatori,
      numero_maglia: t.numero_maglia ?? null,
      categoria_eta: (t.squadre as any)?.categoria_eta ?? null,
    }))

    lista.sort((a, b) => {
      const ordine = ['portiere', 'difensore', 'centrocampista', 'attaccante']
      return ordine.indexOf(reparto(a.ruolo_principale)) - ordine.indexOf(reparto(b.ruolo_principale))
    })

    setGiocatori(lista)

    // Inizializza posizioni dalla formazione selezionata
    const preset = FORMAZIONI[formazione]
    const pos: Record<string, { x: number; y: number }> = {}
    lista.slice(0, 11).forEach((g, i) => {
      pos[g.id] = preset[i] ?? { x: 300, y: 205 }
    })
    setPosizioni(pos)

    setLoading(false)
  }

  const applicaFormazione = (f: Formazione) => {
    setFormazione(f)
    const preset = FORMAZIONI[f]
    const ordinati = [...giocatori].sort((a, b) => {
      const ordine: Record<Reparto, number> = { tutti: 99, portiere: 0, difensore: 1, centrocampista: 2, attaccante: 3 }
      return ordine[reparto(a.ruolo_principale)] - ordine[reparto(b.ruolo_principale)]
    })
    const pos: Record<string, { x: number; y: number }> = { ...posizioni }
    ordinati.slice(0, 11).forEach((g, i) => { pos[g.id] = preset[i] ?? { x: 300, y: 205 } })
    setPosizioni(pos)
  }

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    setPosizioni(prev => ({ ...prev, [id]: { x, y } }))
  }, [])

  const stampaPDF = () => {
    window.print()
  }

  const countCategoria = (c: CategoriaTab) =>
    c === 'tutti' ? giocatori.length : giocatori.filter(g => getCategoria(g.categoria_eta) === c).length

  const filtrati = giocatori.filter(g => {
    const catOk = categoriaTab === 'tutti' || getCategoria(g.categoria_eta) === categoriaTab
    const repOk = repSel === 'tutti' || reparto(g.ruolo_principale) === repSel
    return catOk && repOk
  })

  const repartoLabel: Record<Reparto, string> = {
    tutti: 'Tutti', portiere: 'Portieri', difensore: 'Difensori', centrocampista: 'Centrocampisti', attaccante: 'Attaccanti'
  }

  const repartoCount = (r: Reparto) =>
    r === 'tutti' ? giocatori.length : giocatori.filter(g => reparto(g.ruolo_principale) === r).length

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento rosa...</div>

  return (
    <div>
      <PageHeader
        title="Rosa FIGC"
        subtitle={`${club?.nome ?? ''}${club?.figc_codice ? ` — Cod. FIGC: ${club.figc_codice}` : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn btn-sm ${vista === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setVista('lista')}
            >
              Lista
            </button>
            <button
              className={`btn btn-sm ${vista === 'tattica' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setVista('tattica')}
            >
              Vista tattica
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={stampaPDF}>
              Stampa / PDF
            </button>
          </div>
        }
      />

      {vista === 'lista' && (
        <>
          {/* Tab categoria */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {([
              { v: 'tutti' as const,            l: 'Tutte le categorie' },
              { v: 'prima_squadra' as const,    l: 'Prima Squadra' },
              { v: 'settore_giovanile' as const, l: 'Settore Giovanile' },
              { v: 'scuola_calcio' as const,    l: 'Scuola Calcio' },
            ]).map(({ v, l }) => (
              <button
                key={v}
                className={`btn btn-sm ${categoriaTab === v ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setCategoriaTab(v); setRepSel('tutti') }}
              >
                {l} ({countCategoria(v)})
              </button>
            ))}
          </div>

          {/* Tab reparti */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {(['tutti', 'portiere', 'difensore', 'centrocampista', 'attaccante'] as Reparto[]).map(r => (
              <button
                key={r}
                className={`btn btn-sm ${repSel === r ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRepSel(r)}
              >
                {repartoLabel[r]} ({repartoCount(r)})
              </button>
            ))}
          </div>

          {/* Tabella rosa */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }} id="rosa-print">
            {/* Header stampa */}
            <div className="print-only" style={{ display: 'none', padding: '20px 24px', borderBottom: '2px solid black', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{club?.nome}</div>
              {club?.figc_codice && <div style={{ fontSize: 12 }}>Cod. FIGC: {club.figc_codice}</div>}
              <div style={{ fontSize: 14, marginTop: 4 }}>Rosa ufficiale FIGC — {new Date().toLocaleDateString('it-IT')}</div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Giocatore</th>
                    <th>Data nascita</th>
                    <th>Nazionalità</th>
                    <th>Ruolo</th>
                    <th>Tessera FIGC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrati.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--grigio-4)' }}>Nessun giocatore in questo reparto</td></tr>
                  ) : filtrati.map((g) => (
                    <tr key={g.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {g.numero_maglia ?? '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{g.cognome} {g.nome}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {g.data_nascita
                          ? `${new Date(g.data_nascita).toLocaleDateString('it-IT')} (${etaAnni(g.data_nascita)} anni)`
                          : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{g.nazionalita_paese || '—'}</td>
                      <td>
                        <span className="badge badge-grigio" style={{ textTransform: 'capitalize' }}>
                          {g.ruolo_principale?.replace(/_/g, ' ') ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {g.codice_tessera_figc || <span style={{ color: 'var(--grigio-4)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Firma per stampa */}
            <div className="print-only" style={{ display: 'none', padding: '32px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
                <div style={{ borderTop: '1px solid black', paddingTop: 8 }}>
                  <div style={{ fontSize: 11 }}>Firma Dirigente Responsabile</div>
                </div>
                <div style={{ borderTop: '1px solid black', paddingTop: 8 }}>
                  <div style={{ fontSize: 11 }}>Timbro societario</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {vista === 'tattica' && (
        <div>
          {/* Selettore formazione */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }} >
            <span style={{ fontSize: 13, fontWeight: 500 }}>Modulo:</span>
            {(['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'] as Formazione[]).map(f => (
              <button
                key={f}
                className={`btn btn-sm ${formazione === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => applicaFormazione(f)}
              >
                {f}
              </button>
            ))}
            <span style={{ fontSize: 12, color: 'var(--grigio-4)', marginLeft: 8 }}>
              Trascina i giocatori per riposizionarli
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
            <div className="card" style={{ padding: 16 }}>
              <CampoSVG
                giocatori={giocatori.slice(0, 11)}
                posizioni={posizioni}
                onDrag={handleDrag}
              />
            </div>

            {/* Lista riserve */}
            <div className="card" style={{ padding: '14px 18px', overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Rosa completa</div>
              {giocatori.map((g, i) => (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 0',
                  borderBottom: '1px solid var(--grigio-6)',
                  opacity: i < 11 ? 1 : 0.55,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: i < 11 ? '#1a56db' : 'var(--grigio-5)',
                    color: 'white', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {g.numero_maglia ?? (i + 1)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{g.cognome} {g.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--grigio-4)', textTransform: 'capitalize' }}>
                      {g.ruolo_principale?.replace(/_/g, ' ') ?? '—'}
                    </div>
                  </div>
                  {i < 11 && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, background: '#e8f0fe', color: '#1a56db', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                      Titolare
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
