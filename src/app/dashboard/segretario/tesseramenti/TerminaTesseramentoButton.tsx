'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TerminaTesseramentoButton({ tesseramentoId, nomeCompleto }: { tesseramentoId: string; nomeCompleto: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const termina = async () => {
    if (!confirm(`Terminare il tesseramento di ${nomeCompleto}? Passerà in archivio; lo storico resta consultabile dalla sua scheda.`)) return
    setLoading(true)
    const res = await fetch(`/api/tesseramenti/${tesseramentoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'cessato' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Errore durante la terminazione del tesseramento')
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{ fontSize: 12, color: 'var(--rosso)' }}
      disabled={loading}
      onClick={termina}
    >
      {loading ? '...' : 'Termina'}
    </button>
  )
}
