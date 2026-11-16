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
    <section className="card pannello">
      <div className="pannello-testa">
        <h2>Stato impianti</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {ticketAperti > 0 && (
            <span className="badge badge-rosso">{ticketAperti} {ticketAperti === 1 ? "ticket aperto" : "ticket aperti"}</span>
          )}
          <Link href={detailHref}>Dettaglio</Link>
        </div>
      </div>

      {loading ? (
        <div className="riga riga-vuota">Caricamento stato impianti…</div>
      ) : (
        <div className="impianti-lista">
          {(Object.entries(AREE_IMPIANTO) as [AreaImpianto, typeof AREE_IMPIANTO[AreaImpianto]][]).map(([key, meta]) => {
            const stato = stati[key] ?? 'giallo'
            const sem = SEMAFORO[stato]
            return (
              <Link key={key} href={detailHref} className="impianto">
                <span className="impianto-icona" aria-hidden="true">{meta.icona}</span>
                <span className="impianto-nome">{meta.label}</span>
                <span className="impianto-stato" style={{ color: sem.color, background: `color-mix(in srgb, ${sem.color} 14%, transparent)` }}>
                  <span className="impianto-pallino" style={{ background: sem.color, boxShadow: `0 0 8px ${sem.color}` }} />
                  {STATO_LABEL[stato]}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
