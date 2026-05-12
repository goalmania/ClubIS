'use client'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { formatData, formatOra } from '@/lib/helpers'

const TIPO_LABEL: Record<string, string> = {
  intervista_tv:     'Intervista TV',
  conferenza_stampa: 'Conferenza stampa',
  intervista_radio:  'Intervista radio',
  podcast:           'Podcast',
  photoshoot:        'Photoshoot',
  altro:             'Altro',
}

const STATO_INFO: Record<string, { label: string; colore: string; bg: string }> = {
  da_confermare: { label: 'Da confermare', colore: 'var(--ambra)',   bg: 'var(--ambra-lt)' },
  confermato:    { label: 'Confermato',    colore: 'var(--verde)',   bg: 'var(--verde-lt)' },
  annullato:     { label: 'Annullato',     colore: 'var(--rosso)',   bg: 'var(--rosso-lt)' },
  completato:    { label: 'Completato',    colore: 'var(--grigio-3)', bg: '#1a1a1a' },
}

export default function CalendarioMediaPage() {
  const [eventi, setEventi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState<string>('tutti')
  const [aggiornando, setAggiornando] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/ufficio-stampa/eventi-media')
    const json = await res.json()
    setEventi(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const cambiaStato = async (id: string, stato: string) => {
    setAggiornando(id)
    await fetch('/api/ufficio-stampa/eventi-media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stato }),
    })
    await load()
    setAggiornando(null)
    setToast('Stato aggiornato')
    setTimeout(() => setToast(null), 2500)
  }

  const elimina = async (id: string) => {
    if (!confirm('Eliminare questo evento?')) return
    await fetch(`/api/ufficio-stampa/eventi-media?id=${id}`, { method: 'DELETE' })
    await load()
  }

  const filtrati = filtroStato === 'tutti' ? eventi : eventi.filter(e => e.stato === filtroStato)

  // Raggruppa per settimana
  const perSettimana: Record<string, any[]> = {}
  filtrati.forEach(ev => {
    const d = new Date(ev.data_ora)
    // Lunedì della settimana
    const giorno = d.getDay()
    const diff = d.getDate() - giorno + (giorno === 0 ? -6 : 1)
    const lun = new Date(d.setDate(diff))
    const key = lun.toISOString().slice(0, 10)
    if (!perSettimana[key]) perSettimana[key] = []
    perSettimana[key].push(ev)
  })

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--verde)', color: '#fff', padding: '10px 18px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 13, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Calendario Media</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>Interviste, conferenze stampa e impegni media</p>
        </div>
        <Link href="/dashboard/ufficio-stampa/interviste/nuova" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 16px', background: 'var(--accent)', color: '#0a0a0a',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
          textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', borderRadius: 2,
        }}>
          + Nuovo evento
        </Link>
      </div>

      {/* Filtri stato */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['tutti', 'da_confermare', 'confermato', 'completato', 'annullato'].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStato(s)}
            style={{
              padding: '5px 12px', borderRadius: 2, border: '1px solid var(--border-solid)',
              fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
              cursor: 'pointer',
              background: filtroStato === s ? 'var(--accent)' : 'transparent',
              color: filtroStato === s ? '#0a0a0a' : 'var(--grigio-3)',
            }}
          >
            {s === 'tutti' ? 'Tutti' : (STATO_INFO[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
      ) : filtrati.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
          Nessun evento trovato.{' '}
          <Link href="/dashboard/ufficio-stampa/interviste/nuova" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Creane uno
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Object.entries(perSettimana).sort(([a], [b]) => a.localeCompare(b)).map(([lunedì, eventiSettimana]) => {
            const fine = new Date(lunedì)
            fine.setDate(fine.getDate() + 6)
            return (
              <div key={lunedì}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: '#444', marginBottom: 10, paddingBottom: 6,
                  borderBottom: '1px solid var(--border-solid)',
                }}>
                  Settimana {formatData(lunedì)} – {formatData(fine.toISOString().slice(0, 10))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {eventiSettimana.map(ev => {
                    const info = STATO_INFO[ev.stato] ?? { label: ev.stato, colore: 'var(--grigio-3)', bg: '#1a1a1a' }
                    return (
                      <div key={ev.id} style={{
                        display: 'grid', gridTemplateColumns: '56px 1fr auto',
                        gap: 16, alignItems: 'center',
                        padding: '14px 16px',
                        background: '#111', border: '1px solid var(--border-solid)',
                        borderRadius: 2,
                        borderLeft: `3px solid ${info.colore}`,
                      }}>
                        {/* Data/ora */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>
                            {new Date(ev.data_ora).getDate()}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--grigio-4)', textTransform: 'uppercase' }}>
                            {new Date(ev.data_ora).toLocaleDateString('it-IT', { month: 'short' })}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-3)', marginTop: 2 }}>
                            {formatOra(ev.data_ora)}
                          </div>
                        </div>

                        {/* Info */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>
                              {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                            </span>
                            {ev.emittente_testata && (
                              <span style={{ fontSize: 12, color: 'var(--grigio-4)' }}>· {ev.emittente_testata}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--grigio-4)' }}>
                            {ev.luogo && <span>📍 {ev.luogo}</span>}
                            <span>⏱ {ev.durata_minuti} min</span>
                            {ev.soggetti_coinvolti?.length > 0 && (
                              <span>👤 {ev.soggetti_coinvolti.length} soggett{ev.soggetti_coinvolti.length === 1 ? 'o' : 'i'}</span>
                            )}
                          </div>
                          {ev.note && <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4, fontStyle: 'italic' }}>{ev.note}</div>}
                        </div>

                        {/* Azioni */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <span style={{
                            fontSize: 10, fontFamily: 'var(--font-mono)',
                            color: info.colore, background: info.bg,
                            padding: '4px 10px', borderRadius: 2,
                          }}>
                            {info.label}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {ev.stato === 'da_confermare' && (
                              <button
                                onClick={() => cambiaStato(ev.id, 'confermato')}
                                disabled={aggiornando === ev.id}
                                style={{
                                  padding: '4px 10px', background: 'var(--verde-lt)', color: 'var(--verde)',
                                  border: '1px solid var(--verde-bd)', borderRadius: 2, cursor: 'pointer',
                                  fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
                                }}
                              >
                                Conferma
                              </button>
                            )}
                            {ev.stato === 'confermato' && (
                              <button
                                onClick={() => cambiaStato(ev.id, 'completato')}
                                disabled={aggiornando === ev.id}
                                style={{
                                  padding: '4px 10px', background: '#1a1a1a', color: 'var(--grigio-3)',
                                  border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer',
                                  fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
                                }}
                              >
                                Completa
                              </button>
                            )}
                            <button
                              onClick={() => elimina(ev.id)}
                              style={{
                                padding: '4px 8px', background: 'transparent', color: 'var(--grigio-4)',
                                border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer',
                                fontSize: 11,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
