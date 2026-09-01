'use client'
import { useState, useEffect } from 'react'

export type GiocatoreClubOption = {
  id: string
  nome: string
  cognome: string
  numero_maglia: number | null
  ruolo_principale: string | null
  categoria_eta: string | null
}

export function useGiocatoriClub(clubId: string | null) {
  const [giocatori, setGiocatori] = useState<GiocatoreClubOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clubId) return
    let cancelled = false
    setLoading(true)
    fetch('/api/giocatori?tutti=1')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (cancelled) return
        console.log('useGiocatoriClub giocatori caricati:', Array.isArray(data) ? data.length : 0, '— club_id:', clubId)
        setGiocatori(
          Array.isArray(data) ? data.map(g => ({
            id: g.id,
            nome: g.nome ?? '',
            cognome: g.cognome ?? '',
            numero_maglia: g.numero_maglia ?? null,
            ruolo_principale: g.ruolo_principale ?? null,
            categoria_eta: g.categoria_eta ?? null,
          })) : []
        )
      })
      .catch(() => { if (!cancelled) setGiocatori([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [clubId])

  return { giocatori, loading }
}
