'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { coloreCountdown, labelCountdown, TIPI_SCADENZA_FIGC } from '@/lib/scadenze-figc'
import type { TipoScadenzaFIGC } from '@/lib/scadenze-figc'

interface Props {
  /** true = solo prossima scadenza come banner compatto; false = lista completa */
  compact?: boolean
}

export default function ScadenzeFIGCWidget({ compact = false }: Props) {
  const [scadenze, setScadenze] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/scadenze-figc')
      .then(r => r.json())
      .then(d => {
        if (mounted) {
          setScadenze(d.scadenze ?? [])
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const giorniA = (data: string) =>
    Math.ceil((new Date(data).getTime() - Date.now()) / 86400000)

  const attive = scadenze.filter(s => s.stato !== 'completata')
  const prossima = attive[0]

  if (loading || attive.length === 0) return null

  // ── Modalità compact: singolo banner con prossima scadenza ───────────────
  if (compact && prossima) {
    const giorni = giorniA(prossima.data_scadenza)
    const col = coloreCountdown(giorni)
    const tipoMeta = TIPI_SCADENZA_FIGC[prossima.tipo as TipoScadenzaFIGC]

    return (
      <Link href="/dashboard/segretario/scadenze-figc" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
        <div style={{
          padding: '12px 14px',
          background: `color-mix(in srgb, ${col} 9%, rgba(255,255,255,0.03))`,
          border: `1px solid color-mix(in srgb, ${col} 26%, transparent)`,
          borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}>
          <span style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, color: col,
            background: `color-mix(in srgb, ${col} 16%, transparent)`,
          }}>{tipoMeta?.icona}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
              color: 'var(--white)', marginBottom: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {prossima.titolo}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>
              {labelCountdown(giorni)}
              {attive.length > 1 && ` · altre ${attive.length - 1}`}
            </div>
          </div>
          <div style={{
            flexShrink: 0, padding: '5px 11px', borderRadius: 999,
            fontSize: 13, fontWeight: 600, color: col, whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            background: `color-mix(in srgb, ${col} 16%, transparent)`,
          }}>
            {giorni < 0 ? 'Scaduta' : giorni === 0 ? 'Oggi' : giorni === 1 ? 'Domani' : `${giorni} giorni`}
          </div>
        </div>
      </Link>
    )
  }

  // ── Modalità lista: card con le prime 4 scadenze ─────────────────────────
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--border-solid)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontWeight: 600, fontSize: 17, letterSpacing: '-0.01em',
          color: 'var(--white)',
        }}>
          Scadenziario FIGC
        </div>
        <Link href="/dashboard/segretario/scadenze-figc" style={{
          fontSize: 12, color: 'var(--grigio-3)', fontFamily: 'var(--font-mono)',
          textDecoration: 'none', letterSpacing: '0', textTransform: 'none',
        }}>
          Gestisci →
        </Link>
      </div>

      {attive.slice(0, 4).map(s => {
        const giorni = giorniA(s.data_scadenza)
        const col = coloreCountdown(giorni)
        const tipoMeta = TIPI_SCADENZA_FIGC[s.tipo as TipoScadenzaFIGC]
        return (
          <div key={s.id} style={{
            padding: '10px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, color: col }}>{tipoMeta?.icona}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600, fontSize: 14,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--white)',
              }}>
                {s.titolo}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--grigio-4)',
                fontFamily: 'var(--font-mono)', marginTop: 2,
              }}>
                {new Date(s.data_scadenza).toLocaleDateString('it-IT', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
                {s.importo_previsto != null && ` · €${Number(s.importo_previsto).toFixed(0)}`}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 13, color: col, flexShrink: 0, textAlign: 'right',
              whiteSpace: 'nowrap',
            }}>
              {labelCountdown(giorni)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
