'use client'
import { useState } from 'react'
import type { RuoloUtente } from '@/types/database'

const RUOLI: { key: RuoloUtente; label: string; icon: string; color: string }[] = [
  { key: 'presidente',    label: 'Presidente',       icon: '👔', color: 'var(--accent-blue)' },
  { key: 'ds',            label: 'Dir. Sportivo',    icon: '📋', color: 'var(--accent-purple)' },
  { key: 'segretario',    label: 'Segretario',       icon: '📝', color: 'var(--accent-orange)' },
  { key: 'allenatore',    label: 'Allenatore',       icon: '⚽', color: 'var(--accent-green)' },
  { key: 'medico',        label: 'Medico',           icon: '🏥', color: 'var(--accent-red)' },
  { key: 'osservatore',   label: 'Osservatore',      icon: '🔭', color: 'var(--accent-blue)' },
  { key: 'team_manager',  label: 'Team Manager',     icon: '📊', color: 'var(--accent-purple)' },
  { key: 'famiglia',      label: 'Famiglia',         icon: '👨‍👩‍👧', color: 'var(--accent-orange)' },
  { key: 'giocatore',     label: 'Giocatore',        icon: '🎽', color: 'var(--accent-green)' },
  { key: 'ufficio_stampa', label: 'Ufficio Stampa',  icon: '📰', color: 'var(--accent-blue)' },
  { key: 'custode',       label: 'Custode',          icon: '🏟', color: 'var(--accent-orange)' },
]

export default function ViewAsPanel({
  clubId,
  clubNome,
  variant = 'full',
}: {
  clubId: string
  clubNome?: string
  variant?: 'full' | 'compact'
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const impersonate = async (ruolo: RuoloUtente) => {
    setLoading(ruolo)
    setError('')
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId, ruolo }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Errore')
        setLoading(null)
        return
      }
      window.location.href = data.redirect ?? '/dashboard'
    } catch (e: any) {
      setError(e.message ?? 'Errore di rete')
      setLoading(null)
    }
  }

  return (
    <div className="card" style={{ padding: variant === 'full' ? 20 : 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Visualizza come
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Entra nella dashboard {clubNome ? `di ${clubNome}` : 'del club'} con il ruolo selezionato
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: variant === 'compact' ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
        gap: 8,
      }}>
        {RUOLI.map(r => (
          <button
            key={r.key}
            onClick={() => impersonate(r.key)}
            disabled={loading !== null}
            style={{
              padding: '12px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
              opacity: loading && loading !== r.key ? 0.4 : 1,
              borderLeft: `3px solid ${r.color}`,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--bg-card-hover, var(--bg-card))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-input)'
            }}
          >
            <span style={{ fontSize: 22 }}>{r.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {loading === r.key ? 'Apertura…' : r.label}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: 'var(--accent-red-lt)',
          color: 'var(--accent-red)',
          borderRadius: 6,
          fontSize: 12,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
