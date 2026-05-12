'use client'
import { useState } from 'react'
import Link from 'next/link'
import ViewAsPanel from './ViewAsPanel'

type Club = { id: string; nome: string; citta?: string | null; categoria?: string | null; attivo?: boolean | null }

export default function ClubListWithViewAs({ clubs }: { clubs: Club[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!clubs || clubs.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Nessun club disponibile
      </div>
    )
  }

  return (
    <div>
      {clubs.map(c => (
        <div key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: c.attivo ? 'var(--accent-green)' : 'var(--accent-red)',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.citta ?? '—'}
                  {c.categoria && <> · <span style={{ textTransform: 'capitalize' }}>{c.categoria.replace(/_/g, ' ')}</span></>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="btn btn-primary btn-sm"
                style={{ fontSize: 12 }}
              >
                {expanded === c.id ? 'Chiudi' : '👁 Visualizza come'}
              </button>
              <Link href={`/admin/clubs/${c.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
                Dettaglio
              </Link>
            </div>
          </div>
          {expanded === c.id && (
            <div style={{ padding: '0 18px 16px' }}>
              <ViewAsPanel clubId={c.id} clubNome={c.nome} variant="compact" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
