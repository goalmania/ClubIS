'use client'
import { useState } from 'react'
import Link from 'next/link'
import ViewAsPanel from './ViewAsPanel'

export default function ClubImpersonateRow({
  clubId,
  clubNome,
}: {
  clubId: string
  clubNome: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="btn btn-secondary btn-sm"
        style={{ fontSize: 12 }}
      >
        {open ? 'Chiudi' : '👁 Visualizza come'}
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <ViewAsPanel clubId={clubId} clubNome={clubNome} variant="compact" />
        </div>
      )}
    </>
  )
}
