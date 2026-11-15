'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AREE_IMPIANTO, calcolaStatoArea } from '@/lib/impianti'
import type { AreaImpianto } from '@/lib/impianti'

interface Props { ruolo: string }

const SEMAFORO = {
  verde:  { bg: 'rgba(200,240,0,0.15)',  border: 'rgba(200,240,0,0.4)',  color: '#c8f000' },
  giallo: { bg: 'rgba(255,153,0,0.12)',  border: 'rgba(255,153,0,0.4)', color: '#ff9900' },
  rosso:  { bg: 'rgba(255,68,68,0.12)',  border: 'rgba(255,68,68,0.4)', color: '#ff4444' },
} as const

const STATO_LABEL = { verde: 'OK', giallo: 'Attenzione', rosso: 'Problema' } as const

export default function ImpiantiDashboardWidget({ ruolo }: Props) {
  const [stati, setStati] = useState<Record<string, 'verde' | 'giallo' | 'rosso'>>({})
  const [ticketAperti, setTicketAperti] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [checkRes, ticketRes] = await Promise.all([
          fetch('/api/impianti/checklist'),
          fetch('/api/impianti/ticket?stato=aperto'),
        ])
        const { templates, ultimeEsec } = await checkRes.json()
        const { ticket } = await ticketRes.json()
        if (!mounted) return

        setTicketAperti(ticket?.length ?? 0)

        const nuoviStati: Record<string, 'verde' | 'giallo' | 'rosso'> = {}
        for (const area of Object.keys(AREE_IMPIANTO)) {
          const templatePerArea = templates?.filter((t: any) => t.area === area) ?? []
          const esecPerArea = ultimeEsec?.filter((e: any) =>
            templatePerArea.some((t: any) => t.id === e.template_id)
          ) ?? []
          const ultimaEsec = esecPerArea[0] ?? null
          const ticketArea = ticket?.filter((t: any) => t.area === area) ?? []
          nuoviStati[area] = calcolaStatoArea(ultimaEsec, ticketArea)
        }
        setStati(nuoviStati)
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const detailHref = ruolo === 'ds'
    ? '/dashboard/ds/impianti'
    : '/dashboard/presidente/impianti'

  return (
    <div className="card" style={{ padding: '16px 18px 18px', marginBottom: 20 }}>
      <div style={{
        marginBottom: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Stato impianti
        </h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {ticketAperti > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
              background: 'rgba(255,68,68,0.14)', color: '#ff6b6b',
            }}>
              {ticketAperti} ticket aperti
            </span>
          )}
          <Link href={detailHref} className="arrow-link">
            Dettaglio →
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)', fontSize: 12 }}>
          Caricamento stato impianti...
        </div>
      ) : (
        <div className="impianti-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {(Object.entries(AREE_IMPIANTO) as [AreaImpianto, typeof AREE_IMPIANTO[AreaImpianto]][]).map(([key, meta]) => {
            const stato = stati[key] ?? 'giallo'
            const sem = SEMAFORO[stato]
            return (
              <div key={key} style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: 'var(--surface-3)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 17, flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: sem.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{meta.icona}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14, marginBottom: 1,
                  }}>
                    {meta.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: sem.color }} />
                    <span style={{
                      fontSize: 12.5, color: sem.color, fontWeight: 500,
                    }}>
                      {STATO_LABEL[stato]}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
