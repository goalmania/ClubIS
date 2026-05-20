'use client'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { formatData } from '@/lib/helpers'

const STATO_INFO: Record<string, { label: string; colore: string }> = {
  bozza:           { label: 'Bozza',         colore: 'var(--grigio-3)' },
  inviato_grafico: { label: 'Al grafico',     colore: 'var(--blu)' },
  in_lavorazione:  { label: 'In lavorazione', colore: 'var(--ambra)' },
  completato:      { label: 'Completato',     colore: 'var(--verde)' },
}

export default function LocandineListPage() {
  const [briefs, setBriefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('tutti')
  const [aggiornando, setAggiornando] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/ufficio-stampa/brief-locandine')
    const json = await res.json()
    setBriefs(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const avanzaStato = async (id: string, statoAttuale: string) => {
    const progressione: Record<string, string> = {
      bozza: 'inviato_grafico',
      inviato_grafico: 'in_lavorazione',
      in_lavorazione: 'completato',
    }
    const prossimoStato = progressione[statoAttuale]
    if (!prossimoStato) return
    setAggiornando(id)
    await fetch('/api/ufficio-stampa/brief-locandine', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stato: prossimoStato }),
    })
    await load()
    setAggiornando(null)
    setToast('Stato aggiornato')
    setTimeout(() => setToast(null), 2500)
  }

  const elimina = async (id: string) => {
    if (!confirm('Eliminare questo brief?')) return
    await fetch(`/api/ufficio-stampa/brief-locandine?id=${id}`, { method: 'DELETE' })
    await load()
  }

  const filtrati = filtro === 'tutti' ? briefs : briefs.filter(b => b.stato === filtro)
  const labelProssimo: Record<string, string> = {
    bozza: '→ Invia al grafico',
    inviato_grafico: '→ In lavorazione',
    in_lavorazione: '→ Completa',
  }

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--verde)', color: '#fff', padding: '10px 18px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 13, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Brief Locandine</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>Form strutturati per chi realizza la grafica esternamente</p>
        </div>
        <Link href="/dashboard/ufficio-stampa/locandine/nuova" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 16px', background: 'var(--accent)', color: '#0a0a0a',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
          textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', borderRadius: 2,
        }}>
          + Nuovo brief
        </Link>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['tutti', 'bozza', 'inviato_grafico', 'in_lavorazione', 'completato'].map(s => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            style={{
              padding: '5px 12px', borderRadius: 2, border: '1px solid var(--border-solid)',
              fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
              cursor: 'pointer',
              background: filtro === s ? 'var(--accent)' : 'transparent',
              color: filtro === s ? '#0a0a0a' : 'var(--grigio-3)',
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
          Nessun brief trovato.{' '}
          <Link href="/dashboard/ufficio-stampa/locandine/nuova" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Creane uno</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Data evento</th>
                <th>Competizione</th>
                <th>Campo</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map(b => {
                const info = STATO_INFO[b.stato] ?? { label: b.stato, colore: 'var(--grigio-3)' }
                const prossimo = labelProssimo[b.stato]
                return (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{b.titolo_evento}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatData(b.data_evento)}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{b.competizione ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{b.campo_impianto ?? '—'}</td>
                    <td>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: info.colore, background: `${info.colore}20`, padding: '3px 8px', borderRadius: 2 }}>
                        {info.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {prossimo && (
                          <button
                            onClick={() => avanzaStato(b.id, b.stato)}
                            disabled={aggiornando === b.id}
                            style={{
                              padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-mono)',
                              background: 'var(--accent-lt)', color: 'var(--accent)',
                              border: '1px solid var(--accent)', borderRadius: 2,
                              cursor: 'pointer', textTransform: 'uppercase',
                            }}
                          >
                            {prossimo}
                          </button>
                        )}
                        <button
                          onClick={() => elimina(b.id)}
                          style={{
                            padding: '4px 8px', background: 'transparent', color: 'var(--grigio-4)',
                            border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer', fontSize: 11,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
