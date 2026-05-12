'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Risultato = {
  tipo: string
  id: string
  label: string
  sublabel: string
  path: string
  icon: string
  categoria: string
}

const COLORI_CATEGORIA: Record<string, string> = {
  'Accesso rapido': '#555',
  'Pagine':         '#c8f000',
  'Giocatori':      '#4ade80',
  'Staff':          '#60a5fa',
  'Partite':        '#f59e0b',
  'Trasferte':      '#a78bfa',
  'Contratti':      '#fb923c',
  'Infortuni':      '#f87171',
  'Report Scouting':'#38bdf8',
  'Sponsor':        '#e879f9',
}

export default function RicercaGlobale() {
  const [query, setQuery]         = useState('')
  const [risultati, setRisultati] = useState<Risultato[]>([])
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [selIdx, setSelIdx]       = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const paletteRef = useRef<HTMLDivElement>(null)
  const router    = useRouter()

  // Cmd+K / Ctrl+K apre il palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); setRisultati([]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Blocca scroll body quando palette è aperta
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Fetch debounced
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setRisultati(data.risultati ?? [])
        setSelIdx(0)
      } catch {
        setRisultati([])
      } finally {
        setLoading(false)
      }
    }, query.length >= 2 ? 220 : 50)
    return () => clearTimeout(timer)
  }, [query])

  // Focus input quando si apre
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const naviga = useCallback((path: string) => {
    router.push(path)
    setOpen(false)
    setQuery('')
    setRisultati([])
  }, [router])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const flat = risultati
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && flat[selIdx]) naviga(flat[selIdx].path)
  }

  // Ragruppa risultati per categoria preservando l'ordine
  const gruppi = risultati.reduce<Array<{ categoria: string; items: Risultato[] }>>((acc, r) => {
    const last = acc[acc.length - 1]
    if (last && last.categoria === r.categoria) {
      last.items.push(r)
    } else {
      acc.push({ categoria: r.categoria, items: [r] })
    }
    return acc
  }, [])

  // Mappa risultato → indice flat (per evidenziare quello selezionato)
  let flatIdx = 0

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 34, padding: '0 12px',
          background: 'var(--grigio-6, #1a1a1a)',
          border: '1px solid var(--border-solid, #2a2a2a)',
          borderRadius: 4,
          cursor: 'pointer',
          color: 'var(--gray, #666)',
          fontSize: 13,
          minWidth: 220,
          flex: 1,
          maxWidth: 360,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          Cerca in ClubIS…
        </span>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)',
          background: 'var(--grigio-5, #222)', border: '1px solid #333',
          padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em',
          color: '#555',
        }}>
          ⌘K
        </span>
      </button>
    )
  }

  return (
    <>
      {/* Overlay scuro */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={() => { setOpen(false); setQuery(''); setRisultati([]) }}
      />

      {/* Palette panel */}
      <div
        ref={paletteRef}
        style={{
          position: 'fixed',
          top: '10vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(640px, 95vw)',
          zIndex: 9999,
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
      >
        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid #1e1e1e',
        }}>
          {loading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cerca giocatori, partite, funzioni, documenti…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#f0f0f0', fontSize: 15,
              fontFamily: 'var(--font-display, sans-serif)',
              letterSpacing: '0.03em',
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={() => { setOpen(false); setQuery(''); setRisultati([]) }}
            style={{
              background: 'none', border: '1px solid #2a2a2a', cursor: 'pointer',
              color: '#555', fontSize: 11, padding: '2px 6px', borderRadius: 3,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            ESC
          </button>
        </div>

        {/* Risultati */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {risultati.length === 0 && !loading && query.length >= 2 ? (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              color: '#444', fontSize: 13, fontFamily: 'var(--font-mono)',
            }}>
              Nessun risultato per &quot;{query}&quot;
            </div>
          ) : (
            gruppi.map(({ categoria, items }) => (
              <div key={categoria}>
                {/* Header categoria */}
                <div style={{
                  padding: '8px 16px 4px',
                  fontSize: 10, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: COLORI_CATEGORIA[categoria] ?? '#666',
                  borderTop: '1px solid #181818',
                }}>
                  {categoria}
                </div>

                {/* Voci */}
                {items.map(r => {
                  const thisIdx = flatIdx++
                  const attivo  = thisIdx === selIdx
                  return (
                    <div
                      key={`${r.tipo}-${r.id}`}
                      onClick={() => naviga(r.path)}
                      onMouseEnter={() => setSelIdx(thisIdx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 16px',
                        cursor: 'pointer',
                        background: attivo ? 'rgba(200,240,0,0.06)' : 'transparent',
                        borderLeft: attivo ? '2px solid var(--accent, #c8f000)' : '2px solid transparent',
                        transition: 'background 0.08s',
                      }}
                    >
                      {/* Icona */}
                      <span style={{
                        width: 28, height: 28, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: attivo ? 'rgba(200,240,0,0.08)' : '#1a1a1a',
                        borderRadius: 4, fontSize: 14,
                        border: `1px solid ${attivo ? 'rgba(200,240,0,0.2)' : '#242424'}`,
                      }}>
                        {r.icon}
                      </span>

                      {/* Testi */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-display, sans-serif)',
                          fontWeight: 600, fontSize: 13,
                          letterSpacing: '0.04em',
                          color: attivo ? 'var(--accent, #c8f000)' : '#e0e0e0',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {r.label}
                        </div>
                        {r.sublabel && (
                          <div style={{
                            fontSize: 11, color: '#555',
                            fontFamily: 'var(--font-mono)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {r.sublabel}
                          </div>
                        )}
                      </div>

                      {/* Badge tipo */}
                      <span style={{
                        fontSize: 9, color: '#333',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                        background: '#191919',
                        padding: '2px 5px',
                        borderRadius: 3,
                        border: '1px solid #242424',
                      }}>
                        {r.tipo}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '7px 16px',
          borderTop: '1px solid #181818',
          fontSize: 10, color: '#333',
          fontFamily: 'var(--font-mono)',
          display: 'flex', gap: 18, letterSpacing: '0.08em',
        }}>
          <span>↑↓ naviga</span>
          <span>↵ apri</span>
          <span>ESC chiudi</span>
          <span style={{ marginLeft: 'auto' }}>{risultati.length} risultati</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
