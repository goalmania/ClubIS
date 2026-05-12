'use client'
import { useState } from 'react'

// Coordinate approssimate delle 20 regioni italiane su viewBox 200x340
const REGIONI_IT: Record<string, { x: number; y: number; label: string }> = {
  "Valle d'Aosta":         { x: 28,  y: 42,  label: "VDA" },
  "Piemonte":              { x: 42,  y: 56,  label: "PIE" },
  "Lombardia":             { x: 80,  y: 48,  label: "LOM" },
  "Trentino-Alto Adige":   { x: 100, y: 34,  label: "TAA" },
  "Veneto":                { x: 115, y: 50,  label: "VEN" },
  "Friuli-Venezia Giulia": { x: 138, y: 46,  label: "FVG" },
  "Liguria":               { x: 56,  y: 74,  label: "LIG" },
  "Emilia-Romagna":        { x: 90,  y: 76,  label: "EMR" },
  "Toscana":               { x: 74,  y: 102, label: "TOS" },
  "Umbria":                { x: 96,  y: 116, label: "UMB" },
  "Marche":                { x: 116, y: 104, label: "MAR" },
  "Lazio":                 { x: 90,  y: 136, label: "LAZ" },
  "Abruzzo":               { x: 116, y: 130, label: "ABR" },
  "Molise":                { x: 118, y: 150, label: "MOL" },
  "Campania":              { x: 100, y: 166, label: "CAM" },
  "Puglia":                { x: 138, y: 162, label: "PUG" },
  "Basilicata":            { x: 120, y: 182, label: "BAS" },
  "Calabria":              { x: 110, y: 210, label: "CAL" },
  "Sicilia":               { x: 88,  y: 250, label: "SIC" },
  "Sardegna":              { x: 46,  y: 188, label: "SAR" },
}

const COLORI = {
  nessuno:   '#3a3a4a',
  basso:     '#ef4444',  // < 5
  medio:     '#f59e0b',  // 5-6
  buono:     '#3b82f6',  // 7
  ottimo:    '#10b981',  // >= 8
}

function getColore(avgVoto: number) {
  if (avgVoto >= 8) return COLORI.ottimo
  if (avgVoto >= 7) return COLORI.buono
  if (avgVoto >= 5) return COLORI.medio
  return COLORI.basso
}

function getRaggio(count: number) {
  if (count >= 10) return 16
  if (count >= 5)  return 13
  if (count >= 3)  return 11
  if (count >= 2)  return 9
  return 7
}

type Giocatore = {
  id: string
  nome_giocatore_ext: string | null
  club_attuale_ext: string | null
  voto_globale: number | null
  potenziale: string | null
  esito: string | null
  regione_provenienza: string | null
  nazione_provenienza: string | null
  data_osservazione: string
}

type RegionData = {
  regione: string
  giocatori: Giocatore[]
  avgVoto: number
}

type Props = {
  giocatori: Giocatore[]
}

export default function MappaItaliaScout({ giocatori }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  // Raggruppa per regione
  const byRegione: Record<string, Giocatore[]> = {}
  const esteri: Giocatore[] = []

  giocatori.forEach(g => {
    const reg  = g.regione_provenienza?.trim()
    const naz  = g.nazione_provenienza?.trim() ?? 'Italia'
    if (reg && REGIONI_IT[reg]) {
      ;(byRegione[reg] ||= []).push(g)
    } else if (naz !== 'Italia') {
      esteri.push(g)
    } else if (reg) {
      // regione non mappa ma italiana
      ;(byRegione[reg] ||= []).push(g)
    }
  })

  const regioniData: RegionData[] = Object.entries(byRegione).map(([reg, gs]) => ({
    regione: reg,
    giocatori: gs,
    avgVoto: gs.reduce((s, g) => s + (g.voto_globale ?? 0), 0) / gs.length,
  }))

  const activeRegion = selected ?? hovered
  const activeData   = regioniData.find(r => r.regione === activeRegion)

  const esitoLabel: Record<string, string> = {
    in_valutazione: 'In valutazione',
    ingaggiato:     'Ingaggiato',
    rifiutato:      'Rifiutato',
    archiviato:     'Archiviato',
    lista_attesa:   'Lista attesa',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

      {/* Mappa SVG */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox="0 0 180 290"
          style={{ width: '100%', overflow: 'visible' }}
          aria-label="Mappa Italia scouting"
        >
          {/* Sfondo */}
          <rect width="180" height="290" fill="transparent" />

          {/* Disegna tutte le regioni come cerchi */}
          {Object.entries(REGIONI_IT).map(([nome, pos]) => {
            const rData   = regioniData.find(r => r.regione === nome)
            const count   = rData?.giocatori.length ?? 0
            const avg     = rData?.avgVoto ?? 0
            const colore  = count > 0 ? getColore(avg) : COLORI.nessuno
            const raggio  = count > 0 ? getRaggio(count) : 5
            const isActive = nome === activeRegion
            const opacity  = activeRegion && !isActive ? 0.35 : 1

            return (
              <g
                key={nome}
                style={{ cursor: count > 0 ? 'pointer' : 'default', transition: 'opacity 0.2s' }}
                opacity={opacity}
                onMouseEnter={() => count > 0 && setHovered(nome)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => count > 0 && setSelected(selected === nome ? null : nome)}
              >
                {/* Alone per regione attiva */}
                {isActive && count > 0 && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={raggio + 5}
                    fill={colore}
                    opacity={0.2}
                  />
                )}

                {/* Cerchio principale */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={raggio}
                  fill={colore}
                  stroke={isActive ? 'white' : 'rgba(255,255,255,0.15)'}
                  strokeWidth={isActive ? 2 : 1}
                />

                {/* Numero giocatori */}
                {count > 0 && (
                  <text
                    x={pos.x}
                    y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={raggio >= 10 ? 8 : 6}
                    fill="white"
                    fontWeight="700"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {count}
                  </text>
                )}

                {/* Label regione (solo se ha giocatori o è hovering) */}
                {(count > 0) && (
                  <text
                    x={pos.x}
                    y={pos.y + raggio + 6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={5}
                    fill={count > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {pos.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Legenda */}
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>LEGENDA VOTO MEDIO</div>
          {[
            { label: '≥ 8 — Ottimo',  color: COLORI.ottimo },
            { label: '7 — Buono',     color: COLORI.buono },
            { label: '5-6 — Medio',   color: COLORI.medio },
            { label: '< 5 — Basso',   color: COLORI.basso },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pannello dettaglio */}
      <div>
        {activeData ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-card-header)',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  📍 {activeData.regione}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {activeData.giocatori.length} giocatore{activeData.giocatori.length > 1 ? 'i' : ''} ·
                  media <strong style={{ color: getColore(activeData.avgVoto) }}>
                    {activeData.avgVoto.toFixed(1)}
                  </strong>
                </div>
              </div>
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {activeData.giocatori.map(g => (
                <div
                  key={g.id}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex', gap: 12, alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: getColore(g.voto_globale ?? 0),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, color: 'white',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {g.voto_globale ?? '—'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.nome_giocatore_ext ?? '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {g.club_attuale_ext ?? 'Club n.d.'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: g.potenziale === 'eccezionale' ? '#7c3aed22' : g.potenziale === 'alto' ? '#10b98122' : '#3b82f622',
                      color: g.potenziale === 'eccezionale' ? '#7c3aed' : g.potenziale === 'alto' ? '#10b981' : '#3b82f6',
                      fontWeight: 500,
                    }}>
                      {g.potenziale}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(g.data_osservazione).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Riepilogo per regione */}
            {regioniData.length > 0 ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Clicca una regione sulla mappa per i dettagli
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...regioniData].sort((a, b) => b.giocatori.length - a.giocatori.length).slice(0, 8).map(r => (
                    <div
                      key={r.regione}
                      onClick={() => setSelected(r.regione)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                        padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = getColore(r.avgVoto))}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: getColore(r.avgVoto),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, color: 'white',
                      }}>
                        {r.giocatori.length}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          📍 {r.regione}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Media {r.avgVoto.toFixed(1)} · {r.giocatori.filter(g => (g.voto_globale ?? 0) >= 8).length} top
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nessun giocatore posizionato sulla mappa.<br />
                <span style={{ fontSize: 12 }}>Specifica la regione di provenienza nei report.</span>
              </div>
            )}

            {/* Esteri */}
            {esteri.length > 0 && (
              <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  🌍 Giocatori stranieri ({esteri.length})
                </div>
                {esteri.map(g => (
                  <div key={g.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: getColore(g.voto_globale ?? 0),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12, color: 'white',
                    }}>
                      {g.voto_globale ?? '—'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{g.nome_giocatore_ext}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{g.nazione_provenienza}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
