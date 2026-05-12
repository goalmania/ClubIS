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
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em',
        }}>
          🏟 Stato Impianti
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {ticketAperti > 0 && (
            <span style={{
              fontSize: 10, padding: '2px 8px',
              background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.4)',
              color: '#ff4444', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {ticketAperti} ticket aperti
            </span>
          )}
          <Link href={detailHref} style={{
            fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)',
            textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            DETTAGLIO →
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)', fontSize: 12 }}>
          Caricamento stato impianti...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {(Object.entries(AREE_IMPIANTO) as [AreaImpianto, typeof AREE_IMPIANTO[AreaImpianto]][]).map(([key, meta]) => {
            const stato = stati[key] ?? 'giallo'
            const sem = SEMAFORO[stato]
            return (
              <div key={key} style={{
                padding: '12px 16px',
                borderRight: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                background: sem.bg,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.icona}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    textTransform: 'uppercase', fontSize: 11,
                    letterSpacing: '0.04em', marginBottom: 2,
                  }}>
                    {meta.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: sem.color, fontSize: 10 }}>●</span>
                    <span style={{
                      fontSize: 10, color: sem.color,
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      letterSpacing: '0.08em',
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
