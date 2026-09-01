'use client'
import { useState } from 'react'
import { CATEGORIE_FEDERALI_OPTIONS } from '@/lib/settore-giovanile'

interface Props {
  allenatoreId: string
  categoriaAttuale: string | null
}

export default function CambiaCategoriaAllenatore({ allenatoreId, categoriaAttuale }: Props) {
  const [categoria, setCategoria] = useState(categoriaAttuale ?? '')
  const [saving, setSaving] = useState(false)
  const [salvato, setSalvato] = useState(false)

  async function salva(nuovaCategoria: string) {
    setCategoria(nuovaCategoria)
    if (!nuovaCategoria) return
    setSaving(true)
    setSalvato(false)
    try {
      const res = await fetch('/api/settore-giovanile/allenatore-categoria', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allenatoreId, categoriaFederale: nuovaCategoria }),
      })
      if (res.ok) {
        setSalvato(true)
        setTimeout(() => setSalvato(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        className="input"
        value={categoria}
        onChange={e => salva(e.target.value)}
        disabled={saving}
        style={{ fontSize: 11, padding: '4px 8px', background: '#1a1a1a', color: 'var(--white)', maxWidth: 160 }}
      >
        <option value="">— Categoria —</option>
        {CATEGORIE_FEDERALI_OPTIONS.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      {salvato && <span style={{ color: 'var(--verde, #4ade80)', fontSize: 12 }}>✓</span>}
    </div>
  )
}
