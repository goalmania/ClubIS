'use client'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { formatData, formatOra } from '@/lib/helpers'

const TIPO_LABEL: Record<string, string> = {
  intervista_tv:     '📺 Intervista TV',
  conferenza_stampa: '🎙 Conferenza stampa',
  intervista_radio:  '📻 Intervista radio',
  podcast:           '🎧 Podcast',
  photoshoot:        '📸 Photoshoot',
  altro:             '📌 Altro',
}

const STATO_INFO: Record<string, { label: string; colore: string }> = {
  da_confermare: { label: 'Da confermare', colore: 'var(--ambra)' },
  confermato:    { label: 'Confermato',    colore: 'var(--verde)' },
  annullato:     { label: 'Annullato',     colore: 'var(--rosso)' },
  completato:    { label: 'Completato',    colore: 'var(--grigio-3)' },
}

export default function IntervistePage() {
  const [eventi, setEventi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/ufficio-stampa/eventi-media')
    const json = await res.json()
    setEventi(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pending = eventi.filter(e => e.stato === 'da_confermare')
  const confermati = eventi.filter(e => e.stato === 'confermato')
  const completati = eventi.filter(e => e.stato === 'completato')
  const annullati = eventi.filter(e => e.stato === 'annullato')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Interviste & TV
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            Programmazione interviste e impegni con le emittenti
          </p>
        </div>
        <Link data-onboarding="btn-nuova-intervista" href="/dashboard/ufficio-stampa/interviste/nuova" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 16px', background: 'var(--accent)', color: '#0a0a0a',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
          textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', borderRadius: 2,
        }}>
          + Nuova
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { titolo: 'Da confermare', items: pending, evidenza: true },
            { titolo: 'Confermati', items: confermati, evidenza: false },
            { titolo: 'Completati', items: completati, evidenza: false },
            { titolo: 'Annullati', items: annullati, evidenza: false },
          ].filter(g => g.items.length > 0).map(gruppo => (
            <div key={gruppo.titolo}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: gruppo.evidenza ? 'var(--ambra)' : '#444',
                marginBottom: 10,
              }}>
                {gruppo.titolo} ({gruppo.items.length})
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Data / Ora</th>
                      <th>Emittente</th>
                      <th>Luogo</th>
                      <th>Durata</th>
                      <th>Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruppo.items.map(ev => {
                      const info = STATO_INFO[ev.stato] ?? { label: ev.stato, colore: 'var(--grigio-3)' }
                      return (
                        <tr key={ev.id}>
                          <td style={{ fontWeight: 500, fontSize: 13 }}>{TIPO_LABEL[ev.tipo] ?? ev.tipo}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {formatData(ev.data_ora)} {formatOra(ev.data_ora)}
                          </td>
                          <td style={{ fontSize: 12 }}>{ev.emittente_testata ?? '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{ev.luogo ?? '—'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ev.durata_minuti} min</td>
                          <td>
                            <span style={{
                              fontSize: 10, fontFamily: 'var(--font-mono)',
                              color: info.colore, background: `${info.colore}20`,
                              padding: '3px 8px', borderRadius: 2,
                            }}>
                              {info.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {eventi.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
              Nessuna intervista programmata.{' '}
              <Link href="/dashboard/ufficio-stampa/interviste/nuova" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Creane una
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
