'use client'
import { useState } from 'react'
import ViewAsPanel from '@/components/admin/ViewAsPanel'

export default function DemoRoleSwitcher({ clubId, clubNome }: { clubId: string; clubNome?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '8px 14px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text-primary)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        🎭 Prova ruoli (demo)
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 200, width: 420 }}>
          <ViewAsPanel clubId={clubId} clubNome={clubNome} variant="compact" />
        </div>
      )}
    </div>
  )
}
