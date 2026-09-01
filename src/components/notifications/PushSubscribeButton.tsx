'use client'
import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

type Stato = 'non_supportato' | 'da_attivare' | 'attivo' | 'negato' | 'in_corso'

export default function PushSubscribeButton() {
  const [stato, setStato] = useState<Stato>('da_attivare')
  const [errore, setErrore] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStato('non_supportato')
      return
    }
    if (Notification.permission === 'denied') { setStato('negato'); return }

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setStato('attivo') })
      .catch(() => {})
  }, [])

  const attiva = async () => {
    setErrore('')
    setStato('in_corso')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const permesso = await Notification.requestPermission()
      if (permesso !== 'granted') { setStato('negato'); return }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) throw new Error('Notifiche push non configurate')

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) throw new Error('Errore salvataggio subscription')

      setStato('attivo')
    } catch (err: any) {
      setErrore(err.message ?? 'Errore attivazione notifiche')
      setStato('da_attivare')
    }
  }

  if (stato === 'non_supportato') {
    return <p style={{ fontSize: 13, color: 'var(--gray)' }}>Il tuo browser non supporta le notifiche push.</p>
  }
  if (stato === 'negato') {
    return <p style={{ fontSize: 13, color: 'var(--accent-red)' }}>Notifiche bloccate dal browser. Abilitale dalle impostazioni del sito per riceverle.</p>
  }
  if (stato === 'attivo') {
    return <p style={{ fontSize: 13, color: 'var(--accent)' }}>✓ Notifiche push attive su questo dispositivo</p>
  }

  return (
    <div>
      <button className="btn btn-primary btn-sm" onClick={attiva} disabled={stato === 'in_corso'}>
        {stato === 'in_corso' ? 'Attivazione...' : 'Attiva notifiche su questo dispositivo'}
      </button>
      {errore && <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 6 }}>{errore}</p>}
    </div>
  )
}
