'use client'
import { useState, useEffect } from 'react'

/**
 * Ritorna il numero di scadenze FIGC urgenti (entro 10 giorni, non completate).
 * Usato dalla Sidebar per mostrare il badge di allerta.
 */
export function useScadenzeFIGCCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    fetch('/api/scadenze-figc')
      .then(r => r.json())
      .then(d => {
        if (!mounted) return
        const urgenti = (d.scadenze ?? []).filter((s: any) => {
          const giorni = Math.ceil(
            (new Date(s.data_scadenza).getTime() - Date.now()) / 86400000
          )
          return s.stato !== 'completata' && giorni >= 0 && giorni <= 10
        })
        setCount(urgenti.length)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  return count
}
