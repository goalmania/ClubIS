'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface ClubOption {
  club_id: string
  nome: string
  categoria: string
  logo_url: string | null
}

interface ClubSwitcherProps {
  clubs: ClubOption[]
  activeClubId: string
}

export default function ClubSwitcher({ clubs, activeClubId }: ClubSwitcherProps) {
  const router = useRouter()
  const [switching, setSwitching] = useState(false)

  if (clubs.length <= 1) return null

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClubId = e.target.value
    if (newClubId === activeClubId) return
    setSwitching(true)
    try {
      const res = await fetch('/api/club/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: newClubId }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border-solid)' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444',
        textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5,
      }}>
        Club attivo
      </div>
      <select
        value={activeClubId}
        onChange={handleChange}
        disabled={switching}
        style={{
          width: '100%',
          background: '#1a1a1a',
          color: switching ? 'var(--gray)' : 'var(--accent)',
          border: '1px solid var(--border-solid)',
          borderRadius: 4,
          padding: '5px 8px',
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: switching ? 'wait' : 'pointer',
          outline: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          paddingRight: 24,
        }}
      >
        {clubs.map(c => (
          <option key={c.club_id} value={c.club_id}>
            {c.nome}
          </option>
        ))}
      </select>
    </div>
  )
}
