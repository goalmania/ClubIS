'use client'
import { useState } from 'react'
import type { RuoloUtente } from '@/types/database'
import { ruoloLabel } from '@/lib/helpers'

const RUOLI_IMPERSONABILI: RuoloUtente[] = [
  'presidente',
  'ds',
  'segretario',
  'medico',
  'team_manager',
  'allenatore',
  'osservatore',
  'famiglia',
  'giocatore',
]

export default function ImpersonationBanner({
  ruolo,
  clubNome,
}: {
  ruolo: RuoloUtente
  clubNome?: string
}) {
  const [loading, setLoading] = useState(false)
  const [switchingRole, setSwitchingRole] = useState<RuoloUtente>(ruolo)
  const [switching, setSwitching] = useState(false)

  const stop = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/impersonate/stop', { method: 'POST' })
    const data = await res.json()
    if (data.redirect) {
      window.location.href = data.redirect
    } else {
      window.location.reload()
    }
  }

  const switchRole = async () => {
    if (switchingRole === ruolo) return
    setSwitching(true)
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruolo: switchingRole }),
    })
    const data = await res.json()
    if (data.redirect) {
      window.location.href = data.redirect
    } else {
      window.location.reload()
    }
  }

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'linear-gradient(90deg, var(--accent-red), var(--accent-orange))',
      color: 'white',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      fontSize: 13,
      fontWeight: 500,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17.5 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"/>
          <path d="M19 20h-2a4 4 0 0 0-8 0H7a6 6 0 0 1 12 0Z"/>
        </svg>
        <span>
          <strong>Modalità impersonation</strong> — stai visualizzando come{' '}
          <strong>{(ruoloLabel as any)?.[ruolo] ?? ruolo}</strong>
          {clubNome && <> · {clubNome}</>}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          value={switchingRole}
          onChange={(e) => setSwitchingRole(e.target.value as RuoloUtente)}
          disabled={loading || switching}
          style={{
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 6,
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {RUOLI_IMPERSONABILI.map((r) => (
            <option key={r} value={r} style={{ color: 'black' }}>
              {(ruoloLabel as Record<RuoloUtente, string>)[r] ?? r}
            </option>
          ))}
        </select>
        <button
          onClick={switchRole}
          disabled={loading || switching || switchingRole === ruolo}
          style={{
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 6,
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading || switching || switchingRole === ruolo ? 0.6 : 1,
          }}
        >
          {switching ? 'Cambio…' : 'Cambia ruolo'}
        </button>
        <button
          onClick={stop}
          disabled={loading || switching}
          style={{
            padding: '6px 14px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 6,
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading || switching ? 0.6 : 1,
          }}
        >
          {loading ? 'Uscita…' : 'Esci da impersonation'}
        </button>
      </div>
    </div>
  )
}
