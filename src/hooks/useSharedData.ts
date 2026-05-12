'use client'
import { useEffect, useCallback, useRef } from 'react'

/**
 * Ricarica i dati quando:
 * 1. Il componente monta
 * 2. La finestra torna in focus (utente cambia tab e torna)
 * 3. Ogni N secondi (opzionale, default disabilitato)
 */
export function useSharedData(
  loadFn: () => Promise<void>,
  options?: { pollSeconds?: number }
) {
  // Ref per evitare stale closure: chiama sempre la versione più recente di loadFn
  const loadRef = useRef(loadFn)
  useEffect(() => { loadRef.current = loadFn }, [loadFn])

  const load = useCallback(() => loadRef.current(), [])

  useEffect(() => {
    load()

    const onFocus = () => load()
    window.addEventListener('focus', onFocus)

    let interval: ReturnType<typeof setInterval> | undefined
    if (options?.pollSeconds) {
      interval = setInterval(load, options.pollSeconds * 1000)
    }

    return () => {
      window.removeEventListener('focus', onFocus)
      if (interval) clearInterval(interval)
    }
  }, [load, options?.pollSeconds])
}
